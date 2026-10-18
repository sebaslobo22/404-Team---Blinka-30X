import type { EntradaFactura } from '../extraccion/extraer';
import { textoDePdf } from '../extraccion/pdftexto';

/** Tope de tamano de la factura que se acepta por Telegram. */
export const MAX_BYTES = 4 * 1024 * 1024;

export type TipoArchivo = 'pdf' | 'jpg' | 'png';

export const MIME_DE: Record<TipoArchivo, string> = { pdf: 'application/pdf', jpg: 'image/jpeg', png: 'image/png' };

/** Tipos declarados (por Telegram) que se aceptan antes de descargar. */
const MIMES_ACEPTADOS = new Set(Object.values(MIME_DE));

/** Tipo REAL por firma de bytes (no se confia en la extension ni en el mime declarado). */
export function tipoPorFirma(b: Uint8Array): TipoArchivo | null {
  if (b.length >= 5 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 && b[4] === 0x2d) return 'pdf';
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (b.length >= 8 && png.every((v, i) => b[i] === v)) return 'png';
  return null;
}

export type Validacion = { ok: true } | { ok: false; motivo: 'GRANDE' | 'TIPO' | 'VACIO' };

/** Validacion previa a la descarga, con lo que reporta Telegram. El tamano desconocido pasa (se revisa tras bajar). */
export function validarReportado(tamano: number | null | undefined, mime: string | null | undefined): Validacion {
  if (typeof tamano === 'number' && tamano > MAX_BYTES) return { ok: false, motivo: 'GRANDE' };
  if (typeof mime === 'string' && mime !== '' && !MIMES_ACEPTADOS.has(mime.toLowerCase())) return { ok: false, motivo: 'TIPO' };
  return { ok: true };
}

/** Validacion tras descargar: tamano real y firma. */
export function validarBytes(b: Uint8Array): { ok: true; tipo: TipoArchivo } | { ok: false; motivo: 'GRANDE' | 'TIPO' | 'VACIO' } {
  if (b.length === 0) return { ok: false, motivo: 'VACIO' };
  if (b.length > MAX_BYTES) return { ok: false, motivo: 'GRANDE' };
  const tipo = tipoPorFirma(b);
  return tipo ? { ok: true, tipo } : { ok: false, motivo: 'TIPO' };
}

/** PDF -> su capa de texto; imagen -> base64. Mismo criterio que entradaDesdeArchivo, pero desde memoria. */
export function entradaDesdeBytes(b: Uint8Array, tipo: TipoArchivo): EntradaFactura {
  if (tipo === 'pdf') return { texto: textoDePdf(b) };
  return { imagenBase64: Buffer.from(b).toString('base64'), mime: MIME_DE[tipo] };
}
