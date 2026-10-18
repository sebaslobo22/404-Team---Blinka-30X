import { camposLeidos, dinero, motivo } from '../../app/ui/lenguaje';
import type { FilaDemo } from '../demo/estado';
import type { Decision, Razon, ResultadoDecision } from '../engine/types';
import type { ResumenFactura } from './almacen';
import { MAX_BYTES } from './archivo';
import { REGLA_EN_VIVO, TEXTO_EN_VIVO } from './techo';

/** Datos que vienen de una factura son texto ajeno: se acortan y se limpian (el envio es texto plano, sin formato). */
export function limpio(s: unknown, max = 80): string {
  // eslint-disable-next-line no-control-regex
  return String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

export const INTRO = [
  'Hola, soy Pulso. Leo facturas y decido si PAGAR, FRENAR o ESCALAR a una persona, siguiendo las reglas de una empresa.',
  '',
  'Esto es una prueba:',
  '- La empresa es ficticia (Aurora Cloud) y todos los datos son de prueba.',
  '- Pulso NUNCA mueve dinero. Las órdenes que ves aquí son simuladas.',
  '- Para leer tu factura, el archivo se envía a dos modelos de IA (Gemini y Claude) a través de OpenRouter. No envíes datos reales ni personales.',
  '- Toda factura que llega por este chat la revisa una persona: como máximo termina en ESCALAR.',
  '',
  `Envíame una foto o un PDF de una factura (JPG, PNG o PDF, hasta ${MAX_BYTES / 1024 / 1024} MB).`,
].join('\n');

export const PIDE_START = 'Antes de enviarme facturas escribe /start: ahí te explico qué hago con tu archivo.';
export const PIDE_ARCHIVO = 'Envíame una foto o un PDF de una factura. Si necesitas ayuda, escribe /start.';
export const NO_DISPONIBLE = 'Pulso no está disponible ahora mismo. Intenta de nuevo en unos minutos.';
export const NO_PUDE_LEER = 'No pude leer esta factura con seguridad, así que no tomo ninguna decisión. Prueba con otra foto más clara o un PDF con texto.';

export function rechazoArchivo(m: 'GRANDE' | 'TIPO' | 'VACIO'): string {
  if (m === 'GRANDE') return `El archivo pesa más de ${MAX_BYTES / 1024 / 1024} MB. Envía uno más liviano.`;
  if (m === 'VACIO') return 'El archivo llegó vacío. Envíalo de nuevo.';
  return 'Solo acepto fotos JPG, PNG o PDF. Ese archivo no es de ninguno de esos tipos.';
}

export function rechazoCupo(c: 'chat' | 'dia', maxChat: number): string {
  return c === 'chat'
    ? `Llegaste al límite de ${maxChat} facturas por hora en este chat. Vuelve a intentar más tarde.`
    : 'Pulso llegó hoy a su tope de facturas de prueba. Vuelve a intentar mañana.';
}

const ETIQUETA: Record<Decision, string> = {
  PAGAR: 'PAGAR',
  FRENAR: 'FRENAR (frenada)',
  ESCALAR: 'ESCALAR (la revisa una persona)',
};

/** Una razon en una frase llana. Reutiliza `motivo()` de la interfaz para que el chat y la web hablen igual. */
export function fraseRazon(r: ResultadoDecision, razon: Razon): string {
  if (razon.regla === REGLA_EN_VIVO) return `${TEXTO_EN_VIVO}.`;
  const fila = { resultado: { ...r, decision: razon.efecto, razones: [razon] } } as unknown as FilaDemo;
  return motivo(fila);
}

/** Frase extra cuando los dos modelos no coincidieron, con el nombre llano de cada dato. */
function lineaDiferencias(alertas: string[]): string | null {
  const campos = alertas.filter((a) => a.startsWith('lecturas_difieren:')).map((a) => camposLeidos[a.split(':')[1] ?? ''] ?? '');
  const lista = [...new Set(campos.filter(Boolean))];
  return lista.length ? `Los dos modelos no coincidieron en: ${lista.join(', ')}.` : null;
}

export function resumenTexto(res: ResumenFactura): string {
  return [
    `Proveedor: ${limpio(res.beneficiario) || 'sin leer'}`,
    `Factura: ${limpio(res.numero_factura, 40) || 'sin número'}`,
    `Monto: ${dinero(res.monto_centavos, res.moneda)}`,
  ].join('\n');
}

export function textoDecision(r: ResultadoDecision, res: ResumenFactura, alertas: string[], urlPublica: string): string {
  const lineas = [`Decisión de Pulso: ${ETIQUETA[r.decision]}`, '', resumenTexto(res), '', 'Por qué:'];
  for (const razon of r.razones) lineas.push(`- ${fraseRazon(r, razon)}`);
  const dif = lineaDiferencias(alertas);
  if (dif) lineas.push(`- ${dif}`);
  if (r.razones.length === 0) lineas.push('- Cumple todas las reglas.');
  lineas.push('', `Cómo decide Pulso: ${urlPublica}`, 'Datos de prueba. Pulso nunca mueve dinero: la orden es simulada.');
  return lineas.join('\n');
}

export function textoParaDueno(id: string, res: ResumenFactura, razones: string[]): string {
  return [`Hay una factura que necesita tu aprobación (simulada).`, '', resumenTexto(res), '', 'Por qué:', ...razones.map((x) => `- ${x}`), '', `Referencia: ${id.slice(0, 8)}`].join('\n');
}
