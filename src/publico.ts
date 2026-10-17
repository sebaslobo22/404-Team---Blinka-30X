// Modo publico: el mismo despliegue sirve el producto (/) y el centro de mando interno (/team).
// Con MODO_PUBLICO=1 lo interno desaparece (404). Todo aqui es puro: sin red, sin Next, probado en
// tests/publico.test.ts. Lo usan middleware.ts, app/robots.ts y las rutas de /api/team.

export type Entorno = Readonly<Record<string, string | undefined>>;

/** ¿Este proceso corre como despliegue publico (lo que ve el jurado)? Se lee en tiempo de ejecucion. */
export function modoPublico(env: Entorno): boolean {
  const v = (env.MODO_PUBLICO ?? '').trim().toLowerCase();
  return v === '1' || v === 'true';
}

/**
 * Normaliza una ruta para compararla: decodifica porcentajes (hasta 3 capas, por si viene
 * doblemente codificada), pasa `\` a `/`, colapsa barras repetidas, resuelve `.` y `..`,
 * quita la barra final y pasa a minusculas. Si la decodificacion falla (porcentaje roto),
 * se sigue con el texto tal cual: la comparacion posterior es conservadora.
 */
export function normalizarRuta(pathname: string): string {
  let s = String(pathname ?? '');
  for (let i = 0; i < 3; i++) {
    let d: string;
    try {
      d = decodeURIComponent(s);
    } catch {
      break;
    }
    if (d === s) break;
    s = d;
  }
  s = s.replace(/\0/g, '').replace(/\\/g, '/').toLowerCase();
  const out: string[] = [];
  for (const parte of s.split('/')) {
    if (parte === '' || parte === '.') continue;
    if (parte === '..') out.pop();
    else out.push(parte);
  }
  return '/' + out.join('/');
}

/** Prefijos internos ya normalizados. Se compara por segmentos completos: /api/teamx y /teams NO lo son. */
const PREFIJOS_INTERNOS = ['/team', '/api/team', '/equipo', '/api/equipo'] as const;

/** ¿La ruta es del centro de mando interno (o de sus nombres anteriores /equipo)? */
export function esRutaInterna(pathname: string): boolean {
  const ruta = normalizarRuta(pathname);
  return PREFIJOS_INTERNOS.some((p) => ruta === p || ruta.startsWith(p + '/'));
}

/** Verdadero si esta peticion debe responder 404: modo publico y ruta interna. */
export function debeOcultar(pathname: string, env: Entorno): boolean {
  return modoPublico(env) && esRutaInterna(pathname);
}

/** Destino de los nombres viejos (/equipo) cuando NO es modo publico; null si no aplica. */
export function destinoLegado(pathname: string): { destino: string; permanente: boolean } | null {
  const ruta = normalizarRuta(pathname);
  if (ruta === '/equipo' || ruta.startsWith('/equipo/')) {
    return { destino: '/team' + ruta.slice('/equipo'.length), permanente: true };
  }
  if (ruta.startsWith('/api/equipo/')) {
    return { destino: '/api/team' + ruta.slice('/api/equipo'.length), permanente: false };
  }
  return null;
}

// --- Limite de intentos de PIN (en memoria) ---
export const MAX_FALLOS = 5;
export const BLOQUEO_MS = 15 * 60 * 1000;
const MAX_CLAVES = 1000;

export interface Intento {
  fallos: number;
  /** Marca de tiempo (ms) hasta la que la clave esta bloqueada; 0 si no lo esta. */
  bloqueadoHasta: number;
  /** Marca de tiempo (ms) del ultimo fallo. */
  ultimo: number;
}
export type Intentos = Map<string, Intento>;

export function estadoBloqueo(store: Intentos, clave: string, ahora: number): { bloqueado: boolean; reintentarEnSeg: number } {
  const i = store.get(clave);
  if (!i || i.bloqueadoHasta <= ahora) return { bloqueado: false, reintentarEnSeg: 0 };
  return { bloqueado: true, reintentarEnSeg: Math.ceil((i.bloqueadoHasta - ahora) / 1000) };
}

/** Anota un fallo. Al llegar a MAX_FALLOS bloquea la clave BLOQUEO_MS. Un bloqueo vencido empieza de cero. */
export function registrarFallo(store: Intentos, clave: string, ahora: number): Intento {
  if (store.size >= MAX_CLAVES) {
    for (const [k, v] of store) if (v.bloqueadoHasta <= ahora && ahora - v.ultimo > BLOQUEO_MS) store.delete(k);
  }
  const previo = store.get(clave);
  const vigente = previo && ahora - previo.ultimo <= BLOQUEO_MS ? previo : undefined;
  const fallos = (vigente?.fallos ?? 0) + 1;
  const nuevo: Intento = { fallos, ultimo: ahora, bloqueadoHasta: fallos >= MAX_FALLOS ? ahora + BLOQUEO_MS : 0 };
  store.set(clave, nuevo);
  return nuevo;
}

export function limpiarIntentos(store: Intentos, clave: string): void {
  store.delete(clave);
}
