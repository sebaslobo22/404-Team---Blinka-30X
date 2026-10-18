import { createHash, timingSafeEqual } from 'node:crypto';
import type { Entorno } from '../publico';
import type { Deps, TgUpdate } from './manejador';
import { manejarUpdate } from './manejador';

/** Un secreto de webhook mas corto que esto no se acepta (Telegram permite hasta 256 caracteres). */
export const SECRETO_MIN = 16;
const MAX_CUERPO = 1_000_000;

/**
 * Comparacion en tiempo constante de la cabecera X-Telegram-Bot-Api-Secret-Token. Si falta el secreto
 * configurado (o es demasiado corto) rechaza SIEMPRE: sin secreto el endpoint queda cerrado, no abierto.
 * Se comparan los hashes SHA-256 para que timingSafeEqual reciba siempre dos buffers del mismo largo.
 */
export function secretoValido(recibido: string | null | undefined, esperado: string | undefined): boolean {
  if (typeof esperado !== 'string' || esperado.length < SECRETO_MIN) return false;
  if (typeof recibido !== 'string' || recibido === '') return false;
  const a = createHash('sha256').update(recibido).digest();
  const b = createHash('sha256').update(esperado).digest();
  return timingSafeEqual(a, b);
}

export interface OpcionesWebhook {
  env: Entorno;
  /** En Next: `after`. Trabaja despues de responder; en serverless lo que no use `after` se congela. */
  programar: (tarea: () => Promise<void>) => void;
  /** Fabrica de dependencias; null = falta el estado (falla cerrada). */
  crearDeps: () => Deps | null;
}

const json = (cuerpo: unknown, status: number) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } });

/** Logica del webhook, separada de la ruta para poder probarla. Responde 200 al instante y procesa despues. */
export async function manejarWebhook(req: Request, o: OpcionesWebhook): Promise<Response> {
  if (!secretoValido(req.headers.get('x-telegram-bot-api-secret-token'), o.env['TELEGRAM_WEBHOOK_SECRET'])) {
    return json({ ok: false }, 401);
  }
  const largo = Number(req.headers.get('content-length'));
  if (Number.isFinite(largo) && largo > MAX_CUERPO) return json({ ok: false }, 413);

  let update: TgUpdate;
  try {
    const x = (await req.json()) as unknown;
    if (!x || typeof x !== 'object' || typeof (x as TgUpdate).update_id !== 'number') return json({ ok: false }, 400);
    update = x as TgUpdate;
  } catch {
    return json({ ok: false }, 400);
  }

  // Sin estado (Supabase sin configurar) no se procesa nada: 503 y Telegram reintenta mas tarde.
  const deps = o.crearDeps();
  if (!deps) return json({ ok: false, error: 'sin_estado' }, 503);

  o.programar(() => manejarUpdate(update, deps));
  return json({ ok: true }, 200);
}
