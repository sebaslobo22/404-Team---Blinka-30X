import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Almacen, Cupo, FacturaVivo, NuevaFactura } from './almacen';
import type { Entorno } from '../publico';

/**
 * Cliente de servidor con la service role y la URL del equipo (las mismas variables que usa /team).
 * A diferencia de clienteServidor() de /team, NO se apaga con MODO_PUBLICO: el webhook corre justo en el
 * despliegue publico y sin la base no puede funcionar. Las tablas telegram_* tienen RLS sin politicas, asi
 * que la unica llave que las toca es esta. Devuelve null si falta algo (el llamador rechaza).
 */
export function clienteTelegram(env: Entorno): SupabaseClient | null {
  const url = env['NEXT_PUBLIC_SUPABASE_URL'];
  const key = env['SUPABASE_SERVICE_ROLE_KEY'];
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function chequear(error: { message: string } | null): void {
  // Nunca se propaga el mensaje completo: puede traer detalles de la base. Solo un codigo corto.
  if (error) throw new Error('supabase_error');
}

/** Almacen real sobre Supabase. Cada metodo es una sola sentencia atomica del lado de la base. */
export class AlmacenSupabase implements Almacen {
  constructor(private readonly db: SupabaseClient) {}

  async registrarUpdate(updateId: number): Promise<boolean> {
    // INSERT ... ON CONFLICT DO NOTHING: solo devuelve fila si esta llamada fue la que inserto.
    const { data, error } = await this.db
      .from('telegram_updates')
      .upsert({ update_id: updateId }, { onConflict: 'update_id', ignoreDuplicates: true })
      .select('update_id');
    chequear(error);
    return (data ?? []).length === 1;
  }

  async chatIniciado(chatId: number): Promise<boolean> {
    const { data, error } = await this.db.from('telegram_chats').select('chat_id').eq('chat_id', chatId).maybeSingle();
    chequear(error);
    return data !== null;
  }

  async iniciarChat(chatId: number, usuarioId: number | null): Promise<void> {
    const { error } = await this.db
      .from('telegram_chats')
      .upsert({ chat_id: chatId, usuario_id: usuarioId }, { onConflict: 'chat_id', ignoreDuplicates: true });
    chequear(error);
  }

  async consumirCupo(chatId: number, ahora: Date, maxPorChatHora: number, topeDiario: number): Promise<Cupo> {
    const { data, error } = await this.db.rpc('telegram_consumir_cupo', {
      p_chat: chatId,
      p_ahora: ahora.toISOString(),
      p_max_chat: maxPorChatHora,
      p_tope_dia: topeDiario,
    });
    chequear(error);
    if (data === 'ok' || data === 'chat' || data === 'dia') return data;
    throw new Error('cupo_respuesta_invalida');
  }

  async guardarFactura(f: NuevaFactura): Promise<string> {
    const { data, error } = await this.db
      .from('telegram_facturas')
      .insert({
        chat_id: f.chat_id,
        update_id: f.update_id,
        decision: f.decision,
        decision_motor: f.decision_motor,
        razones: f.razones,
        resumen: f.resumen,
        estado_resolucion: f.estado_resolucion,
        simulada: true,
      })
      .select('id')
      .single();
    chequear(error);
    const id = (data as { id?: unknown } | null)?.id;
    if (typeof id !== 'string') throw new Error('factura_sin_id');
    return id;
  }

  async obtenerFactura(id: string): Promise<FacturaVivo | null> {
    const { data, error } = await this.db.from('telegram_facturas').select('*').eq('id', id).maybeSingle();
    chequear(error);
    if (!data) return null;
    const r = data as Record<string, unknown>;
    return {
      id: r['id'] as string,
      chat_id: Number(r['chat_id']),
      update_id: Number(r['update_id']),
      decision: r['decision'] as FacturaVivo['decision'],
      decision_motor: r['decision_motor'] as FacturaVivo['decision_motor'],
      razones: r['razones'] as FacturaVivo['razones'],
      resumen: r['resumen'] as FacturaVivo['resumen'],
      estado_resolucion: r['estado_resolucion'] as FacturaVivo['estado_resolucion'],
      simulada: true,
      resuelta_por: r['resuelta_por'] === null || r['resuelta_por'] === undefined ? null : Number(r['resuelta_por']),
    };
  }

  async resolverFactura(id: string, estado: 'APROBADA' | 'RECHAZADA', por: number): Promise<boolean> {
    // UPDATE condicional: solo cambia si sigue siendo ESCALAR y PENDIENTE. Gana una sola llamada.
    const { data, error } = await this.db
      .from('telegram_facturas')
      .update({ estado_resolucion: estado, resuelta_por: por, resuelta_en: new Date().toISOString() })
      .eq('id', id)
      .eq('decision', 'ESCALAR')
      .eq('estado_resolucion', 'PENDIENTE')
      .select('id');
    chequear(error);
    return (data ?? []).length === 1;
  }
}
