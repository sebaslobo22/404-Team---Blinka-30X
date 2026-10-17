// Lógica pura de la barra lateral: estado, atajo, ítem activo y contador. Sin DOM.
export type EstadoBarra = 'ampliada' | 'colapsada';
export const CLAVE_BARRA = '404-barra';
export const ANCHO_MINIMO_BARRA = 1024;

/** Lee el valor guardado. Cualquier cosa rara (o nada) es la primera visita: ampliada. */
export function leerEstadoBarra(crudo: string | null | undefined): EstadoBarra {
  return crudo === 'colapsada' ? 'colapsada' : 'ampliada';
}

export const alternarBarra = (e: EstadoBarra): EstadoBarra => (e === 'ampliada' ? 'colapsada' : 'ampliada');

export interface TeclaBasica { key: string; metaKey: boolean; ctrlKey: boolean; altKey: boolean; shiftKey: boolean }

/** Cmd+B (Mac) o Ctrl+B, sin Alt ni Shift. */
export function esAtajoBarra(t: TeclaBasica): boolean {
  return t.key.toLowerCase() === 'b' && (t.metaKey || t.ctrlKey) && !t.altKey && !t.shiftKey;
}

export const hayBarra = (anchoVentana: number): boolean => anchoVentana >= ANCHO_MINIMO_BARRA;

/** Un ítem está activo en su ruta o debajo de ella; las facturas cuelgan de Decisiones. */
export function esActivo(href: string, ruta: string): boolean {
  if (href === '/') return ruta === '/' || ruta.startsWith('/facturas/');
  return ruta === href || ruta.startsWith(`${href}/`);
}

/** Texto del contador: vacío si no hay nada que mostrar, tope en 99+. */
export function textoContador(n: number | null | undefined): string {
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) return '';
  return n > 99 ? '99+' : String(Math.floor(n));
}

export type TemaGuardado = 'sistema' | 'light' | 'dark';
export const siguienteTema = (t: string): TemaGuardado => (t === 'light' ? 'dark' : t === 'dark' ? 'sistema' : 'light');
export const nombreTema = (t: string): string => (t === 'light' ? 'claro' : t === 'dark' ? 'oscuro' : 'del sistema');
