import reglas from '../docs/reglas-R1-R8.json';
import { cargarConfig } from '../src/engine/config';
import type { Contexto, FacturaExtraida, Config } from '../src/engine/types';

export const cfg: Config = cargarConfig(reglas);

/** Datos 100% ficticios. */
export function contextoBase(): Contexto {
  return {
    ahora: '2026-10-17T12:00:00Z',
    beneficiarios: [
      { id_fiscal: 'J-1001', nombre: 'Nube Andina SAS', cuentas: [{ cuenta: 'ACC-001', desde: '2026-01-10' }] },
      { id_fiscal: 'J-1002', nombre: 'Papeleria Sol SRL', cuentas: [{ cuenta: 'ACC-002', desde: '2026-02-01' }] },
      { id_fiscal: 'J-1003', nombre: 'Servicios Cobre SA', cuentas: [{ cuenta: 'ACC-003', desde: '2026-03-01' }] },
    ],
    acuerdos: [
      { id_fiscal: 'J-1001', moneda: 'USD', monto_centavos: 100_000, categoria: 'software' },
      { id_fiscal: 'J-1001', moneda: 'COP', monto_centavos: 400_000_000, categoria: 'software' },
      { id_fiscal: 'J-1002', moneda: 'USD', monto_centavos: 20_000, categoria: 'oficina' },
      { id_fiscal: 'J-1003', moneda: 'USD', monto_centavos: 30_000, categoria: 'servicios' },
    ],
    presupuestos: { software: 1_000_000, oficina: 500_000, servicios: 800_000 },
    historial: [],
  };
}

export function facturaBuena(): FacturaExtraida {
  return {
    numero_factura: 'F-100',
    beneficiario: 'Nube Andina SAS',
    id_fiscal: 'J-1001',
    cuenta: 'ACC-001',
    monto_centavos: 100_000,
    moneda: 'USD',
    fecha_emision: '2026-10-15',
    categoria: 'software',
  };
}
