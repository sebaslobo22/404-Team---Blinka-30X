// Dinero siempre en centavos enteros (BigInt). Nunca números con decimales.

const PATRON_MONTO = /^\d{1,15}(\.\d{1,2})?$/;

// "1200.50" -> 120050n. Cualquier otro formato -> null (el motor lo trata como dato ilegible).
// Solo texto: un número de JavaScript ya pudo perder centavos al redondear.
export function aCentavos(valor) {
  if (typeof valor !== 'string') return null;
  const texto = valor.trim();
  if (!PATRON_MONTO.test(texto)) return null;
  const [entero, decimales = ''] = texto.split('.');
  return BigInt(entero) * 100n + BigInt(decimales.padEnd(2, '0'));
}

// Convierte a centavos de USD redondeando HACIA ARRIBA: ante la duda, el monto se ve más grande
// y es más fácil que dispare un límite, nunca al revés.
export function aUsdCentavos(centavos, tasaPorUsdCentavos) {
  return (centavos * 100n + tasaPorUsdCentavos - 1n) / tasaPorUsdCentavos;
}

// 120050n, "USD" -> "USD 1.200,50"
export function formatear(centavos, moneda) {
  const negativo = centavos < 0n;
  const absoluto = negativo ? -centavos : centavos;
  const entero = (absoluto / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decimales = (absoluto % 100n).toString().padStart(2, '0');
  return `${moneda} ${negativo ? '-' : ''}${entero},${decimales}`;
}

// 120050n -> "1200.50" (formato de máquina, para el registro)
export function aTexto(centavos) {
  const negativo = centavos < 0n;
  const absoluto = negativo ? -centavos : centavos;
  return `${negativo ? '-' : ''}${absoluto / 100n}.${(absoluto % 100n).toString().padStart(2, '0')}`;
}
