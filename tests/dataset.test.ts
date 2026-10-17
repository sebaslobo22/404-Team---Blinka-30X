import { describe, expect, it } from 'vitest';
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

/** Procesa F-001 a F-015 en orden; cada PAGAR entra al historial como PAGADA. */
function correrSet(): { caso: Caso; r: ResultadoDecision }[] {
  const ctx = structuredClone(dataset.contexto) as unknown as Contexto;
  const salida: { caso: Caso; r: ResultadoDecision }[] = [];
  for (const caso of dataset.facturas as unknown as Caso[]) {
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
