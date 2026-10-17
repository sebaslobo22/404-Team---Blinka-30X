/** Aritmetica de dinero en enteros. Nunca flotantes para montos. */

export function esEnteroSeguro(n: unknown): n is number {
  return typeof n === 'number' && Number.isSafeInteger(n);
}

/**
 * Convierte centavos de una moneda a centavos de USD, redondeando hacia arriba
 * (conservador: un monto nunca se subestima frente a un limite).
 * Devuelve null si la moneda no tiene tasa o el calculo no es seguro.
 */
export function aUsdCentavos(
  centavos: number,
  moneda: string,
  tasasMilli: Record<string, number>,
): number | null {
  if (!esEnteroSeguro(centavos) || centavos < 0) return null;
  const tasa = Object.prototype.hasOwnProperty.call(tasasMilli, moneda) ? tasasMilli[moneda] : undefined;
  if (!esEnteroSeguro(tasa) || tasa <= 0) return null;
  const num = BigInt(centavos) * 1000n;
  const den = BigInt(tasa);
  const res = (num + den - 1n) / den;
  if (res > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return Number(res);
}

/** Formato para explicaciones: 5000.00 (sin separador de miles). */
export function formatoUsd(centavos: number): string {
  return (centavos / 100).toFixed(2);
}
