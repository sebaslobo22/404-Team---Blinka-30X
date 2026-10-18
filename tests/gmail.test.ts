import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { POST } from '../app/api/canal/gmail/route';
import { crearEstado } from '../src/demo/estado';
import type { EstadoDemo } from '../src/demo/estado';
import { canalGmailActivo, claveRemitente, MAX_BYTES_GMAIL, secretoValido, textoParaCorreo } from '../src/vivo/gmail';
import { leerYDecidir } from '../src/vivo/leer-y-decidir';
import type { PeticionLLM, RespuestaLLM } from '../src/extraccion/openrouter';

const SECRETO = 'secreto-de-prueba-con-mas-de-24-caracteres';

describe('secreto del canal', () => {
  it('acepta solo el Bearer exacto y rechaza todo sin secreto suficiente', () => {
    expect(secretoValido(`Bearer ${SECRETO}`, SECRETO)).toBe(true);
    expect(secretoValido(`Bearer ${SECRETO}x`, SECRETO)).toBe(false);
    expect(secretoValido(SECRETO, SECRETO)).toBe(false);
    expect(secretoValido(null, SECRETO)).toBe(false);
    expect(secretoValido('Bearer corto', 'corto')).toBe(false);
    expect(secretoValido('Bearer ', undefined)).toBe(false);
  });
  it('el canal se activa solo con secreto largo y clave de OpenRouter', () => {
    expect(canalGmailActivo({ GMAIL_CANAL_SECRETO: SECRETO })).toBe(false);
    expect(canalGmailActivo({ GMAIL_CANAL_SECRETO: 'corto', OPENROUTER_API_KEY: 'x' })).toBe(false);
    expect(canalGmailActivo({ GMAIL_CANAL_SECRETO: SECRETO, OPENROUTER_API_KEY: 'x' })).toBe(true);
  });
  it('el límite por remitente usa un resumen del correo, no el correo', () => {
    const a = claveRemitente('Ana Pérez <Ana@Ejemplo.com>');
    expect(a).toBe(claveRemitente('ana@ejemplo.com'));
    expect(a).not.toContain('ejemplo');
  });
});

describe('ruta /api/canal/gmail: rechazos antes de leer (sin red)', () => {
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; });
  const peticion = (cuerpo: BodyInit | null, auth?: string, extra: Record<string, string> = {}) =>
    new Request('http://localhost/api/canal/gmail', { method: 'POST', body: cuerpo, headers: { ...(auth ? { authorization: auth } : {}), ...extra } });
  const conArchivo = (bytes: Uint8Array) => { const f = new FormData(); f.append('factura', new Blob([bytes as Uint8Array<ArrayBuffer>]), 'factura'); f.append('remitente', 'ana@ejemplo.com'); return f; };

  it('apagado sin secreto: 503', async () => {
    delete process.env['GMAIL_CANAL_SECRETO'];
    expect((await POST(peticion(conArchivo(new Uint8Array([1]))))).status).toBe(503);
  });
  it('secreto equivocado: 401', async () => {
    process.env['GMAIL_CANAL_SECRETO'] = SECRETO; process.env['OPENROUTER_API_KEY'] = 'x';
    expect((await POST(peticion(conArchivo(new Uint8Array([1])), 'Bearer otro-secreto-cualquiera-de-24-caracteres'))).status).toBe(401);
  });
  it('más de 3 MB: 413 con aviso para responder', async () => {
    process.env['GMAIL_CANAL_SECRETO'] = SECRETO; process.env['OPENROUTER_API_KEY'] = 'x';
    const grande = new Uint8Array(MAX_BYTES_GMAIL + 1); grande.set([0xff, 0xd8, 0xff]);
    const r = await POST(peticion(conArchivo(grande), `Bearer ${SECRETO}`));
    expect(r.status).toBe(413);
    expect((await r.json()).texto).toMatch(/3 MB/);
  });
  it('tipo no admitido o sin adjunto: aviso para responder, sin gastar lecturas', async () => {
    process.env['GMAIL_CANAL_SECRETO'] = SECRETO; process.env['OPENROUTER_API_KEY'] = 'x';
    const r = await POST(peticion(conArchivo(new TextEncoder().encode('GIF89a...')), `Bearer ${SECRETO}`));
    expect(r.status).toBe(415);
    expect((await r.json()).texto).toMatch(/JPG o PNG/);
    const sin = new FormData(); sin.append('remitente', 'ana@ejemplo.com');
    expect((await POST(peticion(sin, `Bearer ${SECRETO}`))).status).toBe(400);
  });
});

describe('texto de la respuesta por correo', () => {
  let estado: EstadoDemo;
  beforeAll(async () => { estado = await crearEstado(); });
  it('dice la decisión con el techo, sus razones y el aviso de privacidad; nunca promete un pago', async () => {
    const pago = estado.filas.find((f) => f.resultado.decision === 'PAGAR')!.factura;
    const monto = ((pago.monto_centavos as number) * 0.99 / 100).toFixed(2);
    const datos = { beneficiario: pago.beneficiario, id_fiscal: pago.id_fiscal, cuenta: pago.cuenta, monto, moneda: pago.moneda, moneda_explicita: true, fecha: estado.ahora.slice(0, 10), fecha_vencimiento: null, numero_factura: 'MAIL-1', categoria: pago.categoria, confianza: 0.99, instrucciones_detectadas: false };
    const texto = `FACTURA MAIL-1\n${pago.beneficiario}\n${pago.id_fiscal}\n${pago.cuenta}\nTotal ${pago.moneda} ${monto}`;
    const llamar = async (p: PeticionLLM): Promise<RespuestaLLM> => ({ contenido: JSON.stringify(datos), modelo_servido: p.modelo, tokens_entrada: 1, tokens_salida: 1, costo_usd: 0, ms: 1, intentos: 1 });
    const vivo = await leerYDecidir({ texto }, estado, { llamar });
    const correo = textoParaCorreo(vivo, 'https://pulso.ejemplo');
    expect(vivo.resultado.decision).not.toBe('PAGAR');
    expect(correo).toMatch(/Decisión de Pulso: (ESCALAR|FRENAR)/);
    expect(correo).toMatch(/OpenRouter/);
    expect(correo).toMatch(/como máximo termina en ESCALAR/);
    expect(correo).toContain(vivo.id);
    expect(correo).not.toMatch(/Decisión de Pulso: PAGAR/);
  });
});

describe('script de Apps Script (funciones puras, fuera de Google)', () => {
  const ctx = createContext({});
  beforeAll(() => { runInContext(readFileSync('integraciones/gmail/Codigo.gs', 'utf8'), ctx); });
  const llamar = (f: string, ...args: unknown[]) => (ctx[f] as (...a: unknown[]) => unknown)(...args);
  const TIPOS = ['application/pdf', 'image/jpeg', 'image/png'];
  const MAX = 3 * 1024 * 1024;

  it('elige el primer adjunto aceptado dentro del tope', () => {
    expect(llamar('elegirAdjunto', [{ tipo: 'text/plain', tamano: 10 }, { tipo: 'application/pdf', tamano: 2000 }], TIPOS, MAX)).toMatchObject({ indice: 1 });
    expect(llamar('elegirAdjunto', [{ tipo: 'image/JPEG; name=x.jpg', tamano: 10 }], TIPOS, MAX)).toMatchObject({ indice: 0 });
  });
  it('avisa si no hay adjunto aceptado o si pesa más de 3 MB', () => {
    expect(llamar('elegirAdjunto', [], TIPOS, MAX)).toMatchObject({ indice: -1, aviso: expect.stringMatching(/No encontré/) });
    expect(llamar('elegirAdjunto', [{ tipo: 'application/pdf', tamano: MAX + 1 }], TIPOS, MAX)).toMatchObject({ indice: -1, aviso: expect.stringMatching(/3 MB/) });
  });
  it('responde lo que el servidor manda; reintenta fallas hasta 3 veces y luego marca error', () => {
    expect(llamar('accionPorRespuesta', 200, true, 1, 3)).toBe('RESPONDER');
    for (const c of [400, 413, 415, 429]) expect(llamar('accionPorRespuesta', c, true, 1, 3)).toBe('RESPONDER');
    for (const c of [0, 401, 500, 503]) expect(llamar('accionPorRespuesta', c, false, 1, 3)).toBe('REINTENTAR');
    expect(llamar('accionPorRespuesta', 200, false, 2, 3)).toBe('REINTENTAR');
    expect(llamar('accionPorRespuesta', 500, false, 3, 3)).toBe('ERROR');
  });
  it('toma el último mensaje que no escribió el buzón', () => {
    expect(llamar('mensajeAjeno', ['Ana <ana@x.com>', 'Pulso <pulso@gmail.com>'], 'pulso@gmail.com')).toBe(0);
    expect(llamar('mensajeAjeno', ['pulso@gmail.com'], 'pulso@gmail.com')).toBe(-1);
  });
  it('ignora remitentes automáticos para no responderles ni gastar lecturas', () => {
    for (const r of ['Google <no-reply@accounts.google.com>', 'noreply@banco.com', 'Mail Delivery Subsystem <mailer-daemon@googlemail.com>', 'notifications@github.com'])
      expect(llamar('esRemitenteAutomatico', r), r).toBe(true);
    expect(llamar('esRemitenteAutomatico', 'Ana Pérez <ana@ejemplo.com>')).toBe(false);
  });
  it('responde al mensaje con la factura (no al último del hilo) y etiqueta antes de responder', () => {
    const fuente = readFileSync('integraciones/gmail/Codigo.gs', 'utf8');
    expect(fuente).not.toContain('hilo.reply');
    expect(fuente.indexOf('hilo.addLabel(lista);\n    props.deleteProperty(clave);\n    responder_(')).toBeGreaterThan(0);
  });
  it('el script no trae el secreto escrito', () => {
    expect(readFileSync('integraciones/gmail/Codigo.gs', 'utf8')).not.toMatch(/PULSO_SECRETO\s*=\s*['"]/);
  });
});
