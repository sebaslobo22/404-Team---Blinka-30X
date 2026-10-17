import { describe, expect, it } from 'vitest';
import { agruparPorDueno, armarContextoMd, cuentaRegresiva, validarPin, type Contexto, type Tarea } from '../app/equipo/lib';

const t = (id: string, titulo: string, dueno: Tarea['dueno'], bloque: number, estado: Tarea['estado'], orden = 0): Tarea => ({ id, titulo, dueno, bloque, estado, orden });

const ctx: Contexto = {
  conectado: true,
  estado: { ahora: { frase: 'Motor listo.', hito: 'V1 sábado', cierre_iso: '2026-10-18T17:00:00Z', bloqueantes: ['Clave de OpenRouter'] } },
  tareas: [
    t('3', 'Registro en Supabase', 'Andrés', 3, 'en_curso'),
    t('1', 'Clave de OpenRouter', 'Sebastián', 1, 'pendiente', 1),
    t('2', 'Doce facturas reales', 'Sebastián', 1, 'hecha', 0),
    t('4', 'Suite adversarial', 'Joffre', 4, 'bloqueada'),
  ],
  zonas: [
    { ruta: 'src/engine', dueno: 'Andrés', agente: 'claude-andres', tomada_en: '2026-10-17T16:00:00Z' },
    { ruta: 'app/equipo', dueno: 'Sebastián' },
  ],
  bitacora: [{ id: 1, cuando: '2026-10-17T16:30:00Z', quien: 'Andrés', es_agente: true, accion: 'zona tomada', detalle: 'src/engine' }],
};

describe('validarPin', () => {
  it('acepta solo el PIN exacto', () => {
    expect(validarPin('4242', '4242')).toBe(true);
    expect(validarPin('4243', '4242')).toBe(false);
    expect(validarPin('424', '4242')).toBe(false);
    expect(validarPin('42420', '4242')).toBe(false);
  });
  it('sin PIN configurado o sin PIN recibido, nadie entra', () => {
    expect(validarPin('', '')).toBe(false);
    expect(validarPin('abc', undefined)).toBe(false);
    expect(validarPin(undefined, 'abc')).toBe(false);
    expect(validarPin(null, null)).toBe(false);
  });
});

describe('agruparPorDueno', () => {
  const g = agruparPorDueno(ctx.tareas);
  it('devuelve siempre los cuatro dueños', () => {
    expect(Object.keys(g)).toEqual(['Sebastián', 'Andrés', 'Joffre', 'Todos']);
    expect(g.Todos).toEqual([]);
  });
  it('ordena por bloque y luego por orden', () => {
    expect(g.Sebastián.map((x) => x.id)).toEqual(['2', '1']);
  });
  it('no pierde tareas', () => {
    expect(Object.values(g).flat()).toHaveLength(ctx.tareas.length);
  });
});

describe('armarContextoMd', () => {
  const md = armarContextoMd(ctx, '2026-10-17T17:00:00Z');
  it('incluye estado, bloqueantes, tareas, zonas y bitácora', () => {
    expect(md).toContain('# Centro de mando 404');
    expect(md).toContain('Motor listo.');
    expect(md).toContain('Clave de OpenRouter');
    expect(md).toContain('### Sebastián');
    expect(md).toContain('- [x] (bloque 1, hecha) Doce facturas reales');
    expect(md).toContain('- [ ] (bloque 4, bloqueada) Suite adversarial');
    expect(md).toContain('| `src/engine` | Andrés | tomada por claude-andres hace 1 h |');
    expect(md).toContain('| `app/equipo` | Sebastián | libre |');
    expect(md).toContain('Andrés (agente): zona tomada — src/engine');
  });
  it('avisa cuando viene de la semilla', () => {
    expect(armarContextoMd({ ...ctx, conectado: false })).toContain('semilla local (solo lectura)');
  });
});

describe('cuentaRegresiva', () => {
  it('formatea días y hh:mm:ss, y marca cerrado', () => {
    const cierre = '2026-10-18T17:00:00Z';
    expect(cuentaRegresiva(cierre, Date.parse('2026-10-17T15:58:57Z'))).toBe('1 d 01:01:03');
    expect(cuentaRegresiva(cierre, Date.parse('2026-10-18T17:00:01Z'))).toBe('cerrado');
  });
});
