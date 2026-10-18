import type { EntradaFactura } from '../extraccion/extraer';
import { entradaDesdeBytes as entradaTelegram, MAX_BYTES, validarBytes } from '../telegram/archivo';
import type { TipoArchivo } from '../telegram/archivo';

export { MAX_BYTES };

export type CodigoArchivo = 'VACIO' | 'MUY_GRANDE' | 'HEIC' | 'TIPO_NO_ADMITIDO' | 'PDF_SIN_TEXTO';

export type ResultadoArchivo =
  | { ok: true; entrada: EntradaFactura; tipo: TipoArchivo }
  | { ok: false; codigo: CodigoArchivo; mensaje: string };

const MENSAJES: Record<CodigoArchivo, string> = {
  VACIO: 'El archivo llegó vacío.',
  MUY_GRANDE: 'El archivo pesa más de 4 MB. Sube una foto más liviana o una captura de pantalla.',
  HEIC: 'Las fotos HEIC del iPhone no se pueden leer. Envíala como JPG o haz una captura de pantalla de la factura.',
  TIPO_NO_ADMITIDO: 'Solo se aceptan fotos JPG o PNG y archivos PDF.',
  PDF_SIN_TEXTO: 'Este PDF no trae texto que se pueda leer (parece escaneado). Sube una foto o captura de la factura.',
};

const no = (codigo: CodigoArchivo): ResultadoArchivo => ({ ok: false, codigo, mensaje: MENSAJES[codigo] });
const esHeic = (b: Uint8Array) =>
  b.length >= 12 && String.fromCharCode(...b.subarray(4, 8)) === 'ftyp' && /^(heic|heix|hevc|heim|heis|mif1|msf1)$/.test(String.fromCharCode(...b.subarray(8, 12)));

/**
 * Subida web: misma validacion que el bot de Telegram (tamano y tipo por firma de bytes, en
 * src/telegram/archivo.ts) mas dos avisos utiles en el navegador: fotos HEIC del iPhone y PDF sin
 * capa de texto, que se rechazan antes de gastar dos lecturas que escalarian igual.
 */
export function entradaDesdeBytes(b: Uint8Array): ResultadoArchivo {
  const v = validarBytes(b);
  if (!v.ok) return no(v.motivo === 'VACIO' ? 'VACIO' : v.motivo === 'GRANDE' ? 'MUY_GRANDE' : esHeic(b) ? 'HEIC' : 'TIPO_NO_ADMITIDO');
  const entrada = entradaTelegram(b, v.tipo);
  if (v.tipo === 'pdf' && (entrada.texto ?? '').trim() === '') return no('PDF_SIN_TEXTO');
  return { ok: true, tipo: v.tipo, entrada };
}
