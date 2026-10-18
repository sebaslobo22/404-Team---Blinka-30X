import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Almacen, Cupo, FacturaVivo, NuevaFactura } from './almacen';
import type { Empresa, Miembro, Proveedor, Rol } from './empresas';
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
        empresa_id: f.empresa_id,
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
      empresa_id: typeof r['empresa_id'] === 'string' ? r['empresa_id'] : null,
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

  async miembroDe(chatId: number): Promise<Miembro | null> {
    const { data, error } = await this.db.from('telegram_miembros').select('chat_id, usuario_id, empresa_id, rol').eq('chat_id', chatId).maybeSingle();
    chequear(error);
    if (!data) return null;
    const r = data as Record<string, unknown>;
    return { chat_id: Number(r['chat_id']), usuario_id: r['usuario_id'] === null ? null : Number(r['usuario_id']), empresa_id: String(r['empresa_id']), rol: r['rol'] === 'DUENO' ? 'DUENO' : 'EQUIPO' };
  }

  private static empresaDe(r: Record<string, unknown>): Empresa {
    const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
    return {
      id: String(r['id']),
      nombre: String(r['nombre']),
      codigo: String(r['codigo']),
      es_demo: r['es_demo'] === true,
      dueno_chat_id: num(r['dueno_chat_id']),
      dueno_usuario_id: num(r['dueno_usuario_id']),
      limite_pago_usd_centavos: Number(r['limite_pago_usd_centavos']),
    };
  }

  async empresa(id: string): Promise<Empresa | null> {
    const { data, error } = await this.db.from('telegram_empresas').select('*').eq('id', id).maybeSingle();
    chequear(error);
    return data ? AlmacenSupabase.empresaDe(data as Record<string, unknown>) : null;
  }

  async empresaPorCodigo(codigo: string): Promise<Empresa | null> {
    const { data, error } = await this.db.from('telegram_empresas').select('*').eq('codigo', codigo).maybeSingle();
    chequear(error);
    return data ? AlmacenSupabase.empresaDe(data as Record<string, unknown>) : null;
  }

  async unirse(chatId: number, usuarioId: number | null, empresaId: string, rol: Rol): Promise<void> {
    const { error } = await this.db
      .from('telegram_miembros')
      .upsert({ chat_id: chatId, usuario_id: usuarioId, empresa_id: empresaId, rol, unido_en: new Date().toISOString() }, { onConflict: 'chat_id' });
    chequear(error);
  }

  async crearEmpresa(chatId: number, usuarioId: number, nombre: string, codigo: string): Promise<{ empresa_id: string; codigo: string; nueva: boolean } | null> {
    const { data, error } = await this.db.rpc('telegram_crear_empresa', { p_chat: chatId, p_usuario: usuarioId, p_nombre: nombre, p_codigo: codigo });
    chequear(error);
    const fila = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined;
    if (!fila) return null;
    return { empresa_id: String(fila['empresa_id']), codigo: String(fila['codigo']), nueva: fila['nueva'] === true };
  }

  async proveedores(empresaId: string): Promise<Proveedor[]> {
    const { data, error } = await this.db.from('telegram_proveedores').select('id_fiscal, cuenta, nombre, desde').eq('empresa_id', empresaId).limit(500);
    chequear(error);
    return ((data ?? []) as Record<string, unknown>[]).map((r) => ({ id_fiscal: String(r['id_fiscal']), cuenta: String(r['cuenta']), nombre: String(r['nombre']), desde: String(r['desde']).slice(0, 10) }));
  }

  async agregarProveedor(empresaId: string, p: Proveedor, por: number): Promise<void> {
    const { error } = await this.db
      .from('telegram_proveedores')
      .upsert({ empresa_id: empresaId, id_fiscal: p.id_fiscal, cuenta: p.cuenta, nombre: p.nombre, desde: p.desde, agregado_por: por }, { onConflict: 'empresa_id,id_fiscal,cuenta' });
    chequear(error);
  }

  async fijarLimite(empresaId: string, centavos: number): Promise<void> {
    const { error } = await this.db.from('telegram_empresas').update({ limite_pago_usd_centavos: centavos }).eq('id', empresaId).eq('es_demo', false);
    chequear(error);
  }
}
