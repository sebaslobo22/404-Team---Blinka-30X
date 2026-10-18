import { createHash, timingSafeEqual } from 'node:crypto';
import { textoDecision } from '../telegram/mensajes';
import type { ResultadoVivo } from './leer-y-decidir';

/**
 * Canal Gmail: un buzon del equipo con un script de Apps Script (integraciones/gmail/Codigo.gs) que
 * manda cada adjunto a POST /api/canal/gmail con un secreto compartido. Aqui solo hay funciones puras:
 * la ruta las usa y las pruebas las cubren.
 */

/** Tope del adjunto por correo: Vercel corta el cuerpo de la peticion a 4,5 MB; 3 MB deja margen. */
export const MAX_BYTES_GMAIL = 3 * 1024 * 1024;

/** Largo minimo del secreto. Mas corto, el canal queda apagado (nadie entra). */
export const LARGO_MINIMO_SECRETO = 24;

/** El canal existe solo con secreto suficiente y clave de OpenRouter. */
export function canalGmailActivo(env: Record<string, string | undefined> = process.env): boolean {
  return (env['GMAIL_CANAL_SECRETO'] ?? '').trim().length >= LARGO_MINIMO_SECRETO && Boolean(env['OPENROUTER_API_KEY']);
}

/**
 * Compara `Authorization: Bearer <secreto>` en tiempo constante (sobre los resumenes SHA-256, asi el
 * largo no se filtra). Sin secreto configurado o demasiado corto, rechaza todo.
 */
export function secretoValido(cabecera: string | null, esperado: string | undefined): boolean {
  const e = (esperado ?? '').trim();
  if (e.length < LARGO_MINIMO_SECRETO || !cabecera) return false;
  const m = /^Bearer\s+(.+)$/.exec(cabecera.trim());
  if (!m) return false;
  const a = createHash('sha256').update(m[1]!.trim()).digest();
  const b = createHash('sha256').update(e).digest();
  return timingSafeEqual(a, b);
}

/** Clave del limite por remitente: resumen del correo en minusculas, nunca el correo. */
export function claveRemitente(remitente: unknown): string {
  const correo = typeof remitente === 'string' ? (/<([^>]+)>/.exec(remitente)?.[1] ?? remitente).trim().toLowerCase() : '';
  return `gmail:${createHash('sha256').update(correo || 'sin-remitente').digest('hex').slice(0, 16)}`;
}

/** Cuerpo de la respuesta en el hilo: el mismo texto que el bot de Telegram, con un saludo de correo. */
export function textoParaCorreo(r: ResultadoVivo, urlPublica: string): string {
  const f = r.factura;
  const cuerpo = textoDecision(r.resultado, { beneficiario: f.beneficiario, numero_factura: f.numero_factura, monto_centavos: f.monto_centavos, moneda: f.moneda }, f.alertas ?? [], urlPublica);
  return [
    'Hola, soy Pulso. Leí la factura que nos enviaste.',
    '',
    cuerpo,
    '',
    'Toda factura que llega por correo la revisa una persona: como máximo termina en ESCALAR.',
    'Para leerla, el adjunto se envió a dos modelos de IA (Claude y Gemini) a través de OpenRouter. Pulso no guarda el archivo. No envíes facturas reales ni datos personales.',
    `Referencia: ${r.id}`,
  ].join('\n');
}
