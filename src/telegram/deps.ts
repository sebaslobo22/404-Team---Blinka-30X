import dataset from '../../data/dev-set.json';
import { VERSION_BASE, configDesdeParametros, parametrosPorDefecto } from '../demo/parametros';
import type { Config, Contexto } from '../engine/types';
import { MODELOS_POR_DEFECTO, extraerFactura, type EntradaFactura, type ResultadoExtraccion } from '../extraccion/extraer';
import { llamarOpenRouter, type PeticionLLM } from '../extraccion/openrouter';
import type { Entorno } from '../publico';
import type { Almacen } from './almacen';
import { TelegramHttp, type TelegramApi } from './api';
import type { ConfigBot, Deps } from './manejador';
import { AlmacenSupabase, clienteTelegram } from './supabase';

/** OpenRouter: sin proveedor de reemplazo (un modelo distinto al pedido no contesta por el) y sin que guarden los datos. */
export const PROVEEDOR_FIJO = { allow_fallbacks: false, data_collection: 'deny' } as const;

export const URL_PUBLICA_POR_DEFECTO = 'https://equipo404.produfy.co';
export const MAX_POR_CHAT_HORA = 5;
export const TOPE_DIARIO_POR_DEFECTO = 100;

const entero = (v: string | undefined): number | null => {
  const n = Number((v ?? '').trim());
  return v !== undefined && v.trim() !== '' && Number.isSafeInteger(n) ? n : null;
};

export function configBotDesdeEnv(env: Entorno): ConfigBot {
  const tope = entero(env['TELEGRAM_TOPE_DIARIO']);
  return {
    duenoId: entero(env['TELEGRAM_DUENO_ID']),
    urlPublica: (env['PULSO_URL_PUBLICA'] ?? '').trim().replace(/\/+$/, '') || URL_PUBLICA_POR_DEFECTO,
    topeDiario: tope !== null && tope > 0 ? tope : TOPE_DIARIO_POR_DEFECTO,
    maxPorChatHora: MAX_POR_CHAT_HORA,
    limiteLecturaMs: 45_000,
  };
}

/** Mismo contexto y mismas reglas de Aurora Cloud que usa el demo (reloj fijo del set incluido). */
export function contextoYReglasDeAurora(): { contexto: Contexto; cfgMotor: Config } {
  const parametros = parametrosPorDefecto();
  const contexto = structuredClone(dataset.contexto) as unknown as Contexto;
  for (const [cat, usd] of Object.entries(parametros.presupuestos_usd)) contexto.presupuestos[cat] = usd * 100;
  return { contexto, cfgMotor: configDesdeParametros(parametros, VERSION_BASE) };
}

/** Doble lectura real: los dos modelos fijos, en vivo (jamas replay), sin reemplazos ni retencion de datos. */
export function extraerEnVivo(): (e: EntradaFactura) => Promise<ResultadoExtraccion> {
  const llamar = (p: PeticionLLM) => llamarOpenRouter({ ...p, proveedor: PROVEEDOR_FIJO }, { timeoutMs: 25_000, reintentos: 0 });
  return (e) => extraerFactura(e, { modelos: MODELOS_POR_DEFECTO, replay: false, guardar: false, llamar });
}

/** Registro sin datos sensibles: solo codigos cortos. Nunca URLs de Telegram, tokens ni contenido de facturas. */
const logSeguro = (evento: string) => console.log(`[telegram] ${evento}`);

/**
 * Dependencias reales. Devuelve null si falta lo imprescindible (token o base): el llamador rechaza.
 * `almacen` solo se pasa en el modo local de desarrollo cuando no hay Supabase.
 */
export function crearDepsReales(env: Entorno, opciones: { almacen?: Almacen; telegram?: TelegramApi } = {}): Deps | null {
  const token = (env['TELEGRAM_BOT_TOKEN'] ?? '').trim();
  if (!token && !opciones.telegram) return null;
  let almacen = opciones.almacen;
  if (!almacen) {
    const db = clienteTelegram(env);
    if (!db) return null;
    almacen = new AlmacenSupabase(db);
  }
  const { contexto, cfgMotor } = contextoYReglasDeAurora();
  return {
    almacen,
    telegram: opciones.telegram ?? new TelegramHttp(token),
    extraer: extraerEnVivo(),
    contexto,
    cfgMotor,
    config: configBotDesdeEnv(env),
    ahora: () => new Date(),
    log: logSeguro,
  };
}
