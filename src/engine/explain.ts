import { formatoUsd } from './money';
import type { Decision, Hecho, Razon } from './types';

type Hechos = Record<string, Hecho>;

function usd(h: Hechos, clave: string): string {
  const v = h[clave];
  return typeof v === 'number' ? formatoUsd(v) : '?';
}
function num(h: Hechos, clave: string): string {
  const v = h[clave];
  return typeof v === 'number' ? String(v) : '?';
}

const PLANTILLAS: Record<string, (h: Hechos) => string> = {
  R1: (h) => `El monto de ${usd(h, 'monto_usd_centavos')} USD supera el limite por pago de ${usd(h, 'limite_pago_usd_centavos')} USD.`,
  R2: () => 'El beneficiario o la cuenta no estan en la lista permitida (coincidencia exacta de ID fiscal y cuenta).',
  R3: (h) => `El acumulado del mes con este pago seria ${usd(h, 'acumulado_mes_con_pago_usd_centavos')} USD y el tope mensual es ${usd(h, 'tope_mensual_usd_centavos')} USD.`,
  R4: (h) =>
    h['presupuesto_configurado'] === false
      ? 'La categoria no tiene presupuesto configurado.'
      : `El gasto de la categoria con este pago seria ${usd(h, 'gasto_categoria_con_pago_usd_centavos')} USD y el presupuesto es ${usd(h, 'presupuesto_categoria_usd_centavos')} USD.`,
  R5: (h) => `Parece duplicada: ya hay un pago o reserva del mismo beneficiario con el mismo numero de factura, o con igual monto dentro de ${num(h, 'ventana_duplicado_dias')} dias.`,
  R6: (h) =>
    h['acuerdo_encontrado'] === false
      ? 'No hay un acuerdo registrado que coincida con este beneficiario y esta moneda.'
      : `El monto difiere del acuerdo en mas de ${num(h, 'tolerancia_pct')} por ciento.`,
  R7: (h) => `Hay ${num(h, 'campos_invalidos_n')} campos criticos de la factura faltantes o invalidos.`,
  R8: (h) => `La cuenta se registro hace ${num(h, 'dias_desde_cambio_cuenta')} dias y la ventana de cambio reciente es de ${num(h, 'ventana_cuenta_dias')} dias.`,
  ESQUEMA: () => 'No se pudo evaluar la factura; se escala por seguridad.',
};

/** Explicacion por plantillas. Solo usa cifras que el motor calculo (hechos). */
export function explicar(decision: Decision, razones: Razon[], hechos: Hechos): string {
  if (decision === 'PAGAR') {
    return `PAGAR: cumple todas las reglas. Monto ${usd(hechos, 'monto_usd_centavos')} USD.`;
  }
  const partes = razones.map((r) => (PLANTILLAS[r.regla] ?? (() => 'Regla no reconocida.'))(hechos));
  return `${decision}: ${partes.join(' ')}`;
}

/** Verifica que cada cifra de la explicacion salga de los hechos del motor. */
export function cifrasDeLaExplicacionEstanEnLosHechos(texto: string, hechos: Hechos): boolean {
  const permitidas = new Set<string>();
  for (const v of Object.values(hechos)) {
    if (typeof v === 'number') {
      permitidas.add(String(Math.abs(v)));
      permitidas.add((Math.abs(v) / 100).toFixed(2));
    }
  }
  const sinReglas = texto.replace(/\bR[1-8]\b/g, '');
  const cifras = sinReglas.match(/\d+(?:\.\d+)?/g) ?? [];
  return cifras.every((c) => permitidas.has(c));
}
