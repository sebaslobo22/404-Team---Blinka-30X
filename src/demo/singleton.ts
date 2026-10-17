import { crearEstado } from './estado';
import type { EstadoDemo } from './estado';
import type { ParametrosReglas } from './parametros';

/**
 * Un estado por proceso del servidor. En un despliegue sin servidor cada instancia tiene el suyo:
 * es suficiente para el modo replay y se reconstruye igual (el reloj es fijo y el set es el mismo).
 */
const CLAVE = Symbol.for('blinka.demo.estado');
type Global = typeof globalThis & { [CLAVE]?: Promise<EstadoDemo> };

export function obtenerEstado(): Promise<EstadoDemo> {
  const g = globalThis as Global;
  g[CLAVE] ??= crearEstado();
  return g[CLAVE];
}

/** Reconstruye el estado con otros parametros de reglas (borra aprobaciones y registro de la sesion). */
export async function reemplazarEstado(parametros: ParametrosReglas, edicion: number): Promise<EstadoDemo> {
  const g = globalThis as Global;
  g[CLAVE] = crearEstado(parametros, edicion);
  return g[CLAVE];
}

export async function reiniciarEstado(): Promise<EstadoDemo> {
  const g = globalThis as Global;
  g[CLAVE] = crearEstado();
  return g[CLAVE];
}
