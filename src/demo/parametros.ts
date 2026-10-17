import reglas from '../../docs/reglas-R1-R8.json';
import dataset from '../../data/dev-set.json';
import { cargarConfig } from '../engine/config';
import type { Config } from '../engine/types';

/** Parametros que la pantalla de reglas permite editar (unidades humanas). */
export interface ParametrosReglas {
  limite_pago_usd: number;
  tope_mensual_usd: number;
  ventana_duplicado_dias: number;
  tolerancia_pct: number;
  ventana_cuenta_dias: number;
  /** Presupuesto mensual por categoria, en USD. */
  presupuestos_usd: Record<string, number>;
}

export function parametrosPorDefecto(): ParametrosReglas {
  const base = cargarConfig(reglas);
  const presupuestos_usd: Record<string, number> = {};
  for (const [cat, centavos] of Object.entries(dataset.contexto.presupuestos)) presupuestos_usd[cat] = (centavos as number) / 100;
  return {
    limite_pago_usd: base.limite_pago_usd_centavos / 100,
    tope_mensual_usd: base.tope_mensual_usd_centavos / 100,
    ventana_duplicado_dias: base.ventana_duplicado_dias,
    tolerancia_pct: base.tolerancia_bps / 100,
    ventana_cuenta_dias: base.ventana_cuenta_dias,
    presupuestos_usd,
  };
}

export const VERSION_BASE: string = reglas.version;

const RANGOS = {
  limite_pago_usd: [1, 1_000_000],
  tope_mensual_usd: [1, 10_000_000],
  ventana_duplicado_dias: [0, 365],
  tolerancia_pct: [0, 50],
  ventana_cuenta_dias: [0, 60],
} as const;

const ETIQUETAS: Record<keyof typeof RANGOS, string> = {
  limite_pago_usd: 'Limite por pago (USD)',
  tope_mensual_usd: 'Tope mensual por beneficiario (USD)',
  ventana_duplicado_dias: 'Ventana de duplicados (dias)',
  tolerancia_pct: 'Tolerancia sobre lo acordado (%)',
  ventana_cuenta_dias: 'Ventana de cambio de cuenta (dias)',
};

export type ResultadoValidacion = { ok: true; params: ParametrosReglas } | { ok: false; error: string };

/** Valida lo que llega del navegador. Todo lo que no sea un numero finito dentro de rango se rechaza. */
export function validarParametros(entrada: unknown): ResultadoValidacion {
  if (typeof entrada !== 'object' || entrada === null || Array.isArray(entrada)) return { ok: false, error: 'El cuerpo debe ser un objeto.' };
  const o = entrada as Record<string, unknown>;
  const defecto = parametrosPorDefecto();
  const salida: ParametrosReglas = { ...defecto, presupuestos_usd: { ...defecto.presupuestos_usd } };

  for (const clave of Object.keys(RANGOS) as (keyof typeof RANGOS)[]) {
    const v = o[clave];
    const [min, max] = RANGOS[clave];
    if (typeof v !== 'number' || !Number.isFinite(v)) return { ok: false, error: `${ETIQUETAS[clave]}: debe ser un numero.` };
    if (v < min || v > max) return { ok: false, error: `${ETIQUETAS[clave]}: debe estar entre ${min} y ${max}.` };
    const entero = clave === 'tolerancia_pct' ? Math.abs(v * 100 - Math.round(v * 100)) < 1e-9 : Number.isInteger(v);
    if (!entero) return { ok: false, error: `${ETIQUETAS[clave]}: ${clave === 'tolerancia_pct' ? 'maximo dos decimales' : 'debe ser un numero entero'}.` };
    salida[clave] = v;
  }

  const pres = o['presupuestos_usd'];
  if (typeof pres !== 'object' || pres === null || Array.isArray(pres)) return { ok: false, error: 'Presupuestos: falta el objeto por categoria.' };
  const p = pres as Record<string, unknown>;
  for (const cat of Object.keys(defecto.presupuestos_usd)) {
    const v = p[cat];
    if (typeof v !== 'number' || !Number.isFinite(v) || !Number.isInteger(v) || v < 0 || v > 10_000_000) {
      return { ok: false, error: `Presupuesto de ${cat}: entero entre 0 y 10000000.` };
    }
    salida.presupuestos_usd[cat] = v;
  }
  return { ok: true, params: salida };
}

export function configDesdeParametros(p: ParametrosReglas, version: string): Config {
  const base = cargarConfig(reglas);
  return {
    ...base,
    version,
    limite_pago_usd_centavos: Math.round(p.limite_pago_usd * 100),
    tope_mensual_usd_centavos: Math.round(p.tope_mensual_usd * 100),
    ventana_duplicado_dias: p.ventana_duplicado_dias,
    tolerancia_bps: Math.round(p.tolerancia_pct * 100),
    ventana_cuenta_dias: p.ventana_cuenta_dias,
  };
}
