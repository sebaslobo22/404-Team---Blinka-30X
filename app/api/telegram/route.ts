import { after } from 'next/server';
import { crearDepsReales } from '../../../src/telegram/deps';
import { manejarWebhook } from '../../../src/telegram/webhook';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Doble lectura con dos modelos: puede tardar. El trabajo va dentro de after() y comparte este limite.
export const maxDuration = 60;

/**
 * Webhook del bot de Telegram. Verifica el secreto, responde 200 al instante y procesa con after()
 * (en serverless lo que ocurre tras la respuesta se congela si no se usa after). Toda la logica vive en
 * src/telegram/webhook.ts y src/telegram/manejador.ts.
 */
export async function POST(req: Request) {
  return manejarWebhook(req, {
    env: process.env,
    programar: (tarea) => after(tarea),
    crearDeps: () => crearDepsReales(process.env),
  });
}
