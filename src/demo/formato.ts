import reglas from '../../docs/reglas-R1-R8.json';
import type { Decision } from '../engine/types';
import type { EstadoAprobacion } from './estado';

/** Funciones puras de presentación. No calculan nada del negocio: solo dan formato. */

export const SIN_DATO = 'Sin dato';

/** Entero con separador de miles estilo es (punto). Trabaja con enteros, sin flotantes. */
function conMiles(entero: string): string {
  return entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Centavos a texto: 1234567 -> "12.345,67". Devuelve SIN_DATO si no es un entero seguro. */
export function formatearNumeroCentavos(centavos: number | null | undefined): string {
  if (typeof centavos !== 'number' || !Number.isSafeInteger(centavos)) return SIN_DATO;
  const negativo = centavos < 0;
  const abs = Math.abs(centavos);
  const enteros = Math.trunc(abs / 100);
  const dec = String(abs % 100).padStart(2, '0');
  return `${negativo ? '-' : ''}${conMiles(String(enteros))},${dec}`;
}

/** Centavos con su código de moneda: "12.345,67 COP". Si falta el monto o la moneda: "Sin dato". */
export function formatearCentavos(centavos: number | null | undefined, moneda: string | null | undefined): string {
  if (typeof moneda !== 'string' || moneda.trim() === '') return SIN_DATO;
  const n = formatearNumeroCentavos(centavos);
  return n === SIN_DATO ? SIN_DATO : `${n} ${moneda}`;
}

/** Centavos de USD, o "Sin dato" si el valor no es numérico. */
export function formatearUsd(centavos: unknown): string {
  return typeof centavos === 'number' ? formatearCentavos(centavos, 'USD') : SIN_DATO;
}

/** Primeros 12 caracteres de un hash, para mostrarlo en pantalla. */
export function abreviarHash(hash: string | null | undefined): string {
  if (!hash) return SIN_DATO;
  return hash.length > 12 ? `${hash.slice(0, 12)}…` : hash;
}

export function etiquetaDecision(d: Decision): string {
  return d;
}

export function clasePill(d: Decision): string {
  return d === 'PAGAR' ? 'pill pill-pagar' : d === 'FRENAR' ? 'pill pill-frenar' : 'pill pill-escalar';
}

export function etiquetaAprobacion(e: EstadoAprobacion): string {
  switch (e) {
    case 'NO_APLICA':
      return 'No aplica';
    case 'PENDIENTE':
      return 'Pendiente de aprobación';
    case 'APROBADA':
      return 'Aprobada por una persona';
    case 'RECHAZADA':
      return 'Rechazada por una persona';
  }
}

export function clasePillAprobacion(e: EstadoAprobacion): string {
  switch (e) {
    case 'APROBADA':
      return 'pill pill-pagar';
    case 'RECHAZADA':
      return 'pill pill-frenar';
    case 'PENDIENTE':
      return 'pill pill-escalar';
    case 'NO_APLICA':
      return 'pill pill-neutra';
  }
}

/** Nombres de las reglas con acentos para la interfaz. Si aparece una regla nueva, cae al nombre del JSON. */
const NOMBRES: Record<string, string> = {
  R1: 'Límite por pago',
  R2: 'Beneficiario permitido',
  R3: 'Tope mensual por beneficiario',
  R4: 'Presupuesto por categoría',
  R5: 'Factura duplicada',
  R6: 'Cotejo con lo acordado',
  R7: 'Moneda permitida y campos críticos completos',
  R8: 'Cuenta bancaria cambiada recientemente',
  EXTRACCION: 'Alertas de la extracción',
  ESQUEMA: 'Error interno al evaluar',
};

export const IDS_REGLAS: string[] = reglas.reglas.map((r) => r.id);

export function nombreRegla(id: string): string {
  return NOMBRES[id] ?? reglas.reglas.find((r) => r.id === id)?.nombre ?? id;
}
