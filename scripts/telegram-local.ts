// Bot de Telegram en local, sin webhook: long polling con getUpdates y el MISMO manejador que el webhook
// (sin la verificacion de cabecera, que no aplica aqui). Usa un bot de DESARROLLO.
//
//   npx vite-node scripts/telegram-local.ts            # estado en memoria (se pierde al cerrar)
//   npx vite-node scripts/telegram-local.ts --supabase # estado en Supabase (necesita la migracion 0003)
//
// Variables (en .env.local o .env, o ya exportadas): TELEGRAM_BOT_TOKEN, TELEGRAM_DUENO_ID, OPENROUTER_API_KEY,
// PULSO_URL_PUBLICA y, con --supabase, NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
// Cada factura gasta centavos en OpenRouter (llamadas reales a los dos modelos).
// Nunca se imprime la URL de Telegram (lleva el token).
import { crearDepsReales } from '../src/telegram/deps';
import { manejarUpdate, type TgUpdate } from '../src/telegram/manejador';
import { AlmacenEnMemoria } from '../src/telegram/memoria';

for (const f of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(f);
  } catch {
    /* no existe: se sigue con lo que ya haya en el entorno */
  }
}

const token = (process.env['TELEGRAM_BOT_TOKEN'] ?? '').trim();
if (!token) {
  console.error('Falta TELEGRAM_BOT_TOKEN (token del bot de desarrollo).');
  process.exit(1);
}

async function api<T>(metodo: string, cuerpo: Record<string, unknown>, ms = 15_000): Promise<T> {
  let r: Response;
  try {
    r = await fetch(`https://api.telegram.org/bot${token}/${metodo}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(ms),
    });
  } catch {
    throw new Error(`No se pudo llamar a ${metodo} (red o tiempo agotado).`);
  }
  const j = (await r.json().catch(() => null)) as { ok?: boolean; result?: T } | null;
  if (!r.ok || !j?.ok) throw new Error(`Telegram rechazó ${metodo} (HTTP ${r.status}).`);
  return j.result as T;
}

const usarSupabase = process.argv.includes('--supabase');
const deps = crearDepsReales(process.env, usarSupabase ? {} : { almacen: new AlmacenEnMemoria() });
if (!deps) {
  console.error(usarSupabase ? 'Con --supabase faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.' : 'No se pudieron crear las dependencias.');
  process.exit(1);
}
if (deps.config.duenoId === null) console.warn('Aviso: sin TELEGRAM_DUENO_ID nadie puede aprobar.');
if (!usarSupabase) console.warn('Aviso: estado en memoria (solo desarrollo). Usa --supabase para el estado real.');

const info = await api<{ url?: string }>('getWebhookInfo', {});
if (info.url) {
  console.error('Este bot tiene un webhook activo. Con webhook, getUpdates no funciona y se pisarían los mensajes.');
  console.error('Usa un bot de desarrollo distinto, o desactiva el webhook (deleteWebhook) y vuelve a correr esto.');
  process.exit(1);
}

console.log('Pulso (Telegram, modo local) escuchando. Ctrl+C para salir.');
let offset = 0;
for (;;) {
  let lote: TgUpdate[] = [];
  try {
    lote = await api<TgUpdate[]>('getUpdates', { offset, timeout: 25, allowed_updates: ['message', 'callback_query'] }, 40_000);
  } catch (e) {
    console.error((e as Error).message);
    await new Promise((r) => setTimeout(r, 3000));
    continue;
  }
  for (const u of lote) {
    offset = Math.max(offset, u.update_id + 1);
    await manejarUpdate(u, deps);
  }
}
