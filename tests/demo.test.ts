import { readFileSync, readdirSync } from 'node:fs';
import { join, sep } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { confianzaDe, costoLecturasUsd, crearEstado, estadoAprobacion, instruccionPago, resolver, resumen } from '../src/demo/estado';
import type { EstadoDemo } from '../src/demo/estado';
import { camposQueDifieren, etiquetaFormato, fechaLectura, formatearConfianza, formatearCostoLectura, formatearMs, nombreModelo, nombreRegla } from '../src/demo/formato';
import { lecturaDe } from '../src/demo/lecturas';
import { parametrosPorDefecto, validarParametros } from '../src/demo/parametros';
import { construirTraza, fragmentosDetectados, partirTextoFuente, textoEstado } from '../src/demo/traza';

let estado: EstadoDemo;
beforeAll(async () => {
  estado = await crearEstado();
});
const fila = (e: EstadoDemo, id: string) => e.filas.find((f) => f.id === id)!;

describe('estado del modo replay', () => {
  it('18 facturas: 4 PAGAR, 4 FRENAR, 10 ESCALAR, 44,4% sin persona y 18 de 18 en el set de desarrollo', () => {
    const r = resumen(estado);
    expect(r).toMatchObject({ total: 18, PAGAR: 4, FRENAR: 4, ESCALAR: 10, pendientes: 10, pctSinPersona: 44.4, decididasBien: 18 });
  });
  it('cada fila coincide con la decision esperada del set', () => {
    for (const f of estado.filas) expect(f.resultado.decision, f.id).toBe(f.esperada);
  });
  it('el registro de decisiones y el de aprobaciones verifican, y las decisiones coinciden con el ancla', async () => {
    expect(await estado.registroDecisiones.verificar(estado.anclaInicial)).toMatchObject({ ok: true, n: 18 });
    expect(await estado.registroAprobaciones.verificar()).toMatchObject({ ok: true, n: 0 });
  });
  it('simular una manipulacion se detecta y restaurar la deshace', async () => {
    const e = await crearEstado();
    expect(e.almacenDecisiones.corromper(3)).toBe(true);
    expect(await e.registroDecisiones.verificar(e.anclaInicial)).toMatchObject({ ok: false, indice: 3, motivo: 'HASH_NO_COINCIDE' });
    expect(await (await crearEstado()).registroDecisiones.verificar()).toMatchObject({ ok: true });
    expect(e.almacenDecisiones.corromper(99)).toBe(false);
    // La ultima entrada (indice 17, F-018) tambien se puede alterar.
    expect((await crearEstado()).almacenDecisiones.corromper(17)).toBe(true);
  });
});

describe('defensas F-016 a F-018 en el producto', () => {
  const ids = ['F-016', 'F-017', 'F-018'];

  it('quedan al final del estado y todas son ESCALAR con su razon', () => {
    expect(estado.filas.map((f) => f.id).slice(-3)).toEqual(ids);
    // Con las lecturas reales, F-017 (imagen borrosa) trae ademas una alerta de la extraccion:
    // las dos lecturas difirieron en la fecha. Se muestra como EXTRACCION antes de CONFIANZA.
    const razones: Record<string, string[]> = { 'F-016': ['INYECCION'], 'F-017': ['EXTRACCION', 'CONFIANZA'], 'F-018': ['REGISTRO'] };
    for (const id of ids) {
      expect(fila(estado, id).resultado.decision, id).toBe('ESCALAR');
      expect(fila(estado, id).resultado.razones.map((r) => r.regla), id).toEqual(razones[id]);
    }
  });
  it('sin aprobacion no producen instruccion de pago', () => {
    for (const id of ids) {
      expect(estadoAprobacion(estado, fila(estado, id))).toBe('PENDIENTE');
      expect(instruccionPago(estado, fila(estado, id)), id).toBeNull();
    }
  });
  it('se pueden rechazar (sin instruccion) y aprobar (instruccion de origen PERSONA) con el flujo existente', async () => {
    const e = await crearEstado();
    for (const id of ids) {
      const rechazo = await resolver(e, id, 'RECHAZAR', 'revisor-demo');
      expect(rechazo, id).toMatchObject({ ok: true, instruccion: null });
      expect(estadoAprobacion(e, fila(e, id))).toBe('RECHAZADA');
    }
    expect(e.filas.filter((f) => ids.includes(f.id)).map((f) => instruccionPago(e, f))).toEqual([null, null, null]);
    const e2 = await crearEstado();
    for (const id of ids) {
      const r = await resolver(e2, id, 'APROBAR', 'revisor-demo');
      expect(r.ok, id).toBe(true);
      if (r.ok) expect(r.instruccion, id).toMatchObject({ factura_id: id, origen_aprobacion: 'PERSONA', aprobado_por: 'revisor-demo' });
      expect(estadoAprobacion(e2, fila(e2, id))).toBe('APROBADA');
    }
    expect(await e2.registroAprobaciones.verificar()).toMatchObject({ ok: true, n: 3 });
  });
  it('los nombres legibles de las razones nuevas existen', () => {
    expect(nombreRegla('INYECCION')).toMatch(/Instrucciones ocultas/);
    expect(nombreRegla('CONFIANZA')).toMatch(/Confianza/);
    expect(nombreRegla('REGISTRO')).toMatch(/registro/);
  });
});

describe('traza con INYECCION, CONFIANZA y REGISTRO', () => {
  const traza = (id: string) => {
    const f = fila(estado, id);
    return construirTraza(f.resultado, estado.config, f.factura);
  };
  const de = (id: string, codigo: string) => traza(id).find((t) => t.id === codigo)!;

  it('toda traza trae las tres comprobaciones nuevas', () => {
    for (const f of estado.filas) {
      const codigos = traza(f.id).map((t) => t.id);
      for (const c of ['INYECCION', 'CONFIANZA', 'REGISTRO']) expect(codigos, `${f.id} ${c}`).toContain(c);
    }
  });
  it('F-016: INYECCION no cumple, con los fragmentos detectados', () => {
    const t = de('F-016', 'INYECCION');
    expect(t.estado).toBe('ESCALAR');
    expect(textoEstado(t.estado)).toBe('No cumple (ESCALAR)');
    expect(t.cifra).toMatch(/fragmento/);
    expect(fragmentosDetectados(fila(estado, 'F-016').resultado.hechos).length).toBeGreaterThan(0);
    expect(de('F-016', 'CONFIANZA').cifra).toBe('Confianza de lectura 95 % frente al mínimo de 85 %');
    expect(de('F-016', 'REGISTRO').estado).toBe('CUMPLE');
  });
  it('F-017: CONFIANZA no cumple con la cifra frente al minimo', () => {
    const t = de('F-017', 'CONFIANZA');
    expect(t.estado).toBe('ESCALAR');
    expect(t.cifra).toBe('Confianza de lectura 50 % frente al mínimo de 85 %');
    expect(de('F-017', 'INYECCION').estado).toBe('CUMPLE');
  });
  it('F-018: REGISTRO no cumple con nombre_coincide', () => {
    const t = de('F-018', 'REGISTRO');
    expect(t.estado).toBe('ESCALAR');
    expect(t.cifra).toMatch(/nombre_coincide = no/);
    expect(t.cifra).toContain('Otra Empresa Distinta');
  });
  it('un caso limpio cumple INYECCION y REGISTRO; REGISTRO no aplica si R2 no encontro la cuenta', () => {
    expect(['INYECCION', 'CONFIANZA', 'REGISTRO'].map((c) => de('F-001', c).estado)).toEqual(['CUMPLE', 'CUMPLE', 'CUMPLE']);
    const sinCuenta = estado.filas.find((f) => f.resultado.razones.some((r) => r.regla === 'R2') && !f.resultado.razones.some((r) => r.regla === 'R7'))!;
    expect(construirTraza(sinCuenta.resultado, estado.config, sinCuenta.factura).find((t) => t.id === 'REGISTRO')?.estado).toBe('NO_APLICA');
  });
  it('si R7 corta, las demas reglas y REGISTRO van como No evaluada, pero INYECCION se sigue evaluando', () => {
    const t = traza('F-014');
    expect(t.find((x) => x.id === 'R1')?.estado).toBe('NO_EVALUADA');
    expect(t.find((x) => x.id === 'REGISTRO')?.estado).toBe('NO_EVALUADA');
    expect(t.find((x) => x.id === 'INYECCION')?.estado).toBe('CUMPLE');
  });
  it('FRENAR sigue sin aprobacion posible', async () => {
    expect(fila(estado, 'F-006').resultado.decision).toBe('FRENAR');
    expect(await resolver(await crearEstado(), 'F-006', 'APROBAR', 'x')).toMatchObject({ ok: false, codigo: 'NO_SE_PUEDE_APROBAR' });
  });
  it('el texto fuente de F-016 se parte y marca lo detectado', () => {
    const f = fila(estado, 'F-016');
    const trozos = partirTextoFuente(f.factura.texto_fuente as string, fragmentosDetectados(f.resultado.hechos));
    expect(trozos.map((x) => x.texto).join('')).toBe(f.factura.texto_fuente);
    expect(trozos.some((x) => x.marcado)).toBe(true);
  });
  it('partirTextoFuente tolera acentos y fragmentos que no aparecen', () => {
    expect(partirTextoFuente('Total: ¡aprobación! Nada más', ['aprobacion'])).toEqual([
      { texto: 'Total: ¡', marcado: false },
      { texto: 'aprobación', marcado: true },
      { texto: '! Nada más', marcado: false },
    ]);
    expect(partirTextoFuente('hola', ['marcada por el lector'])).toEqual([{ texto: 'hola', marcado: false }]);
    expect(partirTextoFuente('', [])).toEqual([{ texto: '', marcado: false }]);
  });
});

describe('aprobaciones: solo lo escalado se puede resolver', () => {
  it('una factura FRENAR no se puede aprobar ni rechazar, ni siquiera llamando directo al servidor', async () => {
    const e = await crearEstado();
    for (const id of ['F-006', 'F-007', 'F-010', 'F-015']) {
      expect(fila(e, id).resultado.decision).toBe('FRENAR');
      for (const accion of ['APROBAR', 'RECHAZAR']) {
        const r = await resolver(e, id, accion, 'revisor-demo');
        expect(r).toMatchObject({ ok: false, codigo: 'NO_SE_PUEDE_APROBAR' });
      }
      expect(instruccionPago(e, fila(e, id))).toBeNull();
    }
    expect(e.aprobaciones.size).toBe(0);
  });
  it('una factura PAGAR tampoco pasa por la cola', async () => {
    const e = await crearEstado();
    expect(await resolver(e, 'F-001', 'APROBAR', 'revisor-demo')).toMatchObject({ ok: false, codigo: 'NO_SE_PUEDE_APROBAR' });
  });
  it('entradas invalidas se rechazan sin efecto', async () => {
    const e = await crearEstado();
    expect(await resolver(e, 'F-999', 'APROBAR', 'x')).toMatchObject({ ok: false, codigo: 'NO_ENCONTRADA' });
    expect(await resolver(e, { toString: () => 'F-005' }, 'APROBAR', 'x')).toMatchObject({ ok: false, codigo: 'NO_ENCONTRADA' });
    expect(await resolver(e, 'F-005', 'PAGAR', 'x')).toMatchObject({ ok: false, codigo: 'ACCION_INVALIDA' });
    expect(await resolver(e, 'F-005', undefined, 'x')).toMatchObject({ ok: false, codigo: 'ACCION_INVALIDA' });
    expect(e.aprobaciones.size).toBe(0);
  });
  it('aprobar un ESCALAR emite la instruccion de pago con origen PERSONA y queda registrado', async () => {
    const e = await crearEstado();
    expect(estadoAprobacion(e, fila(e, 'F-005'))).toBe('PENDIENTE');
    expect(instruccionPago(e, fila(e, 'F-005'))).toBeNull();
    const r = await resolver(e, 'F-005', 'APROBAR', 'revisor-demo');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.instruccion).toMatchObject({ factura_id: 'F-005', origen_aprobacion: 'PERSONA', aprobado_por: 'revisor-demo', monto_centavos: 980000, moneda: 'USD' });
      expect(r.instruccion?.decision_hash).toBe(fila(e, 'F-005').entrada.hash);
    }
    expect(estadoAprobacion(e, fila(e, 'F-005'))).toBe('APROBADA');
    expect(await e.registroAprobaciones.verificar()).toMatchObject({ ok: true, n: 1 });
  });
  it('rechazar no emite instruccion y no se puede resolver dos veces', async () => {
    const e = await crearEstado();
    const r = await resolver(e, 'F-008', 'RECHAZAR', 'revisor-demo');
    expect(r).toMatchObject({ ok: true, instruccion: null });
    expect(estadoAprobacion(e, fila(e, 'F-008'))).toBe('RECHAZADA');
    expect(await resolver(e, 'F-008', 'APROBAR', 'revisor-demo')).toMatchObject({ ok: false, codigo: 'YA_RESUELTA' });
    expect(instruccionPago(e, fila(e, 'F-008'))).toBeNull();
  });
  it('dos clics simultaneos sobre la misma factura resuelven una sola vez', async () => {
    const e = await crearEstado();
    const rs = await Promise.all([resolver(e, 'F-009', 'APROBAR', 'revisor-demo'), resolver(e, 'F-009', 'RECHAZAR', 'revisor-demo')]);
    expect(rs.filter((r) => r.ok)).toHaveLength(1);
    expect(await e.registroAprobaciones.verificar()).toMatchObject({ ok: true, n: 1 });
  });
  it('las PAGAR emiten instruccion automatica y nada mas sale de FRENAR', async () => {
    const e = await crearEstado();
    const salidas = e.filas.map((f) => [f.resultado.decision, instruccionPago(e, f)] as const);
    for (const [d, i] of salidas) {
      if (d === 'PAGAR') expect(i?.origen_aprobacion).toBe('AUTOMATICA_REGLAS');
      else expect(i).toBeNull();
    }
  });
  it('una aprobacion no convierte en pagable una factura escalada por campo vacio', async () => {
    const e = await crearEstado();
    const r = await resolver(e, 'F-014', 'APROBAR', 'revisor-demo');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.instruccion).toBeNull();
  });
});

describe('lecturas reales en el producto', () => {
  it('las 18 filas traen su lectura con dos modelos de empresas distintas, confianza numerica y documento', () => {
    expect(estado.filas).toHaveLength(18);
    for (const f of estado.filas) {
      expect(f.lectura, f.id).not.toBeNull();
      expect(f.lectura!.modelos, f.id).toHaveLength(2);
      expect(new Set(f.lectura!.modelos.map((m) => m.split('/')[0])).size, f.id).toBe(2);
      expect(f.lectura!.resultado.lecturas.every((l) => l.ok), f.id).toBe(true);
      expect(typeof confianzaDe(f), f.id).toBe('number');
      expect(f.fuente, f.id).not.toBeNull();
    }
  });
  it('la factura que decide el motor es la de la lectura real, no la escrita a mano', () => {
    for (const f of estado.filas) expect(f.factura, f.id).toBe(f.lectura!.resultado.factura);
  });
  it('el resumen sigue en 4 PAGAR, 4 FRENAR y 10 ESCALAR con las lecturas reales', () => {
    expect(resumen(estado)).toMatchObject({ total: 18, PAGAR: 4, FRENAR: 4, ESCALAR: 10 });
    for (const f of estado.filas) expect(f.resultado.decision, f.id).toBe(f.esperada);
  });
  it('los cuatro formatos de documento aparecen en el set', () => {
    expect(new Set(estado.filas.map((f) => f.fuente?.formato))).toEqual(new Set(['pdf', 'imagen', 'correo', 'chat']));
  });
  it('el costo de leer las 18 sale de las lecturas y es pequeno', () => {
    const c = costoLecturasUsd(estado);
    expect(c).toBeGreaterThan(0);
    expect(c).toBeLessThan(0.5);
    expect(c).toBeCloseTo(estado.filas.reduce((s, f) => s + f.lectura!.resultado.lecturas.reduce((t, l) => t + (l.costo_usd ?? 0), 0), 0), 10);
  });
  it('falla cerrada: si falta la lectura de una factura, el estado la escala con lector_fallo', async () => {
    const e = await crearEstado(undefined, 0, {});
    expect(e.filas).toHaveLength(18);
    for (const f of e.filas) {
      expect(f.lectura, f.id).toBeNull();
      expect(f.resultado.decision, f.id).toBe('ESCALAR');
      expect(f.factura.alertas, f.id).toEqual(['lector_fallo:replay_sin_lectura']);
      expect(instruccionPago(e, f), f.id).toBeNull();
    }
    expect(resumen(e).PAGAR).toBe(0);
    expect(costoLecturasUsd(e)).toBe(0);
  });
  it('una lectura invalida o de otra factura se trata como faltante', () => {
    const buena = lecturaDe('F-001');
    expect(buena).not.toBeNull();
    expect(lecturaDe('F-001', { 'F-001': { ...buena, id: 'F-002' } })).toBeNull();
    expect(lecturaDe('F-001', { 'F-001': { id: 'F-001' } })).toBeNull();
    expect(lecturaDe('constructor', {})).toBeNull();
  });
  it('el producto no llama a ningun modelo, no usa claves ni lee archivos en tiempo de ejecucion', () => {
    // Solo se permite importar TIPOS del lector (import type se borra al compilar); su codigo usa fs y red.
    const prohibidos = [/OPENROUTER/i, /openrouter[.]ai/i, /api[_-]?key/i, /^import (?!type).*from ['"][^'"]*extraccion[/]/m, /from ['"](node:)?(fs|fs[/]promises|child_process)['"]/];
    const recorrer = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
        const ruta = join(dir, d.name);
        if (d.isDirectory()) return d.name === 'team' ? [] : recorrer(ruta);
        return /[.](ts|tsx)$/.test(d.name) ? [ruta] : [];
      });
    for (const dir of ['src/demo', 'app']) {
      for (const ruta of recorrer(dir)) {
        if (ruta.split(sep).join('/').includes('app/api/team')) continue;
        const txt = readFileSync(ruta, 'utf8');
        // /probar es la lectura EN VIVO (apagada salvo LECTURA_EN_VIVO=1 con clave; ver tests/vivo.test.ts): su aviso de
        // privacidad nombra a OpenRouter a proposito. Sigue sin importar el lector ni tocar claves.
        const enVivo = ruta.split(sep).join('/').includes('app/probar/');
        for (const p of prohibidos) if (!(enVivo && p.source === 'OPENROUTER')) expect(p.test(txt), `${ruta} coincide con ${p}`).toBe(false);
      }
    }
  });
  it('la interfaz se llama Pulso: ya no queda "Agente pagador" en app/ ni en src/demo', () => {
    const recorrer = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
        const ruta = join(dir, d.name);
        if (d.isDirectory()) return d.name === 'team' ? [] : recorrer(ruta);
        return /[.](ts|tsx|css)$/.test(d.name) ? [ruta] : [];
      });
    for (const dir of ['src/demo', 'app']) for (const ruta of recorrer(dir)) expect(/agente pagador/i.test(readFileSync(ruta, 'utf8')), ruta).toBe(false);
    expect(readFileSync('app/layout.tsx', 'utf8')).toMatch(/title: 'Pulso'/);
  });
});

describe('formato de la lectura', () => {
  it('formato del documento, confianza, costo, tiempo y fecha', () => {
    expect(etiquetaFormato('pdf')).toBe('PDF');
    expect(etiquetaFormato('imagen')).toBe('Imagen');
    expect(etiquetaFormato(undefined)).toBe('Sin dato');
    expect(formatearConfianza(0.95)).toBe('95 %');
    expect(formatearConfianza(null)).toBe('Sin dato');
    expect(formatearCostoLectura(0.02075)).toBe('USD 0,02075');
    expect(formatearMs(2162)).toBe('2.162 ms');
    expect(fechaLectura('2026-10-17T18:24:28.496Z')).toBe('17/10/2026');
    expect(fechaLectura('2026-10-18T02:00:00Z')).toBe('17/10/2026');
    expect(fechaLectura('basura')).toBe('Sin dato');
    expect(nombreModelo('anthropic/claude-haiku-5.5')).toBe('claude-haiku-5.5');
  });
  it('campos en los que las dos lecturas difirieron, sacados de las alertas', () => {
    expect(camposQueDifieren(['lecturas_difieren:fecha', 'imagen_confianza_baja', 'lecturas_difieren:monto'])).toEqual(['fecha', 'monto']);
    expect(camposQueDifieren(undefined)).toEqual([]);
    expect(camposQueDifieren(fila(estado, 'F-017').factura.alertas)).toEqual(['fecha']);
  });
});

describe('reglas editables', () => {
  it('los valores por defecto son validos', () => {
    expect(validarParametros(parametrosPorDefecto())).toMatchObject({ ok: true });
  });
  it.each([
    ['limite negativo', { limite_pago_usd: -1 }],
    ['limite cero', { limite_pago_usd: 0 }],
    ['limite no numerico', { limite_pago_usd: '5000' }],
    ['limite NaN', { limite_pago_usd: NaN }],
    ['limite infinito', { limite_pago_usd: Infinity }],
    ['limite decimal', { limite_pago_usd: 10.5 }],
    ['tolerancia enorme', { tolerancia_pct: 80 }],
    ['tolerancia con 3 decimales', { tolerancia_pct: 2.123 }],
    ['ventana negativa', { ventana_duplicado_dias: -5 }],
    ['presupuesto con texto', { presupuestos_usd: { Infraestructura: 'mucho' } }],
  ])('rechaza %s', (_n, parche) => {
    const base = parametrosPorDefecto();
    const entrada = { ...base, ...parche } as unknown;
    expect(validarParametros(entrada)).toMatchObject({ ok: false });
  });
  it('rechaza cuerpos que no son objetos', () => {
    for (const x of [null, undefined, 5, 'x', [], true]) expect(validarParametros(x)).toMatchObject({ ok: false });
  });
  it('editar el limite cambia las decisiones y crea una nueva version de reglas', async () => {
    const p = parametrosPorDefecto();
    p.limite_pago_usd = 1000;
    const v = validarParametros(p);
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    const e = await crearEstado(v.params, 1);
    expect(e.config.version).toMatch(/\+edicion\.1$/);
    expect(fila(e, 'F-001').resultado.razones.map((r) => r.regla)).toContain('R1');
    expect(fila(e, 'F-001').resultado.version_reglas).toBe(e.config.version);
    expect(resumen(e).PAGAR).toBeLessThan(4);
  });
  it('subir el limite nunca convierte un FRENAR en otra cosa', async () => {
    const p = parametrosPorDefecto();
    p.limite_pago_usd = 1_000_000;
    p.tope_mensual_usd = 10_000_000;
    const e = await crearEstado(p, 1);
    for (const id of ['F-006', 'F-007', 'F-015']) expect(fila(e, id).resultado.decision).toBe('FRENAR');
  });
});
