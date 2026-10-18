import { randomUUID } from 'node:crypto';
import type { Almacen, Cupo, FacturaVivo, NuevaFactura } from './almacen';
import { ID_DEMO, type Empresa, type Miembro, type Proveedor, type Rol } from './empresas';

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
  readonly empresas = new Map<string, Empresa>([[ID_DEMO, { id: ID_DEMO, nombre: 'Aurora Cloud (demo)', codigo: 'PULSO-DEMO22', es_demo: true, dueno_chat_id: null, dueno_usuario_id: null, limite_pago_usd_centavos: 500000 }]]);
  readonly miembros = new Map<number, Miembro>();
  readonly provs = new Map<string, Proveedor[]>();
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

  async miembroDe(chatId: number): Promise<Miembro | null> {
    this.vivo();
    const m = this.miembros.get(chatId);
    return m ? { ...m } : null;
  }

  async empresa(id: string): Promise<Empresa | null> {
    this.vivo();
    const e = this.empresas.get(id);
    return e ? { ...e } : null;
  }

  async empresaPorCodigo(codigo: string): Promise<Empresa | null> {
    this.vivo();
    const e = [...this.empresas.values()].find((x) => x.codigo === codigo);
    return e ? { ...e } : null;
  }

  async unirse(chatId: number, usuarioId: number | null, empresaId: string, rol: Rol): Promise<void> {
    this.vivo();
    if (!this.empresas.has(empresaId)) throw new Error('empresa_inexistente');
    this.miembros.set(chatId, { chat_id: chatId, usuario_id: usuarioId, empresa_id: empresaId, rol });
  }

  async crearEmpresa(chatId: number, usuarioId: number, nombre: string, codigo: string): Promise<{ empresa_id: string; codigo: string; nueva: boolean } | null> {
    this.vivo();
    const m = this.miembros.get(chatId);
    const porMiembro = m && m.rol === 'DUENO' ? this.empresas.get(m.empresa_id) : undefined;
    const actual = porMiembro && !porMiembro.es_demo ? porMiembro : [...this.empresas.values()].find((e) => !e.es_demo && e.dueno_chat_id === chatId);
    if (actual) {
      this.miembros.set(chatId, { chat_id: chatId, usuario_id: usuarioId, empresa_id: actual.id, rol: 'DUENO' });
      return { empresa_id: actual.id, codigo: actual.codigo, nueva: false };
    }
    if ([...this.empresas.values()].some((e) => e.codigo === codigo)) return null;
    const id = randomUUID();
    this.empresas.set(id, { id, nombre, codigo, es_demo: false, dueno_chat_id: chatId, dueno_usuario_id: usuarioId, limite_pago_usd_centavos: 500000 });
    this.miembros.set(chatId, { chat_id: chatId, usuario_id: usuarioId, empresa_id: id, rol: 'DUENO' });
    return { empresa_id: id, codigo, nueva: true };
  }

  async proveedores(empresaId: string): Promise<Proveedor[]> {
    this.vivo();
    return (this.provs.get(empresaId) ?? []).map((p) => ({ ...p }));
  }

  async agregarProveedor(empresaId: string, p: Proveedor, _por: number): Promise<void> {
    this.vivo();
    const lista = (this.provs.get(empresaId) ?? []).filter((x) => !(x.id_fiscal === p.id_fiscal && x.cuenta === p.cuenta));
    lista.push({ ...p });
    this.provs.set(empresaId, lista);
  }

  async fijarLimite(empresaId: string, centavos: number): Promise<void> {
    this.vivo();
    const e = this.empresas.get(empresaId);
    if (e) e.limite_pago_usd_centavos = centavos;
  }
}
