import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import type { EntradaFactura } from './extraer';
import { textoDePdf } from './pdftexto';

const MIME: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

/**
 * Convierte un archivo de factura en la entrada del lector: .eml/.txt -> texto; .pdf -> su capa de
 * texto (si no tiene, texto vacio y el lector lo escalara); imagen -> base64.
 */
export async function entradaDesdeArchivo(ruta: string): Promise<EntradaFactura> {
  const ext = extname(ruta).toLowerCase();
  const datos = await readFile(ruta);
  if (ext in MIME) return { imagenBase64: datos.toString('base64'), mime: MIME[ext] as string };
  if (ext === '.pdf') return { texto: textoDePdf(datos) };
  return { texto: datos.toString('utf8') };
}
