import { describe, expect, it, vi } from 'vitest';
import { debeOcultar, esRutaInterna } from '../src/publico';
import { llamarOpenRouter } from '../src/extraccion/openrouter';
import { MAX_BYTES, tipoPorFirma, validarBytes, validarReportado } from '../src/telegram/archivo';
import { PROVEEDOR_FIJO, configBotDesdeEnv, crearDepsReales } from '../src/telegram/deps';
import { SECRETO_MIN, manejarWebhook, secretoValido } from '../src/telegram/webhook';
import { AlmacenEnMemoria } from '../src/telegram/memoria';
import { EXE, JPG, PDF, PNG, crearDepsPrueba, mensajeTexto } from './telegram-ayudas';

const SECRETO = 'secreto-de-prueba-largo-1234567890';

function peticion(cuerpo: unknown, cabecera?: string | null) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (cabecera !== null && cabecera !== undefined) headers['x-telegram-bot-api-secret-token'] = cabecera;
  return new Request('https://pulso.example/api/telegram', { method: 'POST', headers, body: JSON.stringify(cuerpo) });
}

function montar(env: Record<string, string | undefined> = { TELEGRAM_WEBHOOK_SECRET: SECRETO }, deps = crearDepsPrueba()) {
  const tareas: (() => Promise<void>)[] = [];
  const crearDeps = vi.fn(() => deps);
  return { tareas, crearDeps, deps, opciones: { env, programar: (t: () => Promise<void>) => void tareas.push(t), crearDeps } };
}

describe('cabecera secreta del webhook', () => {
  it('cabecera incorrecta, vacia o ausente: 401 y no se programa ni se crea nada', async () => {
    for (const cab of ['otro-secreto', '', null, SECRETO + 'x', SECRETO.slice(0, -1)]) {
      const m = montar();
      const r = await manejarWebhook(peticion(mensajeTexto(1, '/start'), cab), m.opciones);
      expect(r.status, String(cab)).toBe(401);
      expect(m.tareas).toHaveLength(0);
      expect(m.crearDeps).not.toHaveBeenCalled();
    }
  });
  it('si el secreto NO esta configurado (o es muy corto) rechaza todo, incluso sin cabecera o con cabecera vacia', async () => {
    for (const secreto of [undefined, '', 'corto']) {
      for (const cab of [null, '', 'corto', 'undefined']) {
        const m = montar({ TELEGRAM_WEBHOOK_SECRET: secreto });
        const r = await manejarWebhook(peticion(mensajeTexto(1, '/start'), cab), m.opciones);
        expect(r.status).toBe(401);
        expect(m.tareas).toHaveLength(0);
      }
    }
  });
  it('secretoValido compara en tiempo constante (hash + timingSafeEqual) y exige largo minimo', () => {
    expect(secretoValido(SECRETO, SECRETO)).toBe(true);
    expect(secretoValido(SECRETO.toUpperCase(), SECRETO)).toBe(false);
    expect(secretoValido(null, SECRETO)).toBe(false);
    expect(secretoValido('a'.repeat(SECRETO_MIN - 1), 'a'.repeat(SECRETO_MIN - 1))).toBe(false);
  });
  it('cabecera correcta: responde 200 enseguida y deja el trabajo para despues (after)', async () => {
    const m = montar();
    const r = await manejarWebhook(peticion(mensajeTexto(1, '/start'), SECRETO), m.opciones);
    expect(r.status).toBe(200);
    expect(m.tareas).toHaveLength(1);
    // Aun no se proceso nada: el envio ocurre al correr la tarea programada.
    expect(m.deps.telegram.enviados).toHaveLength(0);
    await m.tareas[0]!();
    expect(m.deps.telegram.enviados).toHaveLength(1);
  });
  it('cuerpo que no es un update: 400; sin estado (Supabase sin configurar): 503 y no se procesa', async () => {
    const m = montar();
    expect((await manejarWebhook(peticion({ hola: 1 }, SECRETO), m.opciones)).status).toBe(400);
    expect((await manejarWebhook(new Request('https://x/api/telegram', { method: 'POST', headers: { 'x-telegram-bot-api-secret-token': SECRETO }, body: 'no json' }), m.opciones)).status).toBe(400);
    const sinEstado = { env: { TELEGRAM_WEBHOOK_SECRET: SECRETO }, programar: vi.fn(), crearDeps: () => null };
    expect((await manejarWebhook(peticion(mensajeTexto(1, '/start'), SECRETO), sinEstado)).status).toBe(503);
    expect(sinEstado.programar).not.toHaveBeenCalled();
  });
  it('el webhook y el modo local comparten el manejador: crearDepsReales sin base ni token devuelve null (falla cerrada)', () => {
    expect(crearDepsReales({})).toBeNull();
    expect(crearDepsReales({ TELEGRAM_BOT_TOKEN: 'x' })).toBeNull(); // token pero sin Supabase
    expect(crearDepsReales({ TELEGRAM_BOT_TOKEN: 'x' }, { almacen: new AlmacenEnMemoria() })).not.toBeNull();
  });
});

describe('modo publico', () => {
  it('/api/telegram no es ruta interna: MODO_PUBLICO no la oculta con 404', () => {
    for (const ruta of ['/api/telegram', '/api/telegram/', '/API/Telegram']) {
      expect(esRutaInterna(ruta), ruta).toBe(false);
      expect(debeOcultar(ruta, { MODO_PUBLICO: '1' }), ruta).toBe(false);
    }
  });
  it('y no queda expuesta: sin el secreto el propio manejador la cierra, tambien en modo publico', async () => {
    const m = montar({ MODO_PUBLICO: '1' });
    const r = await manejarWebhook(peticion(mensajeTexto(1, '/start'), 'cualquiera'), m.opciones);
    expect(r.status).toBe(401);
  });
});

describe('INSERT atomico del update_id', () => {
  it('registrarUpdate concurrente: solo una llamada recibe true', async () => {
    const a = new AlmacenEnMemoria();
    const r = await Promise.all([a.registrarUpdate(42), a.registrarUpdate(42), a.registrarUpdate(42)]);
    expect(r.filter(Boolean)).toHaveLength(1);
  });
});

describe('archivos: firmas y topes', () => {
  it('la firma decide el tipo, no el nombre', () => {
    expect(tipoPorFirma(PDF)).toBe('pdf');
    expect(tipoPorFirma(JPG)).toBe('jpg');
    expect(tipoPorFirma(PNG)).toBe('png');
    expect(tipoPorFirma(EXE)).toBeNull();
    expect(tipoPorFirma(new Uint8Array())).toBeNull();
  });
  it('validarReportado: tamano y mime; validarBytes: tamano real y firma', () => {
    expect(validarReportado(MAX_BYTES, 'application/pdf').ok).toBe(true);
    expect(validarReportado(MAX_BYTES + 1, 'application/pdf')).toEqual({ ok: false, motivo: 'GRANDE' });
    expect(validarReportado(10, 'image/gif')).toEqual({ ok: false, motivo: 'TIPO' });
    expect(validarBytes(new Uint8Array(MAX_BYTES + 1))).toEqual({ ok: false, motivo: 'GRANDE' });
    expect(validarBytes(new Uint8Array())).toEqual({ ok: false, motivo: 'VACIO' });
  });
});

describe('configuracion y OpenRouter', () => {
  it('tope diario por defecto 100 y solo acepta enteros positivos; la URL publica pierde la barra final', () => {
    expect(configBotDesdeEnv({}).topeDiario).toBe(100);
    expect(configBotDesdeEnv({ TELEGRAM_TOPE_DIARIO: '25' }).topeDiario).toBe(25);
    expect(configBotDesdeEnv({ TELEGRAM_TOPE_DIARIO: '-3' }).topeDiario).toBe(100);
    expect(configBotDesdeEnv({ TELEGRAM_TOPE_DIARIO: 'mucho' }).topeDiario).toBe(100);
    expect(configBotDesdeEnv({ PULSO_URL_PUBLICA: 'https://p.example///' }).urlPublica).toBe('https://p.example');
    expect(configBotDesdeEnv({ TELEGRAM_DUENO_ID: '123' }).duenoId).toBe(123);
    expect(configBotDesdeEnv({}).duenoId).toBeNull();
  });
  it('el cliente manda provider {allow_fallbacks:false, data_collection:deny} solo si se pide; sin pedirlo el cuerpo es el de siempre', async () => {
    const cuerpos: Record<string, unknown>[] = [];
    const fetchImpl = (async (_u: unknown, init: { body: string }) => {
      cuerpos.push(JSON.parse(init.body));
      return new Response(JSON.stringify({ model: 'm', choices: [{ message: { content: '{}' } }], usage: {} }), { status: 200 });
    }) as unknown as typeof fetch;
    const p = { modelo: 'm', sistema: 's', texto: 't' };
    await llamarOpenRouter(p, { apiKey: 'k-falsa', fetchImpl });
    await llamarOpenRouter({ ...p, proveedor: PROVEEDOR_FIJO }, { apiKey: 'k-falsa', fetchImpl });
    expect('provider' in cuerpos[0]!).toBe(false);
    expect(cuerpos[1]!['provider']).toEqual({ allow_fallbacks: false, data_collection: 'deny' });
  });
});
