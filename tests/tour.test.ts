import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { PASOS, contarFrases, pasosPara } from '../app/tour/pasos';
import { MARGEN_PANTALLA, posicionarBurbuja, scrollNecesario, union } from '../app/tour/posicion';

const V = { ancho: 1280, alto: 800 };

describe('tabla de pasos del recorrido', () => {
  it('cada paso tiene id único, ruta que empieza por / y texto', () => {
    expect(new Set(PASOS.map((p) => p.id)).size).toBe(PASOS.length);
    for (const p of PASOS) {
      expect(p.ruta.startsWith('/'), p.id).toBe(true);
      expect(p.titulo.trim().length, p.id).toBeGreaterThan(0);
      expect(p.texto.trim().length, p.id).toBeGreaterThan(0);
    }
  });
  it('máximo 2 frases por paso', () => {
    for (const p of PASOS) expect(contarFrases(p.texto), p.id).toBeLessThanOrEqual(2);
  });
  it('escritorio tiene 13 pasos, incluida la barra justo tras la bienvenida; móvil 12 sin la barra', () => {
    expect(pasosPara(true)).toHaveLength(13);
    expect(pasosPara(false)).toHaveLength(12);
    expect(pasosPara(true)[1]?.id).toBe('barra');
    expect(pasosPara(false).some((p) => p.id === 'barra')).toBe(false);
  });
  it('empieza con la bienvenida y termina con el cierre, ambos sin foco', () => {
    const p = pasosPara(false);
    expect(p[0]).toMatchObject({ tipo: 'inicio' });
    expect(p[0]?.selector).toBeUndefined();
    expect(p.at(-1)).toMatchObject({ tipo: 'fin' });
    expect(p.at(-1)?.selector).toBeUndefined();
  });
  it('los pasos con foco recorren las páginas del producto en orden', () => {
    expect(PASOS.map((p) => p.ruta).filter((r, i, a) => r !== a[i - 1])).toEqual(['/', '/facturas/F-016', '/cola', '/reglas', '/registro', '/']);
  });
});

describe('posición de la burbuja', () => {
  const objetivo = { left: 300, top: 200, width: 400, height: 100 };
  it('sin objetivo va centrada', () => {
    const p = posicionarBurbuja({ objetivo: null, viewport: V, burbuja: { alto: 200 } });
    expect(p.lado).toBe('centro');
    expect(p.flecha).toBeNull();
    expect(p.left).toBeCloseTo((1280 - 360) / 2);
    expect(p.top).toBeCloseTo(300);
  });
  it('prefiere abajo si cabe', () => {
    const p = posicionarBurbuja({ objetivo, viewport: V, burbuja: { alto: 200 } });
    expect(p.lado).toBe('abajo');
    expect(p.top).toBeGreaterThanOrEqual(300 + 8);
    expect(p.flecha?.borde).toBe('arriba');
  });
  it('si abajo no cabe, va arriba', () => {
    const p = posicionarBurbuja({ objetivo: { ...objetivo, top: 560 }, viewport: V, burbuja: { alto: 200 } });
    expect(p.lado).toBe('arriba');
    expect(p.top + 200).toBeLessThanOrEqual(560 - 8);
    expect(p.flecha?.borde).toBe('abajo');
  });
  it('si ni arriba ni abajo caben, va a un lado', () => {
    const alto = { left: 100, top: 20, width: 300, height: 760 };
    const p = posicionarBurbuja({ objetivo: alto, viewport: V, burbuja: { alto: 200 } });
    expect(p.lado).toBe('derecha');
    expect(p.left).toBeGreaterThanOrEqual(100 + 300 + 8);
    const der = posicionarBurbuja({ objetivo: { ...alto, left: 860 }, viewport: V, burbuja: { alto: 200 } });
    expect(der.lado).toBe('izquierda');
  });
  it('si nada cabe, se pone dentro abajo y recorta el foco para no taparlo', () => {
    const p = posicionarBurbuja({ objetivo: { left: 20, top: 20, width: 1240, height: 760 }, viewport: V, burbuja: { alto: 200 } });
    expect(p.lado).toBe('dentro');
    expect(p.foco).not.toBeNull();
    expect(p.foco!.top + p.foco!.height).toBeLessThanOrEqual(p.top);
  });
  it('en móvil se ancla abajo a lo ancho', () => {
    const p = posicionarBurbuja({ objetivo: { left: 16, top: 150, width: 358, height: 120 }, viewport: { ancho: 390, alto: 800 }, burbuja: { alto: 230 } });
    expect(p.lado).toBe('hoja');
    expect(p.ancho).toBe(390 - 2 * MARGEN_PANTALLA);
    expect(p.left).toBe(MARGEN_PANTALLA);
    expect(p.top + 230).toBeLessThanOrEqual(800);
  });
  it('siempre queda dentro del viewport, con cualquier objetivo', () => {
    const caja = fc.record({ left: fc.integer({ min: -200, max: 1500 }), top: fc.integer({ min: -200, max: 1200 }), width: fc.integer({ min: 1, max: 1400 }), height: fc.integer({ min: 1, max: 1200 }) });
    fc.assert(fc.property(fc.option(caja, { nil: null }), fc.integer({ min: 320, max: 1920 }), fc.integer({ min: 480, max: 1200 }), fc.integer({ min: 120, max: 420 }), (obj, ancho, alto, ba) => {
      const p = posicionarBurbuja({ objetivo: obj, viewport: { ancho, alto }, burbuja: { alto: ba } });
      const h = Math.min(ba, alto - 2 * MARGEN_PANTALLA);
      expect(p.left).toBeGreaterThanOrEqual(-0.001);
      expect(p.top).toBeGreaterThanOrEqual(-0.001);
      expect(p.left + p.ancho).toBeLessThanOrEqual(ancho + 0.001);
      expect(p.top + h).toBeLessThanOrEqual(alto + 0.001);
    }), { numRuns: 500 });
  });
});

describe('scroll hacia el objetivo', () => {
  const base = { scrollY: 0, alto: 800, cabecera: 88, reservaInferior: 0, scrollMax: 3000 };
  it('no se mueve si ya se ve bajo la cabecera', () => {
    expect(scrollNecesario({ ...base, objetivo: { left: 0, top: 200, width: 100, height: 100 } })).toBeNull();
  });
  it('baja hasta dejar el objetivo justo bajo la cabecera', () => {
    const y = scrollNecesario({ ...base, objetivo: { left: 0, top: 1500, width: 100, height: 100 } });
    expect(y).toBe(1500 - (88 + 16));
  });
  it('sube si el objetivo quedó oculto detrás de la cabecera', () => {
    const y = scrollNecesario({ ...base, scrollY: 1000, objetivo: { left: 0, top: 40, width: 100, height: 100 } });
    expect(y).toBe(1000 + 40 - 104);
  });
  it('respeta la reserva inferior de la hoja móvil', () => {
    expect(scrollNecesario({ ...base, reservaInferior: 300, objetivo: { left: 0, top: 600, width: 100, height: 100 } })).not.toBeNull();
  });
  it('nunca pide un scroll fuera del documento', () => {
    expect(scrollNecesario({ ...base, scrollMax: 500, objetivo: { left: 0, top: 4000, width: 10, height: 10 } })).toBe(500);
  });
});

describe('unión de cajas', () => {
  it('une varias y devuelve null si no hay', () => {
    expect(union([])).toBeNull();
    expect(union([{ left: 0, top: 0, width: 10, height: 10 }, { left: 20, top: 5, width: 10, height: 30 }])).toEqual({ left: 0, top: 0, width: 30, height: 35 });
  });
});
