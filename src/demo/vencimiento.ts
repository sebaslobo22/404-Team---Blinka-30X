import type { LecturaGrabada } from './lecturas';

/**
 * "Para cuando": fecha de vencimiento que leyeron los dos modelos. Funciones puras: no llaman a nada
 * y no inventan fechas. Hoy las 18 facturas ficticias no traen vencimiento (los modelos devuelven null),
 * asi que la pantalla dice "Sin fecha de vencimiento en el documento". Cuando se regraben las lecturas
 * con documentos que si la traigan, la fecha aparece sola.
 */

/** Una fecha AAAA-MM-DD, una marca de que los dos modelos discreparon, o null si no hay fecha valida. */
export type Vencimiento = string | 'difieren' | null;

export const VENCIMIENTO_DIFIEREN = 'difieren' as const;

/** Verdadero solo para una fecha real en formato AAAA-MM-DD (rechaza 2026-02-31, 2026-13-01, "manana"...). */
export function esFechaIso(x: unknown): x is string {
  if (typeof x !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(x)) return false;
  const [a, m, d] = x.split('-').map(Number) as [number, number, number];
  const t = new Date(Date.UTC(a, m - 1, d));
  return t.getUTCFullYear() === a && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

/**
 * Vencimiento de la factura segun las lecturas grabadas.
 * - Las dos lecturas traen la misma fecha valida: esa fecha.
 * - Traen fechas distintas, o solo una trae fecha valida: 'difieren' (ante la duda no se elige una).
 * - Ninguna trae una fecha valida (null, vacia o mal escrita), o no hay lectura: null.
 */
export function vencimientoDe(fila: { lectura: LecturaGrabada | null }): Vencimiento {
  const lecturas = fila.lectura?.resultado.lecturas ?? [];
  if (lecturas.length === 0) return null;
  const fechas = lecturas.map((l) => {
    const f: unknown = l.datos?.fecha_vencimiento;
    return esFechaIso(f) ? f : null;
  });
  if (fechas.every((f) => f === null)) return null;
  const primera = fechas[0] ?? null;
  return primera !== null && fechas.every((f) => f === primera) ? primera : VENCIMIENTO_DIFIEREN;
}

const DIA_MS = 86_400_000;
const diaUtc = (iso: string): number => {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number) as [number, number, number];
  return Date.UTC(a, m - 1, d);
};

/** Dias desde `ahora` (ISO con o sin hora) hasta la fecha: positivo si falta, negativo si ya paso, 0 si es hoy. */
export function diasPara(fecha: string, ahora: string): number {
  return Math.round((diaUtc(fecha) - diaUtc(ahora)) / DIA_MS);
}

const aDiaMes = (iso: string): string => iso.split('-').reverse().join('/');
const dias = (n: number): string => `${n} ${n === 1 ? 'día' : 'días'}`;

export type ClaseVencimiento = 'sin' | 'dudosa' | 'vencida' | 'hoy' | 'futura';

export interface TextoVencimiento {
  clase: ClaseVencimiento;
  /** Frase lista para mostrar. */
  texto: string;
  /** Fecha AAAA-MM-DD si hay una. */
  fecha: string | null;
  /** Dias respecto a la fecha de la demo (negativo si ya vencio); null si no hay fecha. */
  dias: number | null;
}

/** Frase de "Para cuando" respecto a la fecha de la demo (`ahora`, el reloj fijo del replay). */
export function describirVencimiento(v: Vencimiento, ahora: string): TextoVencimiento {
  if (v === null) return { clase: 'sin', texto: 'Sin fecha de vencimiento en el documento', fecha: null, dias: null };
  if (v === VENCIMIENTO_DIFIEREN) {
    return { clase: 'dudosa', texto: 'Los dos modelos leyeron fechas de vencimiento distintas. Revísala en el documento', fecha: null, dias: null };
  }
  const n = diasPara(v, ahora);
  const fecha = aDiaMes(v);
  if (n === 0) return { clase: 'hoy', texto: `Vence hoy, el ${fecha}`, fecha: v, dias: 0 };
  if (n > 0) return { clase: 'futura', texto: `Vence en ${dias(n)}, el ${fecha}`, fecha: v, dias: n };
  return { clase: 'vencida', texto: `Vencida hace ${dias(-n)}, el ${fecha}`, fecha: v, dias: n };
}
