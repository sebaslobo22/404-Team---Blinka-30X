import type { ResultadoDecision } from '../engine/types';

/** Texto de la razon que el techo anade. Es lo que ve la persona en el chat. */
export const TEXTO_EN_VIVO = 'Entrada en vivo: siempre la revisa una persona';

/** Regla sintetica del techo (no existe en el motor; solo la anade el canal en vivo). */
export const REGLA_EN_VIVO = 'EN_VIVO';

/**
 * TECHO EN VIVO. Toda factura que llega por un canal en vivo (Telegram) termina como maximo en ESCALAR:
 * ni siquiera una factura perfecta, copia exacta de un proveedor registrado y dentro del acuerdo, se
 * paga sin que una persona la mire. Se aplica DESPUES del motor, como funcion pura, sin tocar el motor.
 * - FRENAR se mantiene FRENAR (el techo solo baja PAGAR, nunca sube nada).
 * - ESCALAR se mantiene tal cual.
 * - Cualquier otro valor (PAGAR, o algo inesperado) pasa a ESCALAR con la razon extra.
 */
export function aplicarTechoEnVivo(r: ResultadoDecision): ResultadoDecision {
  if (r.decision === 'FRENAR' || r.decision === 'ESCALAR') return r;
  return {
    ...r,
    decision: 'ESCALAR',
    razones: [...r.razones, { regla: REGLA_EN_VIVO, efecto: 'ESCALAR' }],
    hechos: { ...r.hechos, techo_en_vivo: true },
    explicacion: `${r.explicacion} ${TEXTO_EN_VIVO}.`.trim(),
  };
}
