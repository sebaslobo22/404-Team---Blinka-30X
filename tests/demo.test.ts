import { beforeAll, describe, expect, it } from 'vitest';
import { crearEstado, estadoAprobacion, instruccionPago, resolver, resumen } from '../src/demo/estado';
import type { EstadoDemo } from '../src/demo/estado';
import { parametrosPorDefecto, validarParametros } from '../src/demo/parametros';

let estado: EstadoDemo;
beforeAll(async () => {
  estado = await crearEstado();
});
const fila = (e: EstadoDemo, id: string) => e.filas.find((f) => f.id === id)!;

describe('estado del modo replay', () => {
  it('reproduce el resumen del Sheet: 4 PAGAR, 4 FRENAR, 7 ESCALAR, 53,3% sin persona', () => {
    const r = resumen(estado);
    expect(r).toMatchObject({ total: 15, PAGAR: 4, FRENAR: 4, ESCALAR: 7, pendientes: 7, pctSinPersona: 53.3 });
  });
  it('cada fila coincide con la decision esperada del set', () => {
    for (const f of estado.filas) expect(f.resultado.decision, f.id).toBe(f.esperada);
  });
  it('el registro de decisiones y el de aprobaciones verifican, y las decisiones coinciden con el ancla', async () => {
    expect(await estado.registroDecisiones.verificar(estado.anclaInicial)).toMatchObject({ ok: true, n: 15 });
    expect(await estado.registroAprobaciones.verificar()).toMatchObject({ ok: true, n: 0 });
  });
  it('simular una manipulacion se detecta y restaurar la deshace', async () => {
    const e = await crearEstado();
    expect(e.almacenDecisiones.corromper(3)).toBe(true);
    expect(await e.registroDecisiones.verificar(e.anclaInicial)).toMatchObject({ ok: false, indice: 3, motivo: 'HASH_NO_COINCIDE' });
    expect(await (await crearEstado()).registroDecisiones.verificar()).toMatchObject({ ok: true });
    expect(e.almacenDecisiones.corromper(99)).toBe(false);
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
