import { describe, expect, it } from 'vitest';
import { alternarBarra, esActivo, esAtajoBarra, hayBarra, leerEstadoBarra, nombreTema, siguienteTema, textoContador } from '../app/barra/estado';

const tecla = (o: Partial<{ key: string; metaKey: boolean; ctrlKey: boolean; altKey: boolean; shiftKey: boolean }>) => ({ key: 'b', metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...o });

describe('estado de la barra lateral', () => {
  it('primera visita (sin valor) o valor raro: ampliada; solo "colapsada" colapsa', () => {
    expect(leerEstadoBarra(null)).toBe('ampliada');
    expect(leerEstadoBarra(undefined)).toBe('ampliada');
    expect(leerEstadoBarra('basura')).toBe('ampliada');
    expect(leerEstadoBarra('colapsada')).toBe('colapsada');
  });
  it('alternar va y vuelve', () => {
    expect(alternarBarra('ampliada')).toBe('colapsada');
    expect(alternarBarra(alternarBarra('ampliada'))).toBe('ampliada');
  });
  it('solo existe desde 1024 px', () => {
    expect(hayBarra(1023)).toBe(false);
    expect(hayBarra(1024)).toBe(true);
  });
});

describe('atajo Cmd/Ctrl + B', () => {
  it('acepta Cmd+B, Ctrl+B y mayúscula', () => {
    expect(esAtajoBarra(tecla({ metaKey: true }))).toBe(true);
    expect(esAtajoBarra(tecla({ ctrlKey: true }))).toBe(true);
    expect(esAtajoBarra(tecla({ ctrlKey: true, key: 'B' }))).toBe(true);
  });
  it('rechaza B sola, otras teclas y combinaciones con Alt o Shift', () => {
    expect(esAtajoBarra(tecla({}))).toBe(false);
    expect(esAtajoBarra(tecla({ ctrlKey: true, key: 'k' }))).toBe(false);
    expect(esAtajoBarra(tecla({ ctrlKey: true, altKey: true }))).toBe(false);
    expect(esAtajoBarra(tecla({ metaKey: true, shiftKey: true }))).toBe(false);
  });
});

describe('ítem activo', () => {
  it('Decisiones también cubre el detalle de una factura', () => {
    expect(esActivo('/', '/')).toBe(true);
    expect(esActivo('/', '/facturas/F-016')).toBe(true);
    expect(esActivo('/', '/cola')).toBe(false);
  });
  it('las demás rutas son exactas o con subruta; / no se activa por prefijo', () => {
    expect(esActivo('/cola', '/cola')).toBe(true);
    expect(esActivo('/team', '/team/contexto.md')).toBe(true);
    expect(esActivo('/reglas', '/registro')).toBe(false);
    expect(esActivo('/cola', '/colas')).toBe(false);
  });
});

describe('contador de pendientes', () => {
  it('vacío si no hay dato o es cero; tope 99+', () => {
    expect(textoContador(null)).toBe('');
    expect(textoContador(undefined)).toBe('');
    expect(textoContador(0)).toBe('');
    expect(textoContador(-3)).toBe('');
    expect(textoContador(Number.NaN)).toBe('');
    expect(textoContador(10)).toBe('10');
    expect(textoContador(99)).toBe('99');
    expect(textoContador(100)).toBe('99+');
  });
});

describe('tema', () => {
  it('cicla claro, oscuro, sistema', () => {
    expect(siguienteTema('sistema')).toBe('light');
    expect(siguienteTema('light')).toBe('dark');
    expect(siguienteTema('dark')).toBe('sistema');
    expect(nombreTema('dark')).toBe('oscuro');
  });
});
