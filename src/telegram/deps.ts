import dataset from '../../data/dev-set.json';
import { VERSION_BASE, configDesdeParametros, parametrosPorDefecto } from '../demo/parametros';
import type { Config, Contexto } from '../engine/types';
import { MODELOS_POR_DEFECTO, extraerFactura, type EntradaFactura, type ResultadoExtraccion } from '../extraccion/extraer';
import { llamarOpenRouter, type PeticionLLM } from '../extraccion/openrouter';
import type { Entorno } from '../publico';
import type { Almacen } from './almacen';
import type { Conversar } from './conversacion';
import { CupoEnMemoria } from './memoria';
import { TelegramHttp, type TelegramApi } from './api';
import type { ConfigBot, Deps } from './manejador';
import { AlmacenSupabase, clienteTelegram } from './supabase';

/** OpenRouter: sin proveedor de reemplazo (un modelo distinto al pedido no contesta por el) y sin que guarden los datos. */
export const PROVEEDOR_FIJO = { allow_fallbacks: false, data_collection: 'deny' } as const;

export const URL_PUBLICA_POR_DEFECTO = 'https://equipo404.produfy.co';
export const MAX_POR_CHAT_HORA = 5;
export const TOPE_DIARIO_POR_DEFECTO = 100;
export const CHAT_POR_USUARIO_HORA_POR_DEFECTO = 20;
export const CHAT_GLOBAL_DIA_POR_DEFECTO = 300;
/** Modelo de texto barato que ya usa el lector (el segundo de la doble lectura). */
export const MODELO_CHAT = MODELOS_POR_DEFECTO[1];

/**
 * Lectura de facturas: un reintento SOLO ante error de red o timeout (un fallo pasajero no debe dar "No pude
 * leer"); una respuesta invalida no se reintenta. El techo en vivo se aplica despues, sobre lo que se lea.
 */
export const OPCIONES_LECTURA = { timeoutMs: 25_000, reintentos: 1, soloRed: true } as const;

const entero = (v: string | undefined): number | null => {
  const n = Number((v ?? '').trim());
  return v !== undefined && v.trim() !== '' && Number.isSafeInteger(n) ? n : null;
};

const positivo = (v: string | undefined): number | null => {
  const n = entero(v);
  return n !== null && n > 0 ? n : null;
};

/** Interruptor CHAT_IA: encendido por defecto si hay OPENROUTER_API_KEY; CHAT_IA=0 (o false/off/no) lo apaga. */
export function chatIaActivo(env: Entorno): boolean {
  const apagado = /^(0|false|off|no)$/i.test((env['CHAT_IA'] ?? '').trim());
  return !apagado && (env['OPENROUTER_API_KEY'] ?? '').trim() !== '';
}

export function configBotDesdeEnv(env: Entorno): ConfigBot {
  const tope = entero(env['TELEGRAM_TOPE_DIARIO']);
  return {
    duenoId: entero(env['TELEGRAM_DUENO_ID']),
    urlPublica: (env['PULSO_URL_PUBLICA'] ?? '').trim().replace(/\/+$/, '') || URL_PUBLICA_POR_DEFECTO,
    topeDiario: tope !== null && tope > 0 ? tope : TOPE_DIARIO_POR_DEFECTO,
    maxPorChatHora: MAX_POR_CHAT_HORA,
    limiteLecturaMs: 45_000,
    chatPorUsuarioHora: positivo(env['CHAT_POR_USUARIO_HORA']) ?? CHAT_POR_USUARIO_HORA_POR_DEFECTO,
    chatGlobalDia: positivo(env['CHAT_GLOBAL_DIA']) ?? CHAT_GLOBAL_DIA_POR_DEFECTO,
    limiteChatMs: 12_000,
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
  const llamar = (p: PeticionLLM) => llamarOpenRouter({ ...p, proveedor: PROVEEDOR_FIJO }, OPCIONES_LECTURA);
  return (e) => extraerFactura(e, { modelos: MODELOS_POR_DEFECTO, replay: false, guardar: false, llamar });
}

/** Respuesta conversacional: mismo OpenRouter y mismas garantias de proveedor, 250 tokens, 12 s y sin reintentos. */
export function conversarEnVivo(): Conversar {
  return async ({ sistema, texto }) => {
    const r = await llamarOpenRouter({ modelo: MODELO_CHAT, sistema, texto, maxTokens: 250, proveedor: PROVEEDOR_FIJO }, { timeoutMs: 12_000, reintentos: 0 });
    return r.contenido;
  };
}

/** Cupo conversacional del proceso: vive fuera de crearDepsReales para sobrevivir entre peticiones. */
const CUPO_CHAT_DEL_PROCESO = new CupoEnMemoria();

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
    conversar: chatIaActivo(env) ? conversarEnVivo() : null,
    cupoChat: CUPO_CHAT_DEL_PROCESO,
    ahora: () => new Date(),
    log: logSeguro,
  };
}
