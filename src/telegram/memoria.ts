import { randomUUID } from 'node:crypto';
import type { Almacen, Cupo, FacturaVivo, NuevaFactura } from './almacen';

/**
 * Doble en memoria del almacen. SOLO para pruebas y para el modo local de desarrollo. El webhook de
 * produccion nunca lo usa: sin Supabase rechaza (falla cerrada). Las operaciones son sincronas por dentro,
 * asi que son atomicas igual que lo seran las de la base (INSERT ... ON CONFLICT, UPDATE condicional).
 */
export class AlmacenEnMemoria implements Almacen {
  readonly updates = new Set<number>();
  readonly chats = new Map<number, number | null>();
  readonly facturas = new Map<string, FacturaVivo>();
  private readonly usos: { chat: number; en: number }[] = [];
  /** Si se pone, toda operacion lanza: simula una caida de Supabase. */
  caido = false;

  private vivo(): void {
    if (this.caido) throw new Error('almacen_caido');
  }

  async registrarUpdate(updateId: number): Promise<boolean> {
    this.vivo();
    if (this.updates.has(updateId)) return false;
    this.updates.add(updateId);
    return true;
  }

  async chatIniciado(chatId: number): Promise<boolean> {
    this.vivo();
    return this.chats.has(chatId);
  }

  async iniciarChat(chatId: number, usuarioId: number | null): Promise<void> {
    this.vivo();
    if (!this.chats.has(chatId)) this.chats.set(chatId, usuarioId);
  }

  async consumirCupo(chatId: number, ahora: Date, maxPorChatHora: number, topeDiario: number): Promise<Cupo> {
    this.vivo();
    const t = ahora.getTime();
    const dia = ahora.toISOString().slice(0, 10);
    const enHora = this.usos.filter((u) => u.chat === chatId && u.en > t - 3_600_000 && u.en <= t).length;
    if (enHora >= maxPorChatHora) return 'chat';
    const enDia = this.usos.filter((u) => new Date(u.en).toISOString().slice(0, 10) === dia).length;
    if (enDia >= topeDiario) return 'dia';
    this.usos.push({ chat: chatId, en: t });
    return 'ok';
  }

  async guardarFactura(f: NuevaFactura): Promise<string> {
    this.vivo();
    const id = randomUUID();
    this.facturas.set(id, { ...f, id, simulada: true, resuelta_por: null });
    return id;
  }

  async obtenerFactura(id: string): Promise<FacturaVivo | null> {
    this.vivo();
    const f = this.facturas.get(id);
    return f ? structuredClone(f) : null;
  }

  async resolverFactura(id: string, estado: 'APROBADA' | 'RECHAZADA', por: number): Promise<boolean> {
    this.vivo();
    const f = this.facturas.get(id);
    if (!f || f.decision !== 'ESCALAR' || f.estado_resolucion !== 'PENDIENTE') return false;
    f.estado_resolucion = estado;
    f.resuelta_por = por;
    return true;
  }
}
