import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { puedeAbrirseSola } from '../app/bienvenida/estado';
import { NOMBRES_ICONO } from '../app/ui/mapa-iconos';
import { debeOcultar, esRutaInterna } from '../src/publico';

const DIR = join(__dirname, '..', 'app', 'conoce');
const fuentes = readdirSync(DIR).filter((f) => /\.(tsx|css)$/.test(f)).map((f) => ({ f, t: readFileSync(join(DIR, f), 'utf8') }));

describe('la landing /conoce es pública', () => {
  it('no es ruta interna y no se oculta en modo público', () => {
    expect(esRutaInterna('/conoce')).toBe(false);
    expect(debeOcultar('/conoce', { MODO_PUBLICO: '1' })).toBe(false);
    expect(debeOcultar('/Conoce/', { MODO_PUBLICO: 'true' })).toBe(false);
  });
  it('la bienvenida automática no se abre encima de la landing', () => {
    expect(puedeAbrirseSola({ ruta: '/conoce', busqueda: '', tourEnCurso: false })).toBe(false);
  });
});

describe('texto y estilo de la landing', () => {
  it('sin raya larga ni palabras prohibidas', () => {
    const prohibidas = [/—/, /inmutable/i, /80\s?%/, /30 minutos/i, /escasez/i, /fracas/i, /no se puede tocar/i, /detecta fraude/i, /\bPix\b|\bSPEI\b|\bACH\b/];
    for (const { f, t } of fuentes) for (const p of prohibidas) expect(t, `${f} ${p}`).not.toMatch(p);
  });
  it('solo usa íconos que existen en el mapa único', () => {
    const t = fuentes.find((x) => x.f === 'page.tsx')!.t;
    const usados = [...t.matchAll(/(?:nombre|icono)[=:]\s*["'{]+\s*['"]?([a-z-]+)['"]/g)].map((m) => m[1]!);
    expect(usados.length).toBeGreaterThan(10);
    for (const n of usados) expect(NOMBRES_ICONO as readonly string[], n).toContain(n);
  });
  it('estilos propios sin colores sueltos ni estilos en línea', () => {
    const css = fuentes.find((x) => x.f === 'conoce.css')!.t;
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/rgba?\(/);
    for (const { f, t } of fuentes.filter((x) => x.f.endsWith('.tsx'))) expect(t, f).not.toMatch(/style=\{\{/);
  });
});
