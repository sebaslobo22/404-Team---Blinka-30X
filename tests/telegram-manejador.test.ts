import { describe, expect, it } from 'vitest';
import { ID_DEMO } from '../src/telegram/empresas';
import { ErrorLLM } from '../src/extraccion/openrouter';
import { MAX_BYTES } from '../src/telegram/archivo';
import { manejarUpdate } from '../src/telegram/manejador';
import { DUENO, EXE, JPG, JURADO, PDF, PNG, callback, crearDepsPrueba, extractorCon, lecturaClon, llamarFalso, mensajeArchivo, mensajeTexto } from './telegram-ayudas';

const MONTO_ALTO = lecturaClon({ monto: '99999999.00' }); // el motor da FRENAR

async function iniciado(opciones: Parameters<typeof crearDepsPrueba>[0] = {}) {
  const d = crearDepsPrueba(opciones);
  await manejarUpdate(mensajeTexto(JURADO, '/start'), d);
  d.telegram.enviados.length = 0;
  return d;
}

describe('/start', () => {
  it('explica Pulso, que son datos de prueba y que la factura va a Gemini y Claude por OpenRouter', async () => {
    const d = crearDepsPrueba();
    await manejarUpdate(mensajeTexto(JURADO, '/start'), d);
    const t = d.telegram.a(JURADO).join('\n');
    expect(t).toMatch(/Pulso/);
    expect(t).toMatch(/prueba/i);
    expect(t).toMatch(/Gemini/);
    expect(t).toMatch(/Claude/);
    expect(t).toMatch(/OpenRouter/);
    expect(await d.almacen.chatIniciado(JURADO)).toBe(true);
  });
  it('sin /start previo no procesa archivos: pide /start y no descarga ni lee nada', async () => {
    const d = crearDepsPrueba();
    d.telegram.archivos.set('a', { bytes: PNG });
    await manejarUpdate(mensajeArchivo(JURADO, 'a', { foto: true }), d);
    expect(d.telegram.a(JURADO)[0]).toContain('/start');
    expect(d.telegram.descargas).toBe(0);
    expect(d.almacen.facturas.size).toBe(0);
  });
});

describe('update_id repetido', () => {
  it('el segundo update con el mismo id se descarta sin responder', async () => {
    const d = crearDepsPrueba();
    await manejarUpdate(mensajeTexto(JURADO, '/start', { update: 5 }), d);
    expect(d.telegram.enviados).toHaveLength(1);
    await manejarUpdate(mensajeTexto(JURADO, '/start', { update: 5 }), d);
    expect(d.telegram.enviados).toHaveLength(1);
  });
  it('dos entregas simultaneas del mismo update procesan una sola vez', async () => {
    const d = crearDepsPrueba();
    d.telegram.archivos.set('a', { bytes: PNG });
    await manejarUpdate(mensajeTexto(JURADO, '/start'), d);
    const u = mensajeArchivo(JURADO, 'a', { foto: true, update: 9001 });
    await Promise.all([manejarUpdate(u, d), manejarUpdate(u, d), manejarUpdate(u, d)]);
    expect(d.almacen.facturas.size).toBe(1);
  });
});

describe('limites', () => {
  it('5 facturas por chat y hora: la 6a se rechaza sin leerla ni gastar OpenRouter', async () => {
    const llamadas = llamarFalso();
    const d = await iniciado({ extraer: extractorCon(llamadas.llamar) });
    d.telegram.archivos.set('a', { bytes: PNG });
    for (let i = 0; i < 6; i++) await manejarUpdate(mensajeArchivo(JURADO, 'a', { foto: true }), d);
    expect(d.almacen.facturas.size).toBe(5);
    expect(llamadas.peticiones).toHaveLength(10); // 5 facturas x 2 modelos
    expect(d.telegram.ultimo(JURADO)!.texto).toMatch(/límite de 5 facturas por hora/);
  });
  it('otro chat no queda bloqueado por el limite del primero', async () => {
    const d = await iniciado();
    await manejarUpdate(mensajeTexto(222, '/start'), d);
    d.telegram.archivos.set('a', { bytes: PNG });
    for (let i = 0; i < 6; i++) await manejarUpdate(mensajeArchivo(JURADO, 'a', { foto: true }), d);
    await manejarUpdate(mensajeArchivo(222, 'a', { foto: true }), d);
    expect([...d.almacen.facturas.values()].filter((f) => f.chat_id === 222)).toHaveLength(1);
  });
  it('pasada una hora vuelve a haber cupo', async () => {
    let ahora = new Date('2026-10-17T15:00:00Z');
    const d = await iniciado({ ahora: () => ahora });
    d.telegram.archivos.set('a', { bytes: PNG });
    for (let i = 0; i < 5; i++) await manejarUpdate(mensajeArchivo(JURADO, 'a', { foto: true }), d);
    ahora = new Date('2026-10-17T16:01:00Z');
    await manejarUpdate(mensajeArchivo(JURADO, 'a', { foto: true }), d);
    expect(d.almacen.facturas.size).toBe(6);
  });
  it('tope global diario: al llegar, ningun chat pasa', async () => {
    const d = await iniciado({ config: { topeDiario: 3 } });
    for (const c of [222, 333, 444]) await manejarUpdate(mensajeTexto(c, '/start'), d);
    d.telegram.archivos.set('a', { bytes: PNG });
    for (const c of [JURADO, 222, 333, 444]) await manejarUpdate(mensajeArchivo(c, 'a', { foto: true }), d);
    expect(d.almacen.facturas.size).toBe(3);
    expect(d.telegram.ultimo(444)!.texto).toMatch(/tope/);
  });
  it('un rechazo por tipo o tamano NO gasta cupo', async () => {
    const d = await iniciado();
    d.telegram.archivos.set('exe', { bytes: EXE });
    for (let i = 0; i < 8; i++) await manejarUpdate(mensajeArchivo(JURADO, 'exe', { mime: 'application/x-msdownload' }), d);
    d.telegram.archivos.set('a', { bytes: PNG });
    await manejarUpdate(mensajeArchivo(JURADO, 'a', { foto: true }), d);
    expect(d.almacen.facturas.size).toBe(1);
  });
});

describe('archivos', () => {
  it('mayor de 4 MB segun Telegram: se rechaza antes de descargar', async () => {
    const d = await iniciado();
    d.telegram.archivos.set('grande', { bytes: PDF });
    await manejarUpdate(mensajeArchivo(JURADO, 'grande', { tamano: MAX_BYTES + 1 }), d);
    expect(d.telegram.descargas).toBe(0);
    expect(d.telegram.ultimo(JURADO)!.texto).toMatch(/4 MB/);
    expect(d.almacen.facturas.size).toBe(0);
  });
  it('Telegram no informa tamano pero al descargar pesa mas de 4 MB: se rechaza', async () => {
    const d = await iniciado();
    const enorme = new Uint8Array(MAX_BYTES + 10);
    enorme.set(PDF);
    d.telegram.archivos.set('enorme', { bytes: enorme, tamanoReportado: null });
    await manejarUpdate(mensajeArchivo(JURADO, 'enorme'), d);
    expect(d.telegram.ultimo(JURADO)!.texto).toMatch(/4 MB/);
    expect(d.almacen.facturas.size).toBe(0);
  });
  it('tipo no permitido segun Telegram (zip, exe): se rechaza antes de descargar', async () => {
    const d = await iniciado();
    d.telegram.archivos.set('z', { bytes: EXE });
    await manejarUpdate(mensajeArchivo(JURADO, 'z', { mime: 'application/zip' }), d);
    expect(d.telegram.descargas).toBe(0);
    expect(d.telegram.ultimo(JURADO)!.texto).toMatch(/JPG, PNG o PDF/);
  });
  it('un ejecutable disfrazado de PDF (mime y nombre dicen PDF) se rechaza por la firma de bytes', async () => {
    const llamadas = llamarFalso();
    const d = await iniciado({ extraer: extractorCon(llamadas.llamar) });
    d.telegram.archivos.set('falso.pdf', { bytes: EXE });
    await manejarUpdate(mensajeArchivo(JURADO, 'falso.pdf', { mime: 'application/pdf' }), d);
    expect(llamadas.peticiones).toHaveLength(0);
    expect(d.telegram.ultimo(JURADO)!.texto).toMatch(/JPG, PNG o PDF/);
    expect(d.almacen.facturas.size).toBe(0);
  });
  it('acepta JPG, PNG y PDF validos por firma', async () => {
    const d = await iniciado();
    d.telegram.archivos.set('j', { bytes: JPG });
    d.telegram.archivos.set('p', { bytes: PNG });
    await manejarUpdate(mensajeArchivo(JURADO, 'j', { foto: true }), d);
    await manejarUpdate(mensajeArchivo(JURADO, 'p', { mime: 'image/png' }), d);
    expect(d.almacen.facturas.size).toBe(2);
  });
});

describe('fallas del lector: nunca PAGAR', () => {
  it('OpenRouter falla: responde "no pude leerla" y no guarda ninguna decision', async () => {
    const d = await iniciado({ extraer: extractorCon(llamarFalso({ falla: true }).llamar) });
    d.telegram.archivos.set('a', { bytes: PNG });
    await manejarUpdate(mensajeArchivo(JURADO, 'a', { foto: true }), d);
    expect(d.telegram.ultimo(JURADO)!.texto).toMatch(/No pude leer/);
    expect(d.almacen.facturas.size).toBe(0);
    expect(d.telegram.a(JURADO).join('\n')).not.toMatch(/Decisión de Pulso: PAGAR/);
  });
  it('OpenRouter lanza un error raro o tarda mas del limite: "no pude leerla"', async () => {
    const d = await iniciado({
      config: { limiteLecturaMs: 30 },
      extraer: () => new Promise(() => undefined), // nunca responde
    });
    d.telegram.archivos.set('a', { bytes: PNG });
    await manejarUpdate(mensajeArchivo(JURADO, 'a', { foto: true }), d);
    expect(d.telegram.ultimo(JURADO)!.texto).toMatch(/No pude leer/);
    const e = await iniciado({ extraer: extractorCon(llamarFalso({ lanza: new ErrorLLM('timeout') }).llamar) });
    e.telegram.archivos.set('a', { bytes: PNG });
    await manejarUpdate(mensajeArchivo(JURADO, 'a', { foto: true }), e);
    expect(e.almacen.facturas.size).toBe(0);
  });
  it('las dos lecturas no coinciden: queda en ESCALAR (o frenada), nunca PAGAR, y dice en que difieren', async () => {
    const d = await iniciado({ extraer: extractorCon(llamarFalso({ lectura: lecturaClon(), lecturaB: lecturaClon({ monto: '600.00' }) }).llamar) });
    d.telegram.archivos.set('a', { bytes: PNG });
    await manejarUpdate(mensajeArchivo(JURADO, 'a', { foto: true }), d);
    const f = [...d.almacen.facturas.values()][0]!;
    expect(f.decision).not.toBe('PAGAR');
    expect(f.decision).toBe('ESCALAR');
    expect(d.telegram.a(JURADO).join('\n')).toMatch(/no coincidieron en: monto/);
  });
  it('un modelo distinto al pedido (modelo servido != pedido) fuerza ESCALAR', async () => {
    const d = await iniciado({ extraer: extractorCon(llamarFalso({ servido: (m) => (m.startsWith('google') ? 'otro/modelo-barato' : m) }).llamar) });
    d.telegram.archivos.set('a', { bytes: PNG });
    await manejarUpdate(mensajeArchivo(JURADO, 'a', { foto: true }), d);
    const f = [...d.almacen.facturas.values()][0]!;
    expect(f.decision).toBe('ESCALAR');
    expect(f.razones.some((r) => r.regla === 'EXTRACCION')).toBe(true);
  });
  it('modelo servido ausente tampoco se acepta como el pedido', async () => {
    const d = await iniciado({ extraer: extractorCon(llamarFalso({ servido: () => null }).llamar) });
    d.telegram.archivos.set('a', { bytes: PNG });
    await manejarUpdate(mensajeArchivo(JURADO, 'a', { foto: true }), d);
    expect([...d.almacen.facturas.values()][0]!.decision).toBe('ESCALAR');
  });
  it('se piden exactamente los dos modelos fijos (Claude Haiku 5.5 y Gemini 3.1 Flash-Lite)', async () => {
    const llamadas = llamarFalso();
    const d = await iniciado({ extraer: extractorCon(llamadas.llamar) });
    d.telegram.archivos.set('a', { bytes: PNG });
    await manejarUpdate(mensajeArchivo(JURADO, 'a', { foto: true }), d);
    expect(llamadas.peticiones.map((p) => p.modelo).sort()).toEqual(['anthropic/claude-haiku-5.5', 'google/gemini-3.1-flash-lite']);
  });
});

describe('falla cerrada: sin estado no se procesa', () => {
  it('si el almacen esta caido no se lee ninguna factura y se avisa que no hay servicio', async () => {
    const llamadas = llamarFalso();
    const d = await iniciado({ extraer: extractorCon(llamadas.llamar) });
    d.telegram.archivos.set('a', { bytes: PNG });
    d.almacen.caido = true;
    await manejarUpdate(mensajeArchivo(JURADO, 'a', { foto: true }), d);
    expect(llamadas.peticiones).toHaveLength(0);
    expect(d.telegram.ultimo(JURADO)!.texto).toMatch(/no está disponible/);
  });
  it('un callback con el almacen caido no aprueba nada', async () => {
    const d = await iniciado();
    const id = await d.almacen.guardarFactura({ chat_id: JURADO, empresa_id: ID_DEMO, update_id: 1, decision: 'ESCALAR', decision_motor: 'ESCALAR', razones: [], resumen: { beneficiario: null, numero_factura: null, monto_centavos: null, moneda: null }, estado_resolucion: 'PENDIENTE' });
    d.almacen.caido = true;
    await manejarUpdate(callback(`a:${id}`), d);
    d.almacen.caido = false;
    expect((await d.almacen.obtenerFactura(id))!.estado_resolucion).toBe('PENDIENTE');
  });
});

describe('aprobacion por chat', () => {
  async function conFactura(decision: 'ESCALAR' | 'FRENAR', lectura = lecturaClon()) {
    const d = await iniciado({ extraer: extractorCon(llamarFalso({ lectura }).llamar) });
    d.telegram.archivos.set('a', { bytes: PNG });
    await manejarUpdate(mensajeArchivo(JURADO, 'a', { foto: true }), d);
    const f = [...d.almacen.facturas.values()][0]!;
    expect(f.decision).toBe(decision);
    return { d, f };
  }

  it('FRENAR nunca trae botones y un callback forjado sobre una FRENAR no la aprueba', async () => {
    const { d, f } = await conFactura('FRENAR', MONTO_ALTO);
    expect(f.estado_resolucion).toBe('NO_APLICA');
    expect(d.telegram.enviados.every((e) => !e.botones)).toBe(true);
    expect(d.telegram.a(DUENO)).toHaveLength(0);
    await manejarUpdate(callback(`a:${f.id}`), d); // el dueno, con un id real de una FRENAR
    expect(d.telegram.callbacks.at(-1)!.texto).toMatch(/frenada/);
    expect((await d.almacen.obtenerFactura(f.id))!.estado_resolucion).toBe('NO_APLICA');
  });

  it('usuario no autorizado: no puede aprobar ni rechazar', async () => {
    const { d, f } = await conFactura('ESCALAR');
    await manejarUpdate(callback(`a:${f.id}`, { desde: 999 }), d);
    expect(d.telegram.callbacks.at(-1)!.texto).toMatch(/No estás autorizado/);
    await manejarUpdate(callback(`r:${f.id}`, { desde: JURADO }), d); // ni siquiera quien envio la factura
    expect(d.telegram.callbacks.at(-1)!.texto).toMatch(/No estás autorizado/);
    expect((await d.almacen.obtenerFactura(f.id))!.estado_resolucion).toBe('PENDIENTE');
  });

  it('sin TELEGRAM_DUENO_ID configurado nadie aprueba', async () => {
    const { d, f } = await conFactura('ESCALAR');
    const sin = { ...d, config: { ...d.config, duenoId: null } };
    await manejarUpdate(callback(`a:${f.id}`), sin);
    expect((await d.almacen.obtenerFactura(f.id))!.estado_resolucion).toBe('PENDIENTE');
  });

  it('desde un grupo (chat no privado) no se aprueba, ni el dueno', async () => {
    const { d, f } = await conFactura('ESCALAR');
    await manejarUpdate(callback(`a:${f.id}`, { chat: -100123, tipo: 'supergroup' }), d);
    expect(d.telegram.callbacks.at(-1)!.texto).toMatch(/chat privado/);
    expect((await d.almacen.obtenerFactura(f.id))!.estado_resolucion).toBe('PENDIENTE');
  });

  it('en un grupo el bot no ofrece botones', async () => {
    const d = crearDepsPrueba();
    d.telegram.archivos.set('a', { bytes: PNG });
    await manejarUpdate(mensajeTexto(-500, '/start', { tipo: 'group', desde: DUENO }), d);
    await manejarUpdate(mensajeArchivo(-500, 'a', { tipo: 'group', desde: DUENO, foto: true }), d);
    expect(d.telegram.enviados.filter((e) => e.chat === -500).every((e) => !e.botones)).toBe(true);
  });

  it('aprobar dos veces: la segunda se rechaza por ya resuelta', async () => {
    const { d, f } = await conFactura('ESCALAR');
    await manejarUpdate(callback(`a:${f.id}`), d);
    await manejarUpdate(callback(`r:${f.id}`), d);
    expect(d.telegram.callbacks.at(-1)!.texto).toMatch(/ya fue resuelta/);
    expect((await d.almacen.obtenerFactura(f.id))!.estado_resolucion).toBe('APROBADA');
  });

  it('dos clics simultaneos: gana uno solo (UPDATE condicional)', async () => {
    const { d, f } = await conFactura('ESCALAR');
    await Promise.all([manejarUpdate(callback(`a:${f.id}`), d), manejarUpdate(callback(`r:${f.id}`), d)]);
    const estado = (await d.almacen.obtenerFactura(f.id))!.estado_resolucion;
    expect(['APROBADA', 'RECHAZADA']).toContain(estado);
    expect(d.telegram.callbacks.filter((c) => /ya fue resuelta/.test(c.texto))).toHaveLength(1);
    expect(d.telegram.botonesQuitados).toHaveLength(1);
  });

  it('rechazar deja RECHAZADA, y una factura que no existe o un dato mal formado se rechaza', async () => {
    const { d, f } = await conFactura('ESCALAR');
    await manejarUpdate(callback('a:00000000-0000-4000-8000-000000000000'), d);
    expect(d.telegram.callbacks.at(-1)!.texto).toMatch(/no existe/);
    await manejarUpdate(callback('a:no-es-un-id'), d);
    expect(d.telegram.callbacks.at(-1)!.texto).toMatch(/no válida/);
    await manejarUpdate(callback(`r:${f.id}`), d);
    expect((await d.almacen.obtenerFactura(f.id))!.estado_resolucion).toBe('RECHAZADA');
  });

  it('si el dueno nunca abrio el bot, la factura queda pendiente y el jurado igual recibe su respuesta', async () => {
    const d = await iniciado();
    d.telegram.chatsCaidos.add(DUENO);
    d.telegram.archivos.set('a', { bytes: PNG });
    await manejarUpdate(mensajeArchivo(JURADO, 'a', { foto: true }), d);
    expect(d.telegram.a(JURADO).join('\n')).toContain('Decisión de Pulso: ESCALAR');
    expect([...d.almacen.facturas.values()][0]!.estado_resolucion).toBe('PENDIENTE');
  });

  it('cuando el dueno es quien envia desde su chat privado, ve los botones ahi mismo', async () => {
    const d = crearDepsPrueba();
    d.telegram.archivos.set('a', { bytes: PNG });
    await manejarUpdate(mensajeTexto(DUENO, '/start'), d);
    await manejarUpdate(mensajeArchivo(DUENO, 'a', { foto: true }), d);
    expect(d.telegram.ultimo(DUENO)!.botones).toHaveLength(2);
  });
});
