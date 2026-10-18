import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('app/globals.css', 'utf8');

describe('rejillas de tarjetas del tablero', () => {
  it('no usan auto-fill, que deja columnas vacías cuando hay pocas tarjetas', () => {
    expect(css).not.toMatch(/\.rejilla-tarjetas\{[^}]*auto-fill/);
  });
  it('las filas de dos tarjetas tienen exactamente dos columnas en pantallas anchas', () => {
    expect(css).toMatch(/\.rejilla-2c,\.rejilla-riesgos\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
  });
  it('los riesgos tienen columnas explícitas que no dejan una tarjeta sola con 11 riesgos', () => {
    for (const cols of [3, 4]) {
      expect(css).toContain(`.rejilla-riesgos{grid-template-columns:repeat(${cols},minmax(0,1fr))}`);
      expect(11 % cols).not.toBe(1);
    }
  });
});
