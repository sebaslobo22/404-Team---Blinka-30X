// Lógica pura de la bienvenida de primera visita. Sin DOM, para poder probarla.
export const CLAVE_BIENVENIDA = '404-bienvenida-vista';
/** La misma clave que usa app/tour/Tour.tsx para un recorrido en curso. */
export const CLAVE_PASO_TOUR = '404-tour-paso';
export const EVENTO_ABRIR = 'bienvenida:abrir';

export interface Almacen { getItem(k: string): string | null; setItem(k: string, v: string): void }

/**
 * Reclama la primera visita: si no estaba marcada, la marca y devuelve true solo si la marca quedó guardada.
 * Si el almacenamiento falla (privado, bloqueado, lleno), devuelve false: mejor no mostrarla que mostrarla en bucle.
 */
export function reclamarPrimeraVisita(almacen: Almacen | null | undefined): boolean {
  if (!almacen) return false;
  try {
    if (almacen.getItem(CLAVE_BIENVENIDA) !== null) return false;
    almacen.setItem(CLAVE_BIENVENIDA, '1');
    return almacen.getItem(CLAVE_BIENVENIDA) === '1';
  } catch {
    return false;
  }
}

/** El enlace del jurado (?recorrido=jurado) es para el recorrido: la bienvenida no se le cruza. */
export function vieneAlRecorrido(busqueda: string): boolean {
  try { return new URLSearchParams(busqueda).get('recorrido') === 'jurado'; } catch { return false; }
}

/** La bienvenida automática solo aparece fuera del centro de mando y de la página /conoce, sin recorrido en curso y sin el enlace del jurado. */
export function puedeAbrirseSola({ ruta, busqueda, tourEnCurso }: { ruta: string; busqueda: string; tourEnCurso: boolean }): boolean {
  return !ruta.startsWith('/team') && !ruta.startsWith('/conoce') && !tourEnCurso && !vieneAlRecorrido(busqueda);
}

/** Solo un enlace https (p. ej. https://t.me/...) se vuelve botón; cualquier otra cosa es "sin enlace". */
export function enlaceTelegram(valor: string | undefined | null): string | null {
  const v = (valor ?? '').trim();
  if (!v) return null;
  try { const u = new URL(v); return u.protocol === 'https:' && u.hostname ? u.toString() : null; } catch { return null; }
}

/** Una dirección de correo simple y sin espacios; si no lo parece, no se muestra. */
export function buzonCorreo(valor: string | undefined | null): string | null {
  const v = (valor ?? '').trim();
  return /^[^\s@<>"',;:]+@[^\s@<>"',;:]+\.[a-z]{2,}$/i.test(v) ? v : null;
}
