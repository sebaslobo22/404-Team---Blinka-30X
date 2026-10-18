import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CLAVE_BIENVENIDA, CLAVE_PASO_TOUR, buzonCorreo, enlaceTelegram, puedeAbrirseSola, reclamarPrimeraVisita, vieneAlRecorrido } from '../app/bienvenida/estado';
import type { Almacen } from '../app/bienvenida/estado';

const memoria = (): Almacen & { datos: Map<string, string> } => {
  const datos = new Map<string, string>();
  return { datos, getItem: (k) => datos.get(k) ?? null, setItem: (k, v) => { datos.set(k, v); } };
};

describe('bienvenida: una sola vez', () => {
  it('la primera visita la reclama y la segunda ya no', () => {
    const a = memoria();
    expect(reclamarPrimeraVisita(a)).toBe(true);
    expect(a.datos.get(CLAVE_BIENVENIDA)).toBe('1');
    expect(reclamarPrimeraVisita(a)).toBe(false);
  });
  it('sin almacenamiento, o si falla al leer o al guardar, no se muestra (nunca en bucle)', () => {
    expect(reclamarPrimeraVisita(null)).toBe(false);
    expect(reclamarPrimeraVisita({ getItem: () => { throw new Error('bloqueado'); }, setItem: () => { } })).toBe(false);
    expect(reclamarPrimeraVisita({ getItem: () => null, setItem: () => { throw new Error('lleno'); } })).toBe(false);
    // Guardar "funciona" pero no persiste: tampoco.
    expect(reclamarPrimeraVisita({ getItem: () => null, setItem: () => { } })).toBe(false);
  });
});

describe('bienvenida: no se cruza con el recorrido', () => {
  it('el enlace del jurado la apaga', () => {
    expect(vieneAlRecorrido('?recorrido=jurado')).toBe(true);
    expect(vieneAlRecorrido('?x=1&recorrido=jurado')).toBe(true);
    expect(vieneAlRecorrido('')).toBe(false);
    expect(vieneAlRecorrido('?recorrido=otro')).toBe(false);
    expect(puedeAbrirseSola({ ruta: '/', busqueda: '?recorrido=jurado', tourEnCurso: false })).toBe(false);
  });
  it('con un recorrido en curso o en el centro de mando, no se abre sola', () => {
    expect(puedeAbrirseSola({ ruta: '/', busqueda: '', tourEnCurso: true })).toBe(false);
    expect(puedeAbrirseSola({ ruta: '/team', busqueda: '', tourEnCurso: false })).toBe(false);
    expect(puedeAbrirseSola({ ruta: '/facturas/F-016', busqueda: '', tourEnCurso: false })).toBe(true);
  });
  it('lee la misma clave de recorrido en curso que el Tour', () => {
    const tour = readFileSync(new URL('../app/tour/Tour.tsx', import.meta.url), 'utf8');
    expect(tour).toContain(`'${CLAVE_PASO_TOUR}'`);
  });
});

describe('bienvenida: canales sin enlaces rotos', () => {
  it('Telegram: solo un enlace https se vuelve botón', () => {
    expect(enlaceTelegram('https://t.me/pulso_bot')).toBe('https://t.me/pulso_bot');
    expect(enlaceTelegram('  https://t.me/pulso_bot ')).toBe('https://t.me/pulso_bot');
    for (const malo of [undefined, null, '', '   ', 't.me/pulso_bot', 'http://t.me/x', 'javascript:alert(1)']) expect(enlaceTelegram(malo), String(malo)).toBeNull();
  });
  it('Correo: solo una dirección simple', () => {
    expect(buzonCorreo('facturas.pulso@gmail.com')).toBe('facturas.pulso@gmail.com');
    for (const malo of [undefined, '', 'sin-arroba', 'a@b', 'a b@c.com', 'a@b.com?bcc=x@y.com']) expect(buzonCorreo(malo), String(malo)).toBeNull();
  });
});

describe('bienvenida: textos', () => {
  const fuente = readFileSync(new URL('../app/bienvenida/Bienvenida.tsx', import.meta.url), 'utf8');
  it('dice lo acordado y ofrece los dos caminos', () => {
    for (const t of ['Hola, soy Pulso', 'Leo tus facturas, decido con tus reglas y te pido permiso cuando algo se sale. Nunca muevo dinero.', 'Soy de finanzas', 'Soy jurado: 3 minutos', 'Conecta tus canales', 'Escríbele al bot y crea tu empresa con /start', 'Reenvía la factura al buzón del equipo', 'Pídele el enlace del bot al equipo', 'Disponible en el despliegue con lectura en vivo', 'Cerrar']) expect(fuente).toContain(t);
    expect(fuente).toContain("new Event('tour:abrir')");
  });
  it('sin raya larga en el texto visible', () => {
    expect(fuente).not.toContain('—');
  });
});
