/** Normalizaciones y deteccion de instrucciones ocultas. Portado de referencia/motor-js/motor.js. */

/** Mayusculas y solo A-Z0-9: "F-100" y "f100" son lo mismo. */
export const normalizarId = (s: unknown): string => String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');

const sinAcentos = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

export const normalizarNombre = (s: unknown): string =>
  sinAcentos(String(s ?? '')).toLowerCase().replace(/[^a-z0-9]/g, '');

/** Coincide si uno contiene al otro y el nombre leido tiene al menos 4 caracteres normalizados. */
export function nombreCoincide(leido: unknown, registrado: unknown): boolean {
  const a = normalizarNombre(leido);
  const b = normalizarNombre(registrado);
  return a.length >= 4 && b.length > 0 && (a.includes(b) || b.includes(a));
}

// Frases que una factura legitima no necesita. Un falso positivo cuesta una revision humana;
// un falso negativo podria costar un pago indebido. Sin bandera "g": no hay estado entre llamadas.
const PATRONES_INSTRUCCION: RegExp[] = [
  /\b(ignor[ae]|ignore|olvida|forget|disregard)\b.{0,40}\b(instrucciones|reglas|instructions|rules|previous|anteriores)\b/i,
  /\b(aprueb\w*|aprob\w*|approv\w*|autoriz\w*|authoriz\w*)\s.{0,25}\b(este|esta|this|inmediatamente|immediately|sin\s+revis|without)/i,
  /\b(agente|asistente|modelo|assistant|llm|ia|ai)\s*[:,]/i,
  /\[(system|sistema)\]|^\s*(system|sistema)\s*:/im,
  /\bno\s+(escal[ae]s?|frenes?|revises?)\b/i,
];

/** Fragmentos (maximo 60 caracteres cada uno) del texto que parecen ordenes al agente. */
export function buscarInstrucciones(fuente: unknown): string[] {
  if (typeof fuente !== 'string') return [];
  const plano = sinAcentos(fuente);
  const hallazgos: string[] = [];
  for (const patron of PATRONES_INSTRUCCION) {
    const m = plano.match(patron);
    if (m) hallazgos.push(m[0].trim().slice(0, 60));
  }
  return hallazgos;
}
