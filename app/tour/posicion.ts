// Geometría pura del recorrido: dónde va la burbuja y cuánto hay que desplazar la página.
export interface Caja { left: number; top: number; width: number; height: number }
export type Borde = 'arriba' | 'abajo' | 'izquierda' | 'derecha';
export type Lado = 'centro' | 'abajo' | 'arriba' | 'izquierda' | 'derecha' | 'dentro' | 'hoja';
export interface Posicion {
  lado: Lado;
  left: number;
  top: number;
  ancho: number;
  /** Borde de la burbuja donde se dibuja la flecha y su desplazamiento a lo largo de ese borde. */
  flecha: { borde: Borde; desplazamiento: number } | null;
  /** Caja iluminada (con margen), recortada si la burbuja tuvo que ir encima. */
  foco: Caja | null;
}

export const MARGEN_FOCO = 8;
export const SEPARACION = 16;
export const MARGEN_PANTALLA = 16;
export const ANCHO_MAX = 360;
export const ANCHO_MOVIL = 600;
const ESQUINA = 22;

const acotar = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max < min ? min : max));
export const expandir = (c: Caja, m: number): Caja => ({ left: c.left - m, top: c.top - m, width: c.width + 2 * m, height: c.height + 2 * m });

export interface EntradaPosicion {
  objetivo: Caja | null;
  viewport: { ancho: number; alto: number };
  burbuja: { alto: number };
}

export function posicionarBurbuja({ objetivo, viewport: v, burbuja }: EntradaPosicion): Posicion {
  const movil = v.ancho <= ANCHO_MOVIL;
  const ancho = movil ? v.ancho - 2 * MARGEN_PANTALLA : Math.min(ANCHO_MAX, v.ancho - 2 * MARGEN_PANTALLA);
  const alto = Math.min(burbuja.alto, v.alto - 2 * MARGEN_PANTALLA);
  if (!objetivo) {
    return { lado: 'centro', left: acotar((v.ancho - ancho) / 2, 0, v.ancho - ancho), top: acotar((v.alto - alto) / 2, 0, v.alto - alto), ancho, flecha: null, foco: null };
  }
  const f = expandir(objetivo, MARGEN_FOCO);
  const cx = f.left + f.width / 2;
  const cy = f.top + f.height / 2;
  const izqCentrada = acotar(cx - ancho / 2, MARGEN_PANTALLA, v.ancho - ancho - MARGEN_PANTALLA);
  const topCentrado = acotar(cy - alto / 2, MARGEN_PANTALLA, v.alto - alto - MARGEN_PANTALLA);
  const flechaH = (left: number) => acotar(cx - left, ESQUINA, ancho - ESQUINA);
  const flechaV = (top: number) => acotar(cy - top, ESQUINA, alto - ESQUINA);

  if (!movil) {
    const abajo = f.top + f.height + SEPARACION;
    if (abajo >= MARGEN_PANTALLA && abajo + alto <= v.alto - MARGEN_PANTALLA) return { lado: 'abajo', left: izqCentrada, top: abajo, ancho, flecha: { borde: 'arriba', desplazamiento: flechaH(izqCentrada) }, foco: f };
    const arriba = f.top - SEPARACION - alto;
    if (arriba >= MARGEN_PANTALLA && arriba + alto <= v.alto - MARGEN_PANTALLA) return { lado: 'arriba', left: izqCentrada, top: arriba, ancho, flecha: { borde: 'abajo', desplazamiento: flechaH(izqCentrada) }, foco: f };
    const derecha = f.left + f.width + SEPARACION;
    if (derecha >= MARGEN_PANTALLA && derecha + ancho <= v.ancho - MARGEN_PANTALLA) return { lado: 'derecha', left: derecha, top: topCentrado, ancho, flecha: { borde: 'izquierda', desplazamiento: flechaV(topCentrado) }, foco: f };
    const izquierda = f.left - SEPARACION - ancho;
    if (izquierda >= MARGEN_PANTALLA && izquierda + ancho <= v.ancho - MARGEN_PANTALLA) return { lado: 'izquierda', left: izquierda, top: topCentrado, ancho, flecha: { borde: 'derecha', desplazamiento: flechaV(topCentrado) }, foco: f };
  }
  // Móvil, o ningún lado cabe: hoja anclada abajo; el foco se recorta para no quedar debajo de la burbuja.
  const left = movil ? MARGEN_PANTALLA : izqCentrada;
  const top = v.alto - alto - MARGEN_PANTALLA;
  const limite = top - 12;
  let foco: Caja = f;
  if (f.top + f.height > limite) foco = { ...f, height: Math.max(0, limite - f.top) };
  const hayFoco = foco.height >= 24;
  return { lado: movil ? 'hoja' : 'dentro', left, top, ancho, flecha: hayFoco ? { borde: 'arriba', desplazamiento: acotar(cx - left, ESQUINA, ancho - ESQUINA) } : null, foco: hayFoco ? foco : null };
}

export interface EntradaScroll {
  /** Caja del objetivo en coordenadas de ventana (sin margen). */
  objetivo: Caja;
  scrollY: number;
  alto: number;
  /** Altura de la cabecera fija visible (0 si no hay). */
  cabecera: number;
  /** Espacio al pie que ocupará la burbuja (hoja móvil). */
  reservaInferior: number;
  scrollMax: number;
}

/** Posición de scroll a la que ir para que el objetivo quede visible bajo la cabecera, o null si ya se ve. */
export function scrollNecesario({ objetivo: o, scrollY, alto, cabecera, reservaInferior, scrollMax }: EntradaScroll): number | null {
  const m = MARGEN_FOCO + 8;
  const techo = cabecera + m;
  const suelo = alto - reservaInferior - m;
  if (o.top >= techo && o.top + o.height <= suelo) return null;
  const destino = acotar(scrollY + o.top - techo, 0, scrollMax);
  return Math.abs(destino - scrollY) < 1 ? null : destino;
}

export function union(cajas: Caja[]): Caja | null {
  if (cajas.length === 0) return null;
  const l = Math.min(...cajas.map((c) => c.left));
  const t = Math.min(...cajas.map((c) => c.top));
  const r = Math.max(...cajas.map((c) => c.left + c.width));
  const b = Math.max(...cajas.map((c) => c.top + c.height));
  return { left: l, top: t, width: r - l, height: b - t };
}
