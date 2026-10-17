import type { FilaDemo } from '../../src/demo/estado';
import type { FilaTraza } from '../../src/demo/traza';
export const estados = {
  PAGAR: { etiqueta: 'Pagada', clase: 'pagar' },
  FRENAR: { etiqueta: 'Frenada', clase: 'frenar' },
  ESCALAR: { etiqueta: 'Te necesita', clase: 'escalar' },
} as const;
export type DecisionUI = keyof typeof estados;
export function dinero(centavos: unknown, moneda: unknown = 'USD') {
  if (typeof centavos !== 'number' || typeof moneda !== 'string') return 'Monto sin leer';
  return `${moneda} ${(centavos / 100).toLocaleString('es-CO', { maximumFractionDigits: 2 })}`;
}
export const nombres: Record<string, string> = {
  R1: 'Límite por pago', R2: 'Proveedor autorizado', R3: 'Tope del mes', R4: 'Dinero para este tipo de gasto',
  R5: 'Cobro repetido', R6: 'Monto acordado', R7: 'Datos completos', R8: 'Cuenta cambiada hace poco',
  INYECCION: 'La factura intenta dar órdenes', CONFIANZA: 'Lectura clara', REGISTRO: 'Nombre del proveedor',
  EXTRACCION: 'Datos leídos', ESQUEMA: 'Datos válidos',
};
export function motivo(fila: FilaDemo): string {
  const r = fila.resultado;
  if (r.decision === 'PAGAR') return 'Cumple todas tus reglas.';
  const regla = r.razones.find(x => x.efecto === r.decision)?.regla ?? r.razones[0]?.regla;
  const h = r.hechos;
  switch (regla) {
    case 'R1': return `El monto supera tu límite de ${dinero(h.limite_pago_usd_centavos)} por pago.`;
    case 'R2': return 'El proveedor o su cuenta no está en tu lista.';
    case 'R3': return 'Este pago supera el tope del mes para este proveedor.';
    case 'R4': return h.presupuesto_configurado === false ? 'No hay un tope de gasto definido para este cobro.' : 'No hay fondos suficientes para este tipo de gasto.';
    case 'R5': return 'Este cobro ya figura entre tus pagos.';
    case 'R6': return h.acuerdo_encontrado === false ? 'No encontramos un monto acordado para este cobro.' : 'El monto no cuadra con lo acordado.';
    case 'R7': return 'Faltan datos o no se pudieron leer bien.';
    case 'R8': return 'La cuenta se registró hace poco.';
    case 'INYECCION': return 'La factura intenta dar órdenes al agente.';
    case 'CONFIANZA': return 'No se leyó con claridad.';
    case 'REGISTRO': return 'El nombre no coincide con el proveedor de tu lista.';
    default: return 'Hay datos que debes revisar antes de seguir.';
  }
}
export function frase(fila: FilaDemo): string {
  const monto = dinero(fila.factura.monto_centavos, fila.factura.moneda);
  const proveedor = fila.factura.beneficiario ?? 'proveedor sin leer';
  return fila.resultado.decision === 'PAGAR'
    ? `Autorizamos ${monto} para ${proveedor}. ${motivo(fila)}`
    : `${fila.resultado.decision === 'FRENAR' ? 'Frenamos este cobro.' : 'Necesitamos tu aprobación.'} ${motivo(fila)}`;
}
// Solo traduce el texto de la traza existente; no evalúa reglas.
export function detalleRazon(t: FilaTraza): string {
  if (t.estado === 'NO_EVALUADA') return 'No se pudo revisar con los datos disponibles.';
  if (t.estado === 'NO_APLICA') return 'Esta revisión no corresponde a esta factura.';
  return t.cifra.replace(/ID fiscal/g, 'número fiscal').replace(/beneficiario/gi, 'proveedor')
    .replace(/Ventana de duplicados:/g, 'Busca cobros iguales durante')
    .replace(/Tolerancia/g, 'Margen permitido').replace(/Campos críticos/g, 'Datos necesarios')
    .replace(/extracción/g, 'lectura').replace(/se escala/g, 'te pide ayuda');
}
