import { describe, expect, it } from 'vitest';
import {
  BLOQUEO_MS,
  MAX_FALLOS,
  debeOcultar,
  destinoLegado,
  esRutaInterna,
  estadoBloqueo,
  limpiarIntentos,
  modoPublico,
  normalizarRuta,
  registrarFallo,
  type Intentos,
} from '../src/publico';
import { PIN_MIN, pinUsable, validarPin, validarPinSeguro } from '../app/team/lib';

describe('modoPublico', () => {
  it('solo se activa con 1 o true', () => {
    expect(modoPublico({ MODO_PUBLICO: '1' })).toBe(true);
    expect(modoPublico({ MODO_PUBLICO: 'true' })).toBe(true);
    expect(modoPublico({ MODO_PUBLICO: ' TRUE ' })).toBe(true);
    expect(modoPublico({ MODO_PUBLICO: '' })).toBe(false);
    expect(modoPublico({ MODO_PUBLICO: '0' })).toBe(false);
    expect(modoPublico({})).toBe(false);
  });
});

describe('esRutaInterna', () => {
  it.each([
    '/team',
    '/team/',
    '/team/contexto.md',
    '/api/team',
    '/api/team/contexto',
    '/api/team/entrar',
    '/equipo',
    '/equipo/algo',
    '/api/equipo/tareas',
  ])('%s es interna', (p) => expect(esRutaInterna(p)).toBe(true));

  it.each([
    '/TEAM',
    '/Team/Contexto.md',
    '/API/TEAM/entrar',
    '/team/',
    '//team',
    '///api//team///entrar',
    '/team//contexto.md',
    '/./team',
    '/team/./contexto.md',
    '/team/../team',
    '/x/../team',
    '/x/%2e%2e/team',
    '/%2e/team',
    '/%74eam',
    '/%54EAM',
    '/team%2Fcontexto.md',
    '/team%2fcontexto.md',
    '/api%2Fteam%2Fentrar',
    '/%2561pi/team',
    '/team%00',
    '\\team',
    '/api\\team',
  ])('variante tramposa %s es interna', (p) => expect(esRutaInterna(p)).toBe(true));

  it.each([
    '/',
    '/cola',
    '/reglas',
    '/registro',
    '/facturas/F-009',
    '/api/registro',
    '/api/teamx',
    '/api/teamx/entrar',
    '/api/teams',
    '/teams',
    '/teamx',
    '/teams/team',
    '/myteam',
    '/equipos',
    '/api/equipos',
    '/robots.txt',
    '/cola/team',
    '/team-uno',
  ])('%s NO es interna', (p) => expect(esRutaInterna(p)).toBe(false));

  it('un porcentaje roto no revienta', () => {
    expect(() => esRutaInterna('/team%E0%A4%A')).not.toThrow();
    expect(esRutaInterna('/%E0%A4%A')).toBe(false);
    expect(esRutaInterna('/team/%E0%A4%A')).toBe(true);
  });
});

describe('normalizarRuta', () => {
  it('resuelve puntos, barras y mayusculas', () => {
    expect(normalizarRuta('//A/./b/../C/')).toBe('/a/c');
    expect(normalizarRuta('/')).toBe('/');
    expect(normalizarRuta('/../..')).toBe('/');
  });
});

describe('debeOcultar', () => {
  const publico = { MODO_PUBLICO: '1' };
  it('en modo publico oculta lo interno y deja pasar el resto', () => {
    expect(debeOcultar('/team', publico)).toBe(true);
    expect(debeOcultar('/team/contexto.md', publico)).toBe(true);
    expect(debeOcultar('/api/team/contexto', publico)).toBe(true);
    expect(debeOcultar('/equipo', publico)).toBe(true);
    expect(debeOcultar('/TEAM', publico)).toBe(true);
    expect(debeOcultar('/', publico)).toBe(false);
    expect(debeOcultar('/api/registro', publico)).toBe(false);
    expect(debeOcultar('/api/teamx', publico)).toBe(false);
    expect(debeOcultar('/teams', publico)).toBe(false);
  });
  it('sin la bandera no oculta nada', () => {
    expect(debeOcultar('/team', {})).toBe(false);
    expect(debeOcultar('/api/team/contexto', { MODO_PUBLICO: '0' })).toBe(false);
  });
});

describe('destinoLegado', () => {
  it('/equipo apunta a /team; lo demas, a nada', () => {
    expect(destinoLegado('/equipo')).toEqual({ destino: '/team', permanente: true });
    expect(destinoLegado('/equipo/contexto.md')).toEqual({ destino: '/team/contexto.md', permanente: true });
    expect(destinoLegado('/api/equipo/tareas')).toEqual({ destino: '/api/team/tareas', permanente: false });
    expect(destinoLegado('/team')).toBeNull();
    expect(destinoLegado('/equipos')).toBeNull();
  });
});

describe('limite de intentos', () => {
  const t0 = 1_000_000;
  it('bloquea al llegar al maximo de fallos y se libera pasados 15 minutos', () => {
    const s: Intentos = new Map();
    for (let i = 0; i < MAX_FALLOS - 1; i++) {
      registrarFallo(s, 'ip', t0 + i);
      expect(estadoBloqueo(s, 'ip', t0 + i).bloqueado).toBe(false);
    }
    registrarFallo(s, 'ip', t0 + 10);
    const b = estadoBloqueo(s, 'ip', t0 + 11);
    expect(b.bloqueado).toBe(true);
    expect(b.reintentarEnSeg).toBeGreaterThan(14 * 60);
    expect(estadoBloqueo(s, 'ip', t0 + 10 + BLOQUEO_MS - 1).bloqueado).toBe(true);
    expect(estadoBloqueo(s, 'ip', t0 + 10 + BLOQUEO_MS).bloqueado).toBe(false);
  });
  it('cada IP lleva su cuenta', () => {
    const s: Intentos = new Map();
    for (let i = 0; i < MAX_FALLOS; i++) registrarFallo(s, 'a', t0);
    expect(estadoBloqueo(s, 'a', t0).bloqueado).toBe(true);
    expect(estadoBloqueo(s, 'b', t0).bloqueado).toBe(false);
  });
  it('un acierto limpia la cuenta', () => {
    const s: Intentos = new Map();
    for (let i = 0; i < MAX_FALLOS - 1; i++) registrarFallo(s, 'a', t0);
    limpiarIntentos(s, 'a');
    registrarFallo(s, 'a', t0);
    expect(estadoBloqueo(s, 'a', t0).bloqueado).toBe(false);
  });
  it('tras un bloqueo vencido empieza de cero', () => {
    const s: Intentos = new Map();
    for (let i = 0; i < MAX_FALLOS; i++) registrarFallo(s, 'a', t0);
    const despues = t0 + BLOQUEO_MS + 5;
    registrarFallo(s, 'a', despues);
    expect(estadoBloqueo(s, 'a', despues).bloqueado).toBe(false);
    expect(s.get('a')?.fallos).toBe(1);
  });
});

describe('PIN largo', () => {
  const largo = 'x'.repeat(PIN_MIN);
  it('exige al menos PIN_MIN caracteres', () => {
    expect(PIN_MIN).toBe(16);
    expect(pinUsable(largo)).toBe(true);
    expect(pinUsable('x'.repeat(PIN_MIN - 1))).toBe(false);
    expect(pinUsable('')).toBe(false);
    expect(pinUsable(undefined)).toBe(false);
    expect(pinUsable(null)).toBe(false);
  });
  it('un PIN corto no autentica ni acertandolo; validarPin sigue igual', () => {
    expect(validarPinSeguro('123456', '123456')).toBe(false);
    expect(validarPin('123456', '123456')).toBe(true);
    expect(validarPinSeguro(largo, largo)).toBe(true);
    expect(validarPinSeguro(largo + 'y', largo)).toBe(false);
    expect(validarPinSeguro(undefined, largo)).toBe(false);
    expect(validarPinSeguro(largo, undefined)).toBe(false);
  });
});
