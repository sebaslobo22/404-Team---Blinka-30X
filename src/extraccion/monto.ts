/** Dinero y comparaciones literales de la extraccion. Sin flotantes: todo en enteros / BigInt. */

const RE_MONTO = /^\d{1,15}(\.\d{1,2})?$/;

/** "1200.50" -> 120050. Solo acepta ^\d{1,15}(\.\d{1,2})?$; cualquier otra cosa -> null. */
export function montoACentavos(texto: unknown): number | null {
  if (typeof texto !== 'string' || !RE_MONTO.test(texto)) return null;
  const [ent = '0', dec = ''] = texto.split('.');
  const centavos = BigInt(ent) * 100n + BigInt(dec.padEnd(2, '0'));
  if (centavos > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return Number(centavos);
}

const sinAcentos = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Mayusculas, sin acentos y solo A-Z0-9: quita espacios, guiones, puntos y separadores. */
export function normalizarLiteral(s: unknown): string {
  return sinAcentos(String(s ?? '')).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Montos (en centavos, como BigInt) que se pueden leer en el texto. Cada numero se interpreta con
 * la convencion que corresponda: "1.200,00", "1,200.00" y "1200.00" dan 120000. Un separador
 * seguido de 3 digitos es de miles ("4.800.000" -> 4800000.00).
 */
export function montosEnTexto(texto: string): Set<bigint> {
  const salida = new Set<bigint>();
  for (const m of texto.matchAll(/\d[\d.,]*\d|\d/g)) {
    const tok = m[0];
    const ult = Math.max(tok.lastIndexOf('.'), tok.lastIndexOf(','));
    let ent = tok;
    let dec = '';
    if (ult >= 0) {
      const cola = tok.slice(ult + 1);
      if (cola.length <= 2) {
        ent = tok.slice(0, ult);
        dec = cola;
      }
    }
    const entero = ent.replace(/[.,]/g, '');
    if (entero === '' || entero.length > 15) continue;
    salida.add(BigInt(entero) * 100n + BigInt(dec.padEnd(2, '0')));
  }
  return salida;
}

/** true si el monto ("1200.50") aparece en el texto en cualquier formato de miles/decimales. */
export function montoAparece(texto: string, monto: string): boolean {
  const c = montoACentavos(monto);
  return c !== null && montosEnTexto(texto).has(BigInt(c));
}

/** true si el valor, normalizado, aparece literal en el texto normalizado. Valor vacio -> false. */
export function apareceLiteral(texto: string, valor: unknown): boolean {
  const v = normalizarLiteral(valor);
  return v.length > 0 && normalizarLiteral(texto).includes(v);
}

/** AAAA-MM-DD valido en el calendario. */
export function fechaValida(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
