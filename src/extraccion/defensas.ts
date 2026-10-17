/** Defensas deterministas del lector que no dependen del modelo: tipo de documento y aritmetica. */
import { centavosATexto, montoACentavos, montoFirmadoACentavos } from './monto';

export const TIPOS_DOCUMENTO = ['factura', 'cuenta_de_cobro', 'nota_credito', 'proforma', 'cotizacion', 'recibo', 'estado_de_cuenta', 'otro'] as const;
export const TIPOS_COBRO: readonly string[] = ['factura', 'cuenta_de_cobro'];

/** Marcas en el texto fuente (se buscan en minusculas, sin acentos, con limites de palabra). */
const MARCAS: [RegExp, string][] = [
  [/\bnota de credito\b/, 'nota_credito'],
  [/\bcredit note\b/, 'nota_credito'],
  [/\bpro ?forma\b/, 'proforma'],
  [/\bcotizacion\b/, 'cotizacion'],
  [/\bquote\b/, 'cotizacion'],
  [/\brecibo de pago\b/, 'recibo'],
  [/\bpayment receipt\b/, 'recibo'],
  [/\bestado de cuenta\b/, 'estado_de_cuenta'],
];

const plano = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Tipos de no-cobro que delatan las marcas del texto. Vive en codigo: no depende del modelo. */
export function tiposPorMarcas(texto: string): string[] {
  const t = plano(texto);
  return [...new Set(MARCAS.filter(([re]) => re.test(t)).map(([, tipo]) => tipo))];
}

/** Alertas `no_es_cobro:<tipo>` por el tipo que dijo cada lectura y por las marcas del texto. */
export function alertasTipoDocumento(texto: string | undefined, tipos: (string | null | undefined)[]): string[] {
  const salida: string[] = [];
  for (const t of tipos) if (typeof t === 'string' && !TIPOS_COBRO.includes(t)) salida.push(`no_es_cobro:${t}`);
  if (texto !== undefined) for (const t of tiposPorMarcas(texto)) salida.push(`no_es_cobro:${t}`);
  return [...new Set(salida)];
}

export interface Desglose {
  monto: string | null;
  subtotal?: string | null;
  impuestos?: { nombre: string; monto: string }[] | null;
  descuento?: string | null;
  lineas?: { descripcion: string; monto: string }[] | null;
}

const absB = (x: bigint) => (x < 0n ? -x : x);
const suma = (xs: (bigint | null)[]): bigint | null => (xs.some((x) => x === null) ? null : (xs as bigint[]).reduce((s, x) => s + x, 0n));

/**
 * Chequeo aritmetico en centavos BigInt. Sin desglose no se evalua (sin alerta).
 * Tolerancia: 1 centavo por renglon sumado. Un importe ilegible dentro de un desglose dado es alerta (falla cerrada).
 */
export function alertasAritmetica(d: Desglose): string[] {
  const alertas: string[] = [];
  const t = montoACentavos(d.monto);
  if (t === null) return alertas; // el monto ya tiene su propia alerta
  const total = BigInt(t);
  const subtotal = d.subtotal != null ? montoFirmadoACentavos(d.subtotal) : undefined;

  if (Array.isArray(d.lineas) && d.lineas.length > 0) {
    const s = suma(d.lineas.map((l) => montoFirmadoACentavos(l.monto)));
    const objetivo = subtotal === undefined ? total : subtotal;
    const etiqueta = subtotal === undefined ? 'total' : 'subtotal';
    if (s === null || objetivo === null) alertas.push('aritmetica_no_cuadra:desglose_ilegible');
    else if (absB(s - objetivo) > BigInt(d.lineas.length)) alertas.push(`aritmetica_no_cuadra:lineas_${centavosATexto(s)}_vs_${etiqueta}_${centavosATexto(objetivo)}`);
  }

  if (d.subtotal != null && Array.isArray(d.impuestos)) {
    const imp = suma(d.impuestos.map((i) => montoFirmadoACentavos(i.monto)));
    const desc = d.descuento != null ? montoFirmadoACentavos(d.descuento) : 0n;
    if (subtotal === undefined || subtotal === null || imp === null || desc === null) alertas.push('aritmetica_no_cuadra:desglose_ilegible');
    else {
      const esperado = subtotal - absB(desc) + imp;
      const renglones = BigInt(1 + d.impuestos.length + (d.descuento != null ? 1 : 0));
      if (absB(esperado - total) > renglones) alertas.push(`aritmetica_no_cuadra:subtotal_menos_descuento_mas_impuestos_${centavosATexto(esperado)}_vs_total_${centavosATexto(total)}`);
    }
  }
  return alertas;
}
