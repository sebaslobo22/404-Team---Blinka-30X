import { describe, expect, it } from 'vitest';
import { decidir } from '../src/engine/decide';
import type { ResultadoDecision } from '../src/engine/types';
import { entradaDesdeBytes } from '../src/telegram/archivo';
import { contextoYReglasDeAurora } from '../src/telegram/deps';
import { manejarUpdate } from '../src/telegram/manejador';
import { TEXTO_EN_VIVO, aplicarTechoEnVivo } from '../src/telegram/techo';
import { PNG, callback, crearDepsPrueba, extractorCon, lecturaClon, llamarFalso, mensajeArchivo, mensajeTexto } from './telegram-ayudas';

const base = (decision: ResultadoDecision['decision']): ResultadoDecision => ({
  factura_id: 'X', decision, razones: [{ regla: 'R1', efecto: decision === 'PAGAR' ? 'ESCALAR' : (decision as 'FRENAR' | 'ESCALAR') }],
  version_reglas: 'v', hechos: {}, explicacion: 'Explicacion.', decidido_en: '2026-10-17T12:00:00Z',
});

describe('techo en vivo (funcion pura)', () => {
  it('PAGAR pasa a ESCALAR y agrega la razon de entrada en vivo', () => {
    const r = aplicarTechoEnVivo({ ...base('PAGAR'), razones: [] });
    expect(r.decision).toBe('ESCALAR');
    expect(r.razones).toEqual([{ regla: 'EN_VIVO', efecto: 'ESCALAR' }]);
    expect(r.explicacion).toContain(TEXTO_EN_VIVO);
  });
  it('FRENAR se mantiene FRENAR y ESCALAR se mantiene ESCALAR, sin tocar nada', () => {
    const f = base('FRENAR');
    const e = base('ESCALAR');
    expect(aplicarTechoEnVivo(f)).toBe(f);
    expect(aplicarTechoEnVivo(e)).toBe(e);
  });
  it('un valor inesperado tambien queda en ESCALAR, nunca en PAGAR', () => {
    const r = aplicarTechoEnVivo({ ...base('PAGAR'), decision: 'PAGO_RARO' as never });
    expect(r.decision).toBe('ESCALAR');
  });
  it('no cambia el objeto original', () => {
    const original = { ...base('PAGAR'), razones: [] };
    const copia = structuredClone(original);
    aplicarTechoEnVivo(original);
    expect(original).toEqual(copia);
  });
});

describe('factura clon de un proveedor registrado de Aurora', () => {
  it('el motor SOLO la dejaria en PAGAR (por eso existe el techo) y con el techo sale ESCALAR', async () => {
    const { contexto, cfgMotor } = contextoYReglasDeAurora();
    const lectura = await extractorCon(llamarFalso({ lectura: lecturaClon() }).llamar)(entradaDesdeBytes(PNG, 'png'));
    const motor = decidir('TG-1', lectura.factura, contexto, cfgMotor);
    expect(motor.decision).toBe('PAGAR');
    const vivo = aplicarTechoEnVivo(motor);
    expect(vivo.decision).toBe('ESCALAR');
    expect(vivo.decision).not.toBe('PAGAR');
  });

  it('de punta a punta por el chat: nunca sale PAGAR, queda pendiente del dueno y dice por que', async () => {
    const d = crearDepsPrueba();
    d.telegram.archivos.set('clon', { bytes: PNG });
    await manejarUpdate(mensajeTexto(111, '/start'), d);
    await manejarUpdate(mensajeArchivo(111, 'clon', { foto: true, mime: 'image/jpeg' }), d);

    const guardadas = [...d.almacen.facturas.values()];
    expect(guardadas).toHaveLength(1);
    expect(guardadas[0]).toMatchObject({ decision: 'ESCALAR', decision_motor: 'PAGAR', estado_resolucion: 'PENDIENTE', simulada: true });
    const respuesta = d.telegram.a(111).join('\n');
    expect(respuesta).toContain('Decisión de Pulso: ESCALAR');
    expect(respuesta).toContain('Entrada en vivo: siempre la revisa una persona');
    expect(respuesta).not.toMatch(/Decisión de Pulso: PAGAR/);
    expect(respuesta).toContain('https://pulso.example');
  });

  it('ninguna combinacion de lecturas termina en PAGAR en el chat', async () => {
    for (const extra of [{}, { monto: '5000.00' }, { numero_factura: 'OTRA-1' }, { confianza: 0.99 }]) {
      const d = crearDepsPrueba({ extraer: extractorCon(llamarFalso({ lectura: lecturaClon(extra) }).llamar) });
      d.telegram.archivos.set('f', { bytes: PNG });
      await manejarUpdate(mensajeTexto(111, '/start'), d);
      await manejarUpdate(mensajeArchivo(111, 'f', { foto: true }), d);
      for (const f of d.almacen.facturas.values()) expect(f.decision).not.toBe('PAGAR');
    }
  });

  it('el dueno aprueba la factura clon desde su chat privado y queda APROBADA (simulada)', async () => {
    const d = crearDepsPrueba();
    d.telegram.archivos.set('clon', { bytes: PNG });
    await manejarUpdate(mensajeTexto(111, '/start'), d);
    await manejarUpdate(mensajeArchivo(111, 'clon', { foto: true }), d);
    // El jurado no ve botones; el dueno recibe el aviso con los botones.
    expect(d.telegram.enviados.filter((e) => e.chat === 111).every((e) => !e.botones)).toBe(true);
    const aviso = d.telegram.ultimo(777)!;
    expect(aviso.botones?.map((b) => b.texto)).toEqual(['Aprobar', 'Rechazar']);
    await manejarUpdate(callback(aviso.botones![0]!.data), d);
    expect([...d.almacen.facturas.values()][0]).toMatchObject({ estado_resolucion: 'APROBADA', resuelta_por: 777, simulada: true });
    expect(d.telegram.callbacks.at(-1)?.texto).toContain('Aprobada');
    expect(d.telegram.botonesQuitados).toHaveLength(1);
  });
});
