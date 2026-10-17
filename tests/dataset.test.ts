import { describe, expect, it } from 'vitest';
import defensas from '../data/dev-set-defensas.json';
import dataset from '../data/dev-set.json';
import { decidir } from '../src/engine/decide';
import { cifrasDeLaExplicacionEstanEnLosHechos } from '../src/engine/explain';
import type { Contexto, Decision, FacturaExtraida, ResultadoDecision } from '../src/engine/types';
import { cfg } from './fixtures';

interface Caso {
  id: string;
  trampa: string;
  esperada: Decision;
  reglas_esperadas: string[];
  factura: FacturaExtraida;
}

/** Procesa F-001 a F-015 (y, si se pide, F-016 a F-018) en orden; cada PAGAR entra al historial como PAGADA. */
function correrSet(extra: Caso[] = []): { caso: Caso; r: ResultadoDecision }[] {
  const ctx = structuredClone(dataset.contexto) as unknown as Contexto;
  const salida: { caso: Caso; r: ResultadoDecision }[] = [];
  for (const caso of [...(dataset.facturas as unknown as Caso[]), ...extra]) {
    const r = decidir(caso.id, caso.factura, ctx, cfg);
    salida.push({ caso, r });
    if (r.decision === 'PAGAR') {
      const f = caso.factura;
      ctx.historial.push({
        numero_factura: f.numero_factura as string,
        id_fiscal: f.id_fiscal as string,
        monto_centavos: f.monto_centavos as number,
        moneda: f.moneda as string,
        categoria: f.categoria as string,
        fecha: ctx.ahora.slice(0, 10),
        estado: 'PAGADA',
      });
    }
  }
  return salida;
}

describe('set de desarrollo F-001 a F-015', () => {
  const corrida = correrSet();

  it.each(corrida.map((x) => [x.caso.id, x.caso.trampa, x] as const))('%s (%s)', (_id, _t, { caso, r }) => {
    expect(r.decision).toBe(caso.esperada);
    expect([...new Set(r.razones.map((x) => x.regla))].sort()).toEqual([...caso.reglas_esperadas].sort());
    expect(cifrasDeLaExplicacionEstanEnLosHechos(r.explicacion, r.hechos), r.explicacion).toBe(true);
  });

  it('coincide con el resumen del Sheet: 4 PAGAR, 4 FRENAR, 7 ESCALAR; 8 de 15 sin persona', () => {
    const cuenta = { PAGAR: 0, FRENAR: 0, ESCALAR: 0 };
    for (const { r } of corrida) cuenta[r.decision]++;
    expect(cuenta).toEqual({ PAGAR: 4, FRENAR: 4, ESCALAR: 7 });
    expect(((cuenta.PAGAR + cuenta.FRENAR) / corrida.length) * 100).toBeCloseTo(53.3, 1);
  });

  it('ninguna factura marcada como trampa termina en PAGAR', () => {
    for (const { caso, r } of corrida) if (caso.trampa !== 'Caso limpio') expect(r.decision).not.toBe('PAGAR');
  });

  it('la corrida es repetible', () => {
    expect(correrSet().map((x) => x.r)).toEqual(corrida.map((x) => x.r));
  });
});

describe('casos de las defensas F-016 a F-018 (tras F-001 a F-015)', () => {
  const casos = defensas.facturas as unknown as Caso[];
  const todo = correrSet(casos);
  const nuevos = todo.slice(15);

  it('el set base no cambia: F-001 a F-015 dan lo mismo con y sin los casos nuevos', () => {
    expect(todo.slice(0, 15).map((x) => x.r)).toEqual(correrSet().map((x) => x.r));
  });

  it.each(nuevos.map((x) => [x.caso.id, x.caso.trampa, x] as const))('%s (%s)', (_id, _t, { caso, r }) => {
    expect(r.decision).toBe(caso.esperada);
    expect([...new Set(r.razones.map((x) => x.regla))].sort()).toEqual([...caso.reglas_esperadas].sort());
    expect(cifrasDeLaExplicacionEstanEnLosHechos(r.explicacion, r.hechos), r.explicacion).toBe(true);
  });

  it('sin el campo defensivo cada caso nuevo se pagaria: la defensa es la causa', () => {
    const ctx = structuredClone(dataset.contexto) as unknown as Contexto;
    for (const x of todo.slice(0, 15)) {
      if (x.r.decision === 'PAGAR') {
        const f = x.caso.factura;
        ctx.historial.push({ numero_factura: f.numero_factura as string, id_fiscal: f.id_fiscal as string, monto_centavos: f.monto_centavos as number, moneda: f.moneda as string, categoria: f.categoria as string, fecha: ctx.ahora.slice(0, 10), estado: 'PAGADA' });
      }
    }
    for (const caso of casos) {
      const { texto_fuente, confianza, ...resto } = caso.factura;
      void texto_fuente; void confianza;
      const limpia: FacturaExtraida = { ...resto, beneficiario: 'Taller Orinoco C.A.' };
      expect(decidir(caso.id, limpia, ctx, cfg).decision, caso.id).toBe('PAGAR');
    }
  });

  it('ninguno de los casos nuevos termina en PAGAR', () => {
    for (const { r } of nuevos) expect(r.decision).not.toBe('PAGAR');
  });

  it('con los 18: 4 PAGAR, 4 FRENAR, 10 ESCALAR', () => {
    const cuenta = { PAGAR: 0, FRENAR: 0, ESCALAR: 0 };
    for (const { r } of todo) cuenta[r.decision]++;
    expect(cuenta).toEqual({ PAGAR: 4, FRENAR: 4, ESCALAR: 10 });
  });
});
