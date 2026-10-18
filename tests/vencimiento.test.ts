import { beforeAll, describe, expect, it } from 'vitest';
import { crearEstado } from '../src/demo/estado';
import type { EstadoDemo } from '../src/demo/estado';
import { lecturaDe } from '../src/demo/lecturas';
import { describirVencimiento, diasPara, esFechaIso, vencimientoDe } from '../src/demo/vencimiento';
import { vistaLectura } from '../app/ui/vista';

/**
 * "Para cuando". Las 18 lecturas reales no traen vencimiento (los documentos de Aurora no lo incluyen),
 * asi que aqui se prueba con lecturas SINTETICAS: se parte de una lectura real y se le pone la fecha de
 * vencimiento que cada caso necesita. Nada de esto se escribe en data/.
 */

const AHORA = '2026-10-17T12:00:00Z';
const IDS = Array.from({ length: 18 }, (_, i) => `F-${String(i + 1).padStart(3, '0')}`);

/** Lectura real de `id` con la fecha de vencimiento de cada modelo reemplazada. */
function sintetica(id: string, fechas: [unknown, unknown]): unknown {
  const base = structuredClone(lecturaDe(id)) as unknown as { resultado: { lecturas: { datos: Record<string, unknown> }[] } };
  base.resultado.lecturas.forEach((l, i) => {
    l.datos['fecha_vencimiento'] = fechas[i];
  });
  return base;
}
/** Fuente de lecturas con las 18 reales, salvo `cambios` por id. */
function fuente(cambios: Record<string, unknown> = {}): Record<string, unknown> {
  return Object.fromEntries(IDS.map((id) => [id, id in cambios ? cambios[id] : lecturaDe(id)]));
}
const filaDe = (fechas: [unknown, unknown]) => ({ lectura: sintetica('F-001', fechas) as ReturnType<typeof lecturaDe> });

describe('esFechaIso', () => {
  it('acepta fechas reales y rechaza lo demas', () => {
    expect(esFechaIso('2026-10-25')).toBe(true);
    expect(esFechaIso('2028-02-29')).toBe(true);
    for (const mala of ['2026-02-31', '2026-13-01', '2026-00-10', '2027-02-29', '25/10/2026', '2026-10-5', 'mañana', '', null, undefined, 20261025]) expect(esFechaIso(mala), String(mala)).toBe(false);
  });
});

describe('vencimientoDe', () => {
  it('misma fecha en las dos lecturas: devuelve esa fecha', () => {
    expect(vencimientoDe(filaDe(['2026-10-25', '2026-10-25']))).toBe('2026-10-25');
  });
  it('fechas distintas: difieren', () => {
    expect(vencimientoDe(filaDe(['2026-10-25', '2026-10-26']))).toBe('difieren');
  });
  it('solo una lectura trae fecha: difieren, no se elige una', () => {
    expect(vencimientoDe(filaDe(['2026-10-25', null]))).toBe('difieren');
    expect(vencimientoDe(filaDe([null, '2026-10-25']))).toBe('difieren');
  });
  it('fecha invalida: se trata como si no hubiera fecha', () => {
    expect(vencimientoDe(filaDe(['2026-02-31', '2026-02-31']))).toBeNull();
    expect(vencimientoDe(filaDe(['mañana', 'proximo viernes']))).toBeNull();
    expect(vencimientoDe(filaDe(['25/10/2026', null]))).toBeNull();
    // Una valida y otra invalida tampoco son la misma fecha.
    expect(vencimientoDe(filaDe(['2026-10-25', 'mañana']))).toBe('difieren');
  });
  it('ninguna trae fecha (el caso real de hoy): null', () => {
    expect(vencimientoDe(filaDe([null, null]))).toBeNull();
    expect(vencimientoDe({ lectura: null })).toBeNull();
  });
  it('una lectura que fallo (sin datos) cuenta como sin fecha', () => {
    const l = sintetica('F-001', ['2026-10-25', '2026-10-25']) as { resultado: { lecturas: { ok: boolean; datos?: unknown }[] } };
    l.resultado.lecturas[1] = { ...l.resultado.lecturas[1]!, ok: false, datos: undefined };
    expect(vencimientoDe({ lectura: l as unknown as ReturnType<typeof lecturaDe> })).toBe('difieren');
  });
});

describe('diasPara y describirVencimiento', () => {
  it('cuenta dias respecto a la fecha de la demo, con o sin hora', () => {
    expect(diasPara('2026-10-25', AHORA)).toBe(8);
    expect(diasPara('2026-10-17', AHORA)).toBe(0);
    expect(diasPara('2026-10-14', AHORA)).toBe(-3);
    expect(diasPara('2026-10-18', '2026-10-17')).toBe(1);
    expect(diasPara('2026-11-01', '2026-10-31T23:59:59Z')).toBe(1);
  });
  it('futura: vence en N dias', () => {
    expect(describirVencimiento('2026-10-25', AHORA)).toEqual({ clase: 'futura', texto: 'Vence en 8 días, el 25/10/2026', fecha: '2026-10-25', dias: 8 });
    expect(describirVencimiento('2026-10-18', AHORA).texto).toBe('Vence en 1 día, el 18/10/2026');
  });
  it('vencida: vencida hace N dias', () => {
    expect(describirVencimiento('2026-10-14', AHORA)).toEqual({ clase: 'vencida', texto: 'Vencida hace 3 días, el 14/10/2026', fecha: '2026-10-14', dias: -3 });
    expect(describirVencimiento('2026-10-16', AHORA).texto).toBe('Vencida hace 1 día, el 16/10/2026');
  });
  it('hoy', () => {
    expect(describirVencimiento('2026-10-17', AHORA)).toMatchObject({ clase: 'hoy', texto: 'Vence hoy, el 17/10/2026', dias: 0 });
  });
  it('sin fecha: lo dice con claridad', () => {
    expect(describirVencimiento(null, AHORA)).toEqual({ clase: 'sin', texto: 'Sin fecha de vencimiento en el documento', fecha: null, dias: null });
  });
  it('fechas distintas: pide revisar el documento y no muestra ninguna', () => {
    const d = describirVencimiento('difieren', AHORA);
    expect(d).toMatchObject({ clase: 'dudosa', fecha: null, dias: null });
    expect(d.texto).toMatch(/distintas/);
  });
});

describe('el estado con lecturas', () => {
  let real: EstadoDemo;
  beforeAll(async () => {
    real = await crearEstado();
  });

  it('caso real: las 18 lecturas traen null en las dos lecturas y la pantalla dice que no hay fecha', () => {
    for (const f of real.filas) {
      expect(f.lectura!.resultado.lecturas.map((l) => l.datos?.fecha_vencimiento), f.id).toEqual([null, null]);
      expect(vencimientoDe(f), f.id).toBeNull();
      expect(vistaLectura(real, f).vence, f.id).toEqual({ clase: 'sin', texto: 'Sin fecha de vencimiento en el documento' });
    }
  });

  it('con lecturas regrabadas que traen vencimiento, "Para cuando" se enciende solo y no cambia ninguna decision', async () => {
    const e = await crearEstado(undefined, 0, fuente({
      'F-001': sintetica('F-001', ['2026-10-25', '2026-10-25']),
      'F-002': sintetica('F-002', ['2026-10-14', '2026-10-14']),
      'F-003': sintetica('F-003', ['2026-10-20', '2026-10-21']),
      'F-004': sintetica('F-004', ['2026-10-20', null]),
      'F-005': sintetica('F-005', ['2026-02-31', '2026-02-31']),
    }));
    const v = (id: string) => vistaLectura(e, e.filas.find((f) => f.id === id)!).vence;
    expect(v('F-001')).toEqual({ clase: 'futura', texto: 'Vence en 8 días, el 25/10/2026' });
    expect(v('F-002')).toEqual({ clase: 'vencida', texto: 'Vencida hace 3 días, el 14/10/2026' });
    expect(v('F-003').clase).toBe('dudosa');
    expect(v('F-004').clase).toBe('dudosa');
    expect(v('F-005').clase).toBe('sin');
    expect(v('F-006').clase).toBe('sin');
    // El vencimiento se muestra, no decide: las decisiones son las mismas.
    expect(e.filas.map((f) => f.resultado.decision)).toEqual(real.filas.map((f) => f.resultado.decision));
  });

  it('sin lectura: "Para cuando" cae en sin fecha', async () => {
    const e = await crearEstado(undefined, 0, fuente({ 'F-001': undefined }));
    const f = e.filas.find((x) => x.id === 'F-001')!;
    expect(f.lectura).toBeNull();
    expect(vistaLectura(e, f).vence.clase).toBe('sin');
  });
});
