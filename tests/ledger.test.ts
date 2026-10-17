import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import dataset from '../data/dev-set.json';
import { decidir } from '../src/engine/decide';
import type { Contexto, FacturaExtraida, ResultadoDecision } from '../src/engine/types';
import { AlmacenEnMemoria, Registro, calcularHash, canonico, verificarCadena } from '../src/ledger';
import type { Almacen, EntradaRegistro } from '../src/ledger';
import { cfg } from './fixtures';

/** Las 15 decisiones reales del set de desarrollo. */
function resultadosDelSet(): ResultadoDecision[] {
  const ctx = structuredClone(dataset.contexto) as unknown as Contexto;
  return (dataset.facturas as unknown as { id: string; factura: FacturaExtraida }[]).map((c) => decidir(c.id, c.factura, ctx, cfg));
}

let reloj = 0;
const relojFijo = () => `2026-10-17T12:00:${String(reloj++ % 60).padStart(2, '0')}Z`;

async function registroLleno(n = 15) {
  const almacen = new AlmacenEnMemoria();
  const reg = new Registro(almacen, relojFijo);
  const res = resultadosDelSet();
  for (let i = 0; i < n; i++) await reg.anadir(res[i % res.length]!);
  return { almacen, reg, entradas: await almacen.leerTodo() };
}

/** Reescribe la cadena desde k con un cambio, recalculando todos los hashes (un atacante con acceso total). */
function reescribirDesde(entradas: EntradaRegistro[], k: number, cambio: (e: EntradaRegistro) => void): EntradaRegistro[] {
  const copia = structuredClone(entradas);
  let previo = k === 0 ? null : copia[k - 1]!.hash;
  for (let i = k; i < copia.length; i++) {
    const e = copia[i]!;
    if (i === k) cambio(e);
    e.hash_previo = previo;
    e.hash = calcularHash(e);
    previo = e.hash;
  }
  return copia;
}

describe('JSON canonico', () => {
  it('no depende del orden de las claves', () => {
    expect(canonico({ b: 1, a: { d: 2, c: [3, { z: 1, y: 2 }] } })).toBe(canonico({ a: { c: [3, { y: 2, z: 1 }], d: 2 }, b: 1 }));
  });
  it('distingue valores distintos', () => {
    expect(canonico({ a: 1 })).not.toBe(canonico({ a: '1' }));
    expect(canonico({ a: null })).not.toBe(canonico({}));
  });
  it('rechaza lo que no se puede representar de forma unica', () => {
    expect(() => canonico({ a: undefined })).toThrow();
    expect(() => canonico({ a: NaN })).toThrow();
    expect(() => canonico({ a: Infinity })).toThrow();
    expect(() => canonico({ a: () => 1 })).toThrow();
    const ciclo: Record<string, unknown> = {};
    ciclo['yo'] = ciclo;
    expect(() => canonico(ciclo)).toThrow();
  });
});

describe('encadenado', () => {
  it('numera desde 0, encadena los hashes y verifica', async () => {
    const { reg, entradas } = await registroLleno();
    expect(entradas.map((e) => e.indice)).toEqual(entradas.map((_, i) => i));
    expect(entradas[0]!.hash_previo).toBeNull();
    entradas.slice(1).forEach((e, i) => expect(e.hash_previo).toBe(entradas[i]!.hash));
    expect(await reg.verificar()).toEqual({ ok: true, n: 15, cabeza: entradas[14]!.hash });
  });
  it('un registro vacio verifica', async () => {
    expect(await new Registro(new AlmacenEnMemoria()).verificar()).toEqual({ ok: true, n: 0, cabeza: null });
  });
  it('guarda una copia: cambiar el objeto original despues no altera el registro', async () => {
    const almacen = new AlmacenEnMemoria();
    const reg = new Registro(almacen, relojFijo);
    const r = resultadosDelSet()[0]!;
    await reg.anadir(r);
    r.decision = 'FRENAR';
    expect(await reg.verificar()).toMatchObject({ ok: true });
    expect((await almacen.leerTodo())[0]!.resultado.decision).toBe('PAGAR');
  });
});

describe('deteccion de manipulacion', () => {
  it('cambiar una decision (PAGAR por FRENAR o al reves) se detecta en esa entrada', async () => {
    const { entradas } = await registroLleno();
    const m = structuredClone(entradas);
    m[5]!.resultado.decision = m[5]!.resultado.decision === 'PAGAR' ? 'FRENAR' : 'PAGAR';
    expect(verificarCadena(m)).toEqual({ ok: false, indice: 5, motivo: 'HASH_NO_COINCIDE' });
  });
  it('cambiar un monto dentro de los hechos se detecta', async () => {
    const { entradas } = await registroLleno();
    const m = structuredClone(entradas);
    m[2]!.resultado.hechos['monto_usd_centavos'] = 1;
    expect(verificarCadena(m)).toMatchObject({ ok: false, indice: 2, motivo: 'HASH_NO_COINCIDE' });
  });
  it('si ademas se recalcula el hash de esa entrada, se rompe el encadenado con la siguiente', async () => {
    const { entradas } = await registroLleno();
    const m = structuredClone(entradas);
    m[5]!.resultado.decision = m[5]!.resultado.decision === 'PAGAR' ? 'FRENAR' : 'PAGAR';
    m[5]!.hash = calcularHash(m[5]!);
    expect(verificarCadena(m)).toEqual({ ok: false, indice: 6, motivo: 'ENCADENADO_ROTO' });
  });
  it('borrar una entrada del medio se detecta', async () => {
    const { entradas } = await registroLleno();
    const m = structuredClone(entradas);
    m.splice(7, 1);
    expect(verificarCadena(m)).toEqual({ ok: false, indice: 7, motivo: 'INDICE_INVALIDO' });
  });
  it('borrar la primera entrada se detecta', async () => {
    const { entradas } = await registroLleno();
    expect(verificarCadena(structuredClone(entradas).slice(1))).toMatchObject({ ok: false, indice: 0 });
  });
  it('reordenar dos entradas se detecta', async () => {
    const { entradas } = await registroLleno();
    const m = structuredClone(entradas);
    [m[3], m[4]] = [m[4]!, m[3]!];
    expect(verificarCadena(m).ok).toBe(false);
  });
  it('insertar una entrada falsa se detecta', async () => {
    const { entradas } = await registroLleno();
    const m = structuredClone(entradas);
    const falsa = structuredClone(m[4]!);
    falsa.resultado.decision = falsa.resultado.decision === 'PAGAR' ? 'FRENAR' : 'PAGAR';
    m.splice(5, 0, falsa);
    expect(verificarCadena(m).ok).toBe(false);
  });
  it('entradas con forma invalida no revientan: se reportan', async () => {
    const { entradas } = await registroLleno(3);
    const m = structuredClone(entradas) as unknown as Record<string, unknown>[];
    m[1] = null as never;
    expect(verificarCadena(m as never)).toEqual({ ok: false, indice: 1, motivo: 'FORMATO' });
    expect(verificarCadena('x' as never)).toMatchObject({ ok: false });
  });
});

describe('lo que el hash solo no detecta, el ancla si', () => {
  it('truncar el final no se ve sin ancla, y con ancla si', async () => {
    const { reg, entradas } = await registroLleno();
    const ancla = await reg.ancla();
    const recortada = structuredClone(entradas).slice(0, 10);
    expect(verificarCadena(recortada).ok).toBe(true);
    expect(verificarCadena(recortada, ancla)).toMatchObject({ ok: false, motivo: 'ANCLA_NO_COINCIDE' });
  });
  it('reescribir toda la cadena desde un punto, con hashes recalculados, solo se ve con ancla', async () => {
    const { reg, entradas } = await registroLleno();
    const ancla = await reg.ancla();
    const falsa = reescribirDesde(entradas, 4, (e) => {
      e.resultado.decision = e.resultado.decision === 'PAGAR' ? 'FRENAR' : 'PAGAR';
    });
    expect(verificarCadena(falsa).ok).toBe(true);
    expect(verificarCadena(falsa, ancla)).toMatchObject({ ok: false, motivo: 'ANCLA_NO_COINCIDE' });
  });
  it('agregar entradas despues del ancla tambien se nota', async () => {
    const { reg } = await registroLleno(5);
    const ancla = await reg.ancla();
    await reg.anadir(resultadosDelSet()[0]!);
    expect(await reg.verificar(ancla)).toMatchObject({ ok: false, motivo: 'ANCLA_NO_COINCIDE' });
    expect(await reg.verificar()).toMatchObject({ ok: true, n: 6 });
  });
});

describe('escrituras', () => {
  it('50 escrituras simultaneas quedan en cadena, sin saltos ni choques', async () => {
    class Lento extends AlmacenEnMemoria {
      override async leerTodo() {
        await new Promise((r) => setTimeout(r, Math.random() * 5));
        return super.leerTodo();
      }
      override async anadir(e: EntradaRegistro) {
        await new Promise((r) => setTimeout(r, Math.random() * 5));
        return super.anadir(e);
      }
    }
    const almacen = new Lento();
    const reg = new Registro(almacen, relojFijo);
    const res = resultadosDelSet();
    await Promise.all(Array.from({ length: 50 }, (_, i) => reg.anadir(res[i % res.length]!)));
    expect(await reg.verificar()).toMatchObject({ ok: true, n: 50 });
    expect((await almacen.leerTodo()).map((e) => e.indice)).toEqual(Array.from({ length: 50 }, (_, i) => i));
  });

  it('si el almacen no puede escribir, rechaza y no queda entrada', async () => {
    let falla = true;
    class Roto extends AlmacenEnMemoria {
      override async anadir(e: EntradaRegistro) {
        if (falla) throw new Error('disco lleno');
        return super.anadir(e);
      }
    }
    const almacen = new Roto();
    const reg = new Registro(almacen, relojFijo);
    await expect(reg.anadir(resultadosDelSet()[0]!)).rejects.toThrow('disco lleno');
    expect(await almacen.leerTodo()).toEqual([]);
    falla = false;
    await reg.anadir(resultadosDelSet()[1]!);
    expect(await reg.verificar()).toMatchObject({ ok: true, n: 1 });
  });

  it('una escritura fallida no bloquea a las siguientes en cola', async () => {
    let n = 0;
    class Intermitente extends AlmacenEnMemoria {
      override async anadir(e: EntradaRegistro) {
        if (n++ === 1) throw new Error('falla puntual');
        return super.anadir(e);
      }
    }
    const reg = new Registro(new Intermitente(), relojFijo);
    const r = resultadosDelSet();
    const resultados = await Promise.allSettled([reg.anadir(r[0]!), reg.anadir(r[1]!), reg.anadir(r[2]!)]);
    expect(resultados.map((x) => x.status)).toEqual(['fulfilled', 'rejected', 'fulfilled']);
    expect(await reg.verificar()).toMatchObject({ ok: true, n: 2 });
  });

  it('se niega a anadir sobre un registro que ya no verifica', async () => {
    const { almacen, reg } = await registroLleno(4);
    const estado = (almacen as unknown as { entradas: EntradaRegistro[] }).entradas;
    estado[2]!.resultado.hechos['manipulado'] = 1;
    await expect(reg.anadir(resultadosDelSet()[0]!)).rejects.toThrow(/no verifica/);
  });

  it('un resultado que no se puede serializar no entra al registro', async () => {
    const almacen = new AlmacenEnMemoria();
    const reg = new Registro(almacen, relojFijo);
    const malo = { ...resultadosDelSet()[0]!, hechos: { x: NaN } };
    await expect(reg.anadir(malo)).rejects.toThrow();
    expect(await almacen.leerTodo()).toEqual([]);
  });
});

describe('propiedades', () => {
  const arbN = fc.integer({ min: 1, max: 30 });

  it('cualquier cambio de un campo de cualquier entrada rompe la verificacion', async () => {
    const res = resultadosDelSet();
    await fc.assert(
      fc.asyncProperty(arbN, fc.nat(), fc.constantFrom('decision', 'monto', 'hash', 'hash_previo', 'indice', 'registrado_en', 'factura_id', 'razon'), async (n, pos, campo) => {
        const almacen = new AlmacenEnMemoria();
        const reg = new Registro(almacen, relojFijo);
        for (let i = 0; i < n; i++) await reg.anadir(res[i % res.length]!);
        const m = await almacen.leerTodo();
        const e = m[pos % n]!;
        if (campo === 'decision') e.resultado.decision = e.resultado.decision === 'PAGAR' ? 'ESCALAR' : 'PAGAR';
        if (campo === 'monto') e.resultado.hechos['monto_usd_centavos'] = ((e.resultado.hechos['monto_usd_centavos'] as number | undefined) ?? 0) + 1;
        if (campo === 'hash') e.hash = e.hash.replace(/./, (c) => (c === 'a' ? 'b' : 'a'));
        if (campo === 'hash_previo') e.hash_previo = e.hash_previo === null ? 'a'.repeat(64) : null;
        if (campo === 'indice') e.indice += 1;
        if (campo === 'registrado_en') e.registrado_en += 'x';
        if (campo === 'factura_id') e.resultado.factura_id += 'x';
        if (campo === 'razon') e.resultado.razones.push({ regla: 'R1', efecto: 'ESCALAR' });
        expect(verificarCadena(m).ok).toBe(false);
      }),
      { numRuns: 300 },
    );
  });

  it('quitar cualquier entrada que no sea la ultima rompe la verificacion; la ultima solo la delata el ancla', async () => {
    const res = resultadosDelSet();
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 2, max: 25 }), fc.nat(), async (n, pos) => {
        const almacen = new AlmacenEnMemoria();
        const reg = new Registro(almacen, relojFijo);
        for (let i = 0; i < n; i++) await reg.anadir(res[i % res.length]!);
        const ancla = await reg.ancla();
        const m = await almacen.leerTodo();
        const k = pos % n;
        m.splice(k, 1);
        if (k < n - 1) expect(verificarCadena(m).ok).toBe(false);
        expect(verificarCadena(m, ancla).ok).toBe(false);
      }),
      { numRuns: 300 },
    );
  });

  it('sin manipulacion, la verificacion siempre pasa y el hash cambia con cada entrada', async () => {
    const res = resultadosDelSet();
    await fc.assert(
      fc.asyncProperty(arbN, async (n) => {
        const reg = new Registro(new AlmacenEnMemoria(), relojFijo);
        const hashes = new Set<string>();
        for (let i = 0; i < n; i++) hashes.add((await reg.anadir(res[i % res.length]!)).hash);
        expect(hashes.size).toBe(n);
        expect(await reg.verificar()).toMatchObject({ ok: true, n });
      }),
      { numRuns: 100 },
    );
  });
});

describe('aislamiento de copias', () => {
  it('aunque el almacen no copie, el registro guarda su propia copia del resultado', async () => {
    class SinCopia implements Almacen {
      entradas: EntradaRegistro[] = [];
      async leerTodo() {
        return this.entradas;
      }
      async anadir(e: EntradaRegistro) {
        this.entradas.push(e);
      }
    }
    const almacen = new SinCopia();
    const reg = new Registro(almacen, relojFijo);
    const r = resultadosDelSet()[0]!;
    await reg.anadir(r);
    r.decision = 'FRENAR';
    expect(await reg.verificar()).toMatchObject({ ok: true });
  });
});

describe('contrato del almacen', () => {
  it('Registro solo usa leerTodo y anadir: no hay forma de editar o borrar', () => {
    const metodos = Object.getOwnPropertyNames(AlmacenEnMemoria.prototype).filter((m) => m !== 'constructor');
    expect(metodos.sort()).toEqual(['anadir', 'leerTodo']);
    const ejemplo: Almacen = new AlmacenEnMemoria();
    expect(Object.keys(ejemplo)).toEqual(expect.any(Array));
  });
});
