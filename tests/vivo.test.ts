import { beforeAll, describe, expect, it } from 'vitest';
import { crearEstado, resolver } from '../src/demo/estado';
import type { EstadoDemo } from '../src/demo/estado';
import { decidir } from '../src/engine/decide';
import type { FacturaExtraida } from '../src/engine/types';
import type { PeticionLLM, RespuestaLLM } from '../src/extraccion/openrouter';
import { ErrorLLM } from '../src/extraccion/openrouter';
import { lecturaEnVivoActiva } from '../src/vivo/activa';
import { entradaDesdeBytes, MAX_BYTES } from '../src/vivo/entrada';
import { contextoDeLaDemo, leerYDecidir, modeloEsElPedido } from '../src/vivo/leer-y-decidir';
import { Limitador } from '../src/vivo/limite';
import { aplicarTechoEnVivo, REGLA_EN_VIVO } from '../src/telegram/techo';

let estado: EstadoDemo;
beforeAll(async () => { estado = await crearEstado(); });

/** Respuesta simulada de OpenRouter: devuelve `datos` como JSON y el modelo servido indicado. */
function simulador(datos: Record<string, unknown>, servido?: (pedido: string) => string | null) {
  const llamadas: PeticionLLM[] = [];
  const llamar = async (p: PeticionLLM): Promise<RespuestaLLM> => {
    llamadas.push(p);
    return { contenido: JSON.stringify(datos), modelo_servido: servido ? servido(p.modelo) : p.modelo, tokens_entrada: 100, tokens_salida: 50, costo_usd: 0.0005, ms: 10, intentos: 1 };
  };
  return { llamar, llamadas };
}

/**
 * Factura que copia a un proveedor registrado de Aurora (mismo ID fiscal y cuenta), con número nuevo
 * y monto 1 % por debajo del acordado: dentro de las reglas. Se busca entre los pagos de la demo una
 * que el motor, sin techo, de verdad pagaría.
 */
function facturaClonadaQueElMotorPagaria(): { datos: Record<string, unknown>; texto: string } {
  const ctx = contextoDeLaDemo(estado);
  for (const fila of estado.filas.filter((f) => f.resultado.decision === 'PAGAR')) {
    const f = fila.factura;
    const centavos = Math.round((f.monto_centavos as number) * 0.99);
    const monto = (centavos / 100).toFixed(2);
    const numero = `CLON-${fila.id}-77`;
    const candidata: FacturaExtraida = { ...f, numero_factura: numero, monto_centavos: centavos, fecha_emision: ctx.ahora.slice(0, 10), alertas: [], confianza: 0.99, instrucciones_detectadas: false };
    if (decidir('PRUEBA', candidata, ctx, estado.config).decision !== 'PAGAR') continue;
    const datos = {
      beneficiario: f.beneficiario, id_fiscal: f.id_fiscal, cuenta: f.cuenta, monto, moneda: f.moneda, moneda_explicita: true,
      fecha: ctx.ahora.slice(0, 10), fecha_vencimiento: null, numero_factura: numero, categoria: f.categoria, confianza: 0.99, instrucciones_detectadas: false,
    };
    const texto = `FACTURA ${numero}\nProveedor: ${f.beneficiario}\nID fiscal: ${f.id_fiscal}\nCuenta: ${f.cuenta}\nFecha: ${datos.fecha}\nTotal a pagar: ${f.moneda} ${monto}\n`;
    return { datos, texto };
  }
  throw new Error('No hay en la demo un pago que se pueda clonar dentro de las reglas');
}

describe('lectura en vivo y decisión', () => {
  it('ninguna de las 18 decisiones de la demo sale PAGAR tras el techo', () => {
    for (const f of estado.filas) expect(aplicarTechoEnVivo(f.resultado).decision).not.toBe('PAGAR');
  });
  it('una factura clonada de un proveedor registrado, que el motor pagaría, NO sale PAGAR', async () => {
    const { datos, texto } = facturaClonadaQueElMotorPagaria();
    const { llamar, llamadas } = simulador(datos);
    const r = await leerYDecidir({ texto }, estado, { llamar });
    expect(llamadas).toHaveLength(2);
    expect(r.factura.alertas).toEqual([]);
    expect(r.resultado.hechos['techo_en_vivo']).toBe(true);
    expect(r.resultado.decision).toBe('ESCALAR');
    expect(r.resultado.razones).toEqual([{ regla: REGLA_EN_VIVO, efecto: 'ESCALAR' }]);
    expect(r.id).toMatch(/^V-[0-9A-F]{8}$/);
  });
  it('si OpenRouter responde con otro modelo, se marca y se escala', async () => {
    const { datos, texto } = facturaClonadaQueElMotorPagaria();
    const { llamar } = simulador(datos, (p) => (p.startsWith('google/') ? 'deepseek/deepseek-v4.1-flash' : p));
    const r = await leerYDecidir({ texto }, estado, { llamar });
    expect(r.factura.alertas).toContain('modelo_no_esperado:google/gemini-3.1-flash-lite');
    expect(r.resultado.decision).toBe('ESCALAR');
    expect(r.resultado.razones.map((x) => x.regla)).toContain('EXTRACCION');
  });
  it('si el lector falla, no hay pago: escala', async () => {
    const r = await leerYDecidir({ texto: 'FACTURA 1' }, estado, { llamar: async () => { throw new ErrorLLM('timeout'); } });
    expect(r.resultado.decision).not.toBe('PAGAR');
    expect(r.factura.alertas?.some((a) => a.startsWith('lector_fallo'))).toBe(true);
  });
  it('un proveedor desconocido se frena', async () => {
    const texto = 'FACTURA DESC-1\nProveedor: Nadie S.A.\nID fiscal: XX-999\nCuenta: ACC-XX-9\nFecha: 2026-10-15\nTotal: USD 100.00';
    const { llamar } = simulador({ beneficiario: 'Nadie S.A.', id_fiscal: 'XX-999', cuenta: 'ACC-XX-9', monto: '100.00', moneda: 'USD', moneda_explicita: true, fecha: '2026-10-15', fecha_vencimiento: null, numero_factura: 'DESC-1', categoria: estado.filas[0]?.factura.categoria ?? null, confianza: 0.95, instrucciones_detectadas: false });
    const r = await leerYDecidir({ texto }, estado, { llamar });
    expect(r.resultado.decision).toBe('FRENAR');
    expect(r.resultado.razones.map((x) => x.regla)).toContain('R2');
  });
  it('no toca el estado compartido de la demo', async () => {
    const antes = { filas: estado.filas.length, registro: (await estado.registroDecisiones.ancla()).n, aprobaciones: estado.aprobaciones.size };
    const { datos, texto } = facturaClonadaQueElMotorPagaria();
    await leerYDecidir({ texto }, estado, { llamar: simulador(datos).llamar });
    expect({ filas: estado.filas.length, registro: (await estado.registroDecisiones.ancla()).n, aprobaciones: estado.aprobaciones.size }).toEqual(antes);
  });
  it('modelo servido: igual o versión fechada del mismo; nunca otro ni vacío', () => {
    expect(modeloEsElPedido('google/gemini-3.1-flash-lite', 'google/gemini-3.1-flash-lite')).toBe(true);
    expect(modeloEsElPedido('google/gemini-3.1-flash-lite', 'google/gemini-3.1-flash-lite-20261001')).toBe(true);
    expect(modeloEsElPedido('google/gemini-3.1-flash-lite', 'google/gemini-3.1-flash')).toBe(false);
    expect(modeloEsElPedido('typesafe/jev-router', 'deepseek/deepseek-v4.1-flash-1017')).toBe(false);
    expect(modeloEsElPedido('anthropic/claude-haiku-5.5', null)).toBe(false);
  });
});

describe('archivo subido', () => {
  const bytes = (...xs: (number | string)[]) => new Uint8Array(xs.flatMap((x) => (typeof x === 'string' ? [...x].map((c) => c.charCodeAt(0)) : [x])));
  it('reconoce el tipo por los primeros bytes', () => {
    expect(entradaDesdeBytes(bytes(0x89, 'PNG', 0x0d, 0x0a, 0x1a, 0x0a, 1, 2))).toMatchObject({ ok: true, tipo: 'png' });
    expect(entradaDesdeBytes(bytes(0xff, 0xd8, 0xff, 0xe0, 1))).toMatchObject({ ok: true, tipo: 'jpg', entrada: { mime: 'image/jpeg' } });
    expect(entradaDesdeBytes(bytes('RIFF', 0, 0, 0, 0, 'WEBP', 'VP8 '))).toMatchObject({ ok: false, codigo: 'TIPO_NO_ADMITIDO' });
  });
  it('rechaza HEIC, tipos desconocidos, vacío y más de 4 MB', () => {
    expect(entradaDesdeBytes(bytes(0, 0, 0, 0x18, 'ftyp', 'heic', 0))).toMatchObject({ ok: false, codigo: 'HEIC' });
    expect(entradaDesdeBytes(bytes('GIF89a'))).toMatchObject({ ok: false, codigo: 'TIPO_NO_ADMITIDO' });
    expect(entradaDesdeBytes(new Uint8Array())).toMatchObject({ ok: false, codigo: 'VACIO' });
    const grande = new Uint8Array(MAX_BYTES + 1); grande.set([0xff, 0xd8, 0xff]);
    expect(entradaDesdeBytes(grande)).toMatchObject({ ok: false, codigo: 'MUY_GRANDE' });
  });
  it('un PDF sin capa de texto se rechaza antes de gastar lecturas', () => {
    expect(entradaDesdeBytes(bytes('%PDF-1.4\n%%EOF'))).toMatchObject({ ok: false, codigo: 'PDF_SIN_TEXTO' });
  });
});

describe('límite de lecturas', () => {
  it('cinco por visitante por hora; la sexta no cuenta; a la hora vuelve', () => {
    let t = Date.parse('2026-10-17T12:00:00Z');
    const l = new Limitador({ porVisitanteHora: 5, globalDia: 100 }, () => t);
    for (let i = 0; i < 5; i++) expect(l.intentar('a').ok).toBe(true);
    expect(l.intentar('a')).toMatchObject({ ok: false, motivo: 'VISITANTE' });
    expect(l.intentar('b').ok).toBe(true);
    t += 3_600_001;
    expect(l.intentar('a').ok).toBe(true);
  });
  it('tope global por día, que se reinicia al cambiar de día', () => {
    let t = Date.parse('2026-10-17T23:00:00Z');
    const l = new Limitador({ porVisitanteHora: 50, globalDia: 2 }, () => t);
    expect(l.intentar('a').ok).toBe(true);
    expect(l.intentar('b').ok).toBe(true);
    expect(l.intentar('c')).toMatchObject({ ok: false, motivo: 'GLOBAL' });
    t = Date.parse('2026-10-18T00:30:00Z');
    expect(l.intentar('c').ok).toBe(true);
  });
});

describe('activación', () => {
  it('solo con LECTURA_EN_VIVO=1 y clave a la vez', () => {
    expect(lecturaEnVivoActiva({})).toBe(false);
    expect(lecturaEnVivoActiva({ LECTURA_EN_VIVO: '1' })).toBe(false);
    expect(lecturaEnVivoActiva({ OPENROUTER_API_KEY: 'x' })).toBe(false);
    expect(lecturaEnVivoActiva({ LECTURA_EN_VIVO: 'true', OPENROUTER_API_KEY: 'x' })).toBe(false);
    expect(lecturaEnVivoActiva({ LECTURA_EN_VIVO: '1', OPENROUTER_API_KEY: 'x' })).toBe(true);
  });
});

describe('historial en vivo con aprobaciones', () => {
  it('una ESCALAR aprobada por una persona entra como RESERVADA y su reenvio se frena por R5', async () => {
    const propio = await crearEstado();
    const fila = propio.filas.find((f) => f.id === 'F-011');
    expect(fila?.resultado.decision).toBe('ESCALAR');
    const antes = decidir('REENVIO', fila!.factura, contextoDeLaDemo(propio), propio.config);
    expect(antes.razones.some((r) => r.regla === 'R5')).toBe(false);

    const r = await resolver(propio, 'F-011', 'APROBAR', 'prueba');
    expect(r.ok).toBe(true);
    const ctx = contextoDeLaDemo(propio);
    expect(ctx.historial.some((h) => h.estado === 'RESERVADA' && h.numero_factura === fila!.factura.numero_factura)).toBe(true);
    const despues = decidir('REENVIO', fila!.factura, ctx, propio.config);
    expect(despues.decision).toBe('FRENAR');
    expect(despues.razones.some((x) => x.regla === 'R5')).toBe(true);
  });

  it('una ESCALAR rechazada no entra al historial', async () => {
    const propio = await crearEstado();
    await resolver(propio, 'F-011', 'RECHAZAR', 'prueba');
    const fila = propio.filas.find((f) => f.id === 'F-011')!;
    expect(contextoDeLaDemo(propio).historial.some((h) => h.numero_factura === fila.factura.numero_factura)).toBe(false);
  });
});
