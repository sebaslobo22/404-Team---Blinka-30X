import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Lee los tokens de color de app/globals.css (claro, oscuro por sistema y oscuro elegido) y comprueba
// contraste WCAG 2.x AA: 4,5:1 para texto normal y 3:1 para bordes de controles e íconos.
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');

function bloque(desde: string): string {
  const i = css.indexOf(desde);
  if (i < 0) throw new Error(`No encontré el bloque ${desde}`);
  const abre = css.indexOf('{', i + desde.length - 1);
  const cierra = css.indexOf('}', abre);
  return css.slice(abre + 1, cierra);
}

function tokens(texto: string): Record<string, string> {
  const t: Record<string, string> = {};
  for (const m of texto.matchAll(/--([a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})\b/g)) t[m[1]!] = m[2]!.toUpperCase();
  return t;
}

const lin = (c: number) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
function luminancia(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
}
function contraste(a: string, b: string): number {
  const x = luminancia(a), y = luminancia(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const claro = tokens(bloque(':root {'));
const oscuroSistema = { ...claro, ...tokens(bloque(':root:not([data-theme=light]){')) };
const oscuroElegido = { ...claro, ...tokens(bloque('[data-theme=dark]{')) };

const TEXTO = 4.5, GRANDE = 3;
/** [texto, fondo, mínimo]. Cada pareja existe en pantalla (ver app/globals.css, app/ui/iconos.css y app/barra/barra.css). */
const PAREJAS: [string, string, number][] = [
  ['tinta', 'bg', TEXTO], ['tinta', 'superficie', TEXTO], ['tinta', 'acento-suave', TEXTO],
  ['tenue', 'bg', TEXTO], ['tenue', 'superficie', TEXTO], ['tenue', 'acento-suave', TEXTO], // tenue sobre acento-suave: botón deshabilitado
  ['acento', 'bg', TEXTO], ['acento', 'superficie', TEXTO], ['acento', 'acento-suave', TEXTO], // enlaces
  ['sobre-acento', 'acento', TEXTO], // botón principal
  ['linea', 'bg', GRANDE], ['linea', 'superficie', GRANDE], // bordes de campos y botones
  ...(['pagar', 'frenar', 'escalar'] as const).flatMap((d): [string, string, number][] => [[d, `${d}-suave`, TEXTO], [d, 'superficie', TEXTO], [d, 'bg', TEXTO]]),
  ['sobre-firma', 'firma-desde', GRANDE], ['sobre-firma', 'firma-hasta', GRANDE], // ícono de la marca sobre el degradado
];

describe('contraste AA de la paleta', () => {
  it('los tres bloques traen todos los tokens de color', () => {
    for (const t of [claro, oscuroSistema, oscuroElegido]) for (const [a, b] of PAREJAS) { expect(t[a], a).toBeDefined(); expect(t[b], b).toBeDefined(); }
  });
  it('el oscuro por sistema y el oscuro elegido son la misma paleta', () => {
    expect(tokens(bloque(':root:not([data-theme=light]){'))).toEqual(tokens(bloque('[data-theme=dark]{')));
  });
  for (const [nombre, t] of [['claro', claro], ['oscuro', oscuroElegido], ['oscuro del sistema', oscuroSistema]] as const) {
    it.each(PAREJAS)(`${nombre}: %s sobre %s llega a %d:1`, (a, b, minimo) => {
      expect(contraste(t[a]!, t[b]!), `${a} ${t[a]} / ${b} ${t[b]}`).toBeGreaterThanOrEqual(minimo);
    });
  }
  it('la paleta es la decidida: marino, violeta y gris azulado', () => {
    expect(claro).toMatchObject({ bg: '#F6F9FC', superficie: '#FFFFFF', tinta: '#0A2540', tenue: '#425466', acento: '#533AFD', 'sobre-acento': '#FFFFFF', 'firma-desde': '#635BFF', 'firma-hasta': '#00D4FF' });
    expect(oscuroElegido.bg).toBe('#0A2540');
    // #635BFF da 4,45:1 sobre el fondo #F6F9FC: no alcanza para enlaces, por eso el acento es #533AFD.
    expect(contraste('#635BFF', '#F6F9FC')).toBeLessThan(TEXTO);
  });
  it('la cuenta de contraste es la de WCAG', () => {
    expect(contraste('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contraste('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2);
  });
});
