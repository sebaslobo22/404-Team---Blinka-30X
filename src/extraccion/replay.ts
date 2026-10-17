import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ResultadoExtraccion } from './extraer';

/** Carpeta de lecturas guardadas. */
export const DIR_LECTURAS = join(process.cwd(), 'data', 'facturas', 'lecturas');

/** Con EXTRACTION_MODE=replay no se llama a la red: se lee lo guardado. */
export const modoReplay = (): boolean => process.env['EXTRACTION_MODE'] === 'replay';

export interface LecturaGuardada {
  id: string;
  /** Fecha ISO de cuando se hizo la lectura real. */
  fecha: string;
  modelos: string[];
  resultado: ResultadoExtraccion;
}

const archivo = (id: string, dir: string) => join(dir, `${id.replace(/[^A-Za-z0-9_-]/g, '_')}.json`);

export async function guardarLectura(id: string, resultado: ResultadoExtraccion, modelos: string[], dir = DIR_LECTURAS): Promise<string> {
  await mkdir(dir, { recursive: true });
  const dato: LecturaGuardada = { id, fecha: new Date().toISOString(), modelos, resultado };
  const ruta = archivo(id, dir);
  await writeFile(ruta, `${JSON.stringify(dato, null, 2)}\n`, 'utf8');
  return ruta;
}

/** null si no hay lectura guardada para ese id o el archivo no es valido. */
export async function leerLectura(id: string, dir = DIR_LECTURAS): Promise<LecturaGuardada | null> {
  try {
    const j = JSON.parse(await readFile(archivo(id, dir), 'utf8'));
    if (j && typeof j === 'object' && j.resultado?.factura) return j as LecturaGuardada;
    return null;
  } catch {
    return null;
  }
}
