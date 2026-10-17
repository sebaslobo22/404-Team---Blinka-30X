import type { Config } from './types';

interface ReglasJson {
  version: string;
  tasas_ficticias_por_1_USD: Record<string, number>;
  confianza_minima?: number;
  reglas: { id: string; umbral_usd?: number; ventana_dias?: number; tolerancia_pct?: number }[];
}

/** Convierte docs/reglas-R1-R8.json en la configuracion entera del motor. */
export function cargarConfig(json: ReglasJson): Config {
  const regla = (id: string) => {
    const r = json.reglas.find((x) => x.id === id);
    if (!r) throw new Error(`Falta la regla ${id}`);
    return r;
  };
  const tasas_milli: Record<string, number> = {};
  for (const [moneda, tasa] of Object.entries(json.tasas_ficticias_por_1_USD)) {
    tasas_milli[moneda] = Math.round(tasa * 1000);
  }
  return {
    version: json.version,
    limite_pago_usd_centavos: Math.round((regla('R1').umbral_usd ?? 0) * 100),
    tope_mensual_usd_centavos: Math.round((regla('R3').umbral_usd ?? 0) * 100),
    ventana_duplicado_dias: regla('R5').ventana_dias ?? 0,
    tolerancia_bps: Math.round((regla('R6').tolerancia_pct ?? 0) * 100),
    ventana_cuenta_dias: regla('R8').ventana_dias ?? 0,
    tasas_milli,
    confianza_minima: typeof json.confianza_minima === 'number' ? json.confianza_minima : 0.85,
  };
}
