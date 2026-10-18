import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Portada, { type DatosPortada } from '../app/Portada';
import { AYUDAS } from '../app/ui/ayudas';
import { NOMBRES_DEFINIDOS } from '../app/ui/iconos';
import { RIESGO } from '../app/ui/mapa-iconos';

// Datos de muestra: los 13 riesgos posibles, para que cada tarjeta de riesgo salga en el HTML.
const datos: DatosPortada = {
  total: 18, pagar: 4, frenar: 4, escalar: 10, pendientes: 10, pct: 44.4, bien: 18,
  usd: { pagar: 100000, frenar: 200000, espera: 300000 }, sinMonto: 1, leidas: 17,
  riesgos: Object.keys(RIESGO).map((id, i) => ({ id, n: i + 1 })), motivoTop: { id: 'R6', n: 3 },
  costoLectura: 'USD 0,12', formatos: [{ etiqueta: 'PDF', n: 10 }, { etiqueta: 'Imagen', n: 8 }],
};
const html = renderToStaticMarkup(createElement(Portada, { d: datos }));
const etiquetas = [...html.matchAll(/<(\w+)([^>]*)>/g)].map(m => ({ tag: m[1]!, attrs: m[2]! }));
const clasesDe = (attrs: string) => (/class="([^"]*)"/.exec(attrs)?.[1] ?? '').split(/\s+/);

describe('tarjeta única de la portada', () => {
  it('toda tarjeta de la portada sale del componente compartido (lleva data-tarjeta)', () => {
    const tarjetas = etiquetas.filter(e => clasesDe(e.attrs).includes('tarjeta'));
    expect(tarjetas.length).toBeGreaterThanOrEqual(20);
    for (const t of tarjetas) expect(t.attrs, t.attrs).toMatch(/data-tarjeta="(indicador|riesgo|etapa|base)"/);
    // y al revés: nada con data-tarjeta sin la clase base
    for (const t of etiquetas.filter(e => /data-tarjeta=/.test(e.attrs))) expect(clasesDe(t.attrs)).toContain('tarjeta');
  });
  it('cada variante se usa y las 13 tarjetas de riesgo salen todas', () => {
    for (const v of ['indicador', 'riesgo', 'etapa', 'base']) expect(html).toContain(`data-tarjeta="${v}"`);
    expect(html.match(/data-tarjeta="riesgo"/g)?.length).toBe(Object.keys(RIESGO).length);
  });
  it('el botón "i" tiene nombre accesible, está descrito por un tooltip y no es solo de hover', () => {
    const botones = etiquetas.filter(e => e.tag === 'button' && /data-ayuda=/.test(e.attrs));
    expect(botones.length).toBeGreaterThanOrEqual(30);
    for (const b of botones) {
      expect(b.attrs).toContain('type="button"');
      expect(b.attrs).toContain('aria-label="Qué es esto"');
      const id = /aria-describedby="([^"]+)"/.exec(b.attrs)?.[1];
      expect(id, b.attrs).toBeTruthy();
      expect(html).toMatch(new RegExp(`id="${id!.replace(/:/g, '\\:')}"[^>]*role="tooltip"|role="tooltip"[^>]*id="${id!.replace(/:/g, '\\:')}"`));
    }
  });
  it('todo botón "i" de la portada tiene su texto en ayudas.ts', () => {
    const claves = [...html.matchAll(/data-ayuda="([^"]+)"/g)].map(m => m[1]!);
    expect(claves.length).toBeGreaterThanOrEqual(30);
    for (const c of claves) expect(AYUDAS[c], c).toBeDefined();
  });
  it('hay ayuda para cada riesgo del mapa y ninguna entrada sobra sin usar', () => {
    for (const id of Object.keys(RIESGO)) expect(AYUDAS[`riesgo-${id}`], id).toBeDefined();
    const usadas = new Set([...html.matchAll(/data-ayuda="([^"]+)"/g)].map(m => m[1]!));
    for (const c of Object.keys(AYUDAS)) expect(usadas.has(c), c).toBe(true);
  });
});

describe('textos de ayuda', () => {
  const textos = Object.entries(AYUDAS).flatMap(([c, a]) => [[c, a.que], [c, a.porque]] as const);
  it('dos frases como máximo por ayuda: una de qué es y otra de por qué importa', () => {
    for (const [c, a] of Object.entries(AYUDAS)) {
      expect(a.que.length, c).toBeGreaterThan(10);
      expect(a.porque.length, c).toBeGreaterThan(10);
      expect(a.que.match(/[.!?]/g)?.length, `${c} que`).toBe(1);
      expect(a.porque.match(/[.!?]/g)?.length, `${c} porque`).toBe(1);
    }
  });
  it('sin nombres de regla, sin códigos en mayúsculas y sin raya larga', () => {
    for (const [c, t] of textos) {
      expect(t, c).not.toMatch(/\bR[1-8]\b/);
      expect(t, c).not.toMatch(/\b(INYECCION|ESCALAR|FRENAR|PAGAR|CONFIANZA|EXTRACCION|REGISTRO|ESQUEMA)\b/);
      expect(t, c).not.toContain('—');
    }
  });
  it('los tres ejemplos del documento van tal cual', () => {
    expect(AYUDAS.frenadas).toEqual({ que: 'Facturas que Pulso no deja pagar porque rompen una regla de tu empresa.', porque: 'Ninguna se puede aprobar: hay que corregir la causa.' });
    expect(AYUDAS['riesgo-INYECCION']).toEqual({ que: 'Facturas que traían texto escondido intentando darle órdenes al asistente.', porque: 'Pulso lo lee como dato, nunca lo obedece, y te lo muestra marcado.' });
    expect(AYUDAS['costo-lectura']).toEqual({ que: 'Lo que costó que dos inteligencias artificiales leyeran todas las facturas.', porque: 'Es la suma real de las lecturas grabadas.' });
  });
  it('el ícono "i" sale del set único', () => { expect(NOMBRES_DEFINIDOS).toContain('info'); });
});
