import type { Decision, Razon } from '../engine/types';
import type { Empresa, Miembro, Proveedor, Rol } from './empresas';

/**
 * Capa de datos del bot detras de una interfaz. En produccion es Supabase (supabase.ts); en pruebas, un
 * doble en memoria (memoria.ts). Toda operacion puede lanzar: quien llama trata cualquier error como
 * "servicio no disponible" y NO procesa (falla cerrada).
 */

export type EstadoResolucion = 'NO_APLICA' | 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';

/** Datos de prueba de la factura (ficticios) que se guardan para mostrarlos al dueno. Nunca claves ni el archivo. */
export interface ResumenFactura {
  beneficiario: string | null;
  numero_factura: string | null;
  monto_centavos: number | null;
  moneda: string | null;
}

export interface FacturaVivo {
  id: string;
  chat_id: number;
  /** Empresa con cuyas reglas se decidio. null solo en filas anteriores a 0004 (nadie las aprueba). */
  empresa_id: string | null;
  update_id: number;
  decision: Decision;
  /** Decision del motor antes del techo en vivo. */
  decision_motor: Decision;
  razones: Razon[];
  resumen: ResumenFactura;
  estado_resolucion: EstadoResolucion;
  /** Toda orden en vivo es simulada: no entra al lote CSV ni a la API de ordenes de la web. */
  simulada: true;
  resuelta_por: number | null;
}

export type NuevaFactura = Omit<FacturaVivo, 'id' | 'simulada' | 'resuelta_por' | 'empresa_id'> & { empresa_id: string };

/** Resultado de reservar un lugar en los limites. */
export type Cupo = 'ok' | 'chat' | 'dia';

export interface Almacen {
  /** INSERT atomico del update_id. true = nuevo (hay que procesarlo); false = ya visto (descartar). */
  registrarUpdate(updateId: number): Promise<boolean>;
  chatIniciado(chatId: number): Promise<boolean>;
  iniciarChat(chatId: number, usuarioId: number | null): Promise<void>;
  /**
   * Cuenta de forma atomica una factura contra el limite por chat en la ultima hora y el tope global del
   * dia. Si no hay lugar devuelve 'chat' o 'dia' y no cuenta nada.
   */
  consumirCupo(chatId: number, ahora: Date, maxPorChatHora: number, topeDiario: number): Promise<Cupo>;
  guardarFactura(f: NuevaFactura): Promise<string>;
  obtenerFactura(id: string): Promise<FacturaVivo | null>;
  /**
   * UPDATE condicional atomico: solo cambia si decision = ESCALAR y estado_resolucion = PENDIENTE.
   * true si esta llamada la resolvio; false si no habia nada que resolver (ya resuelta, FRENAR, no existe).
   */
  resolverFactura(id: string, estado: 'APROBADA' | 'RECHAZADA', por: number): Promise<boolean>;

  // --- Empresas (migracion 0004) ---
  miembroDe(chatId: number): Promise<Miembro | null>;
  empresa(id: string): Promise<Empresa | null>;
  empresaPorCodigo(codigo: string): Promise<Empresa | null>;
  /** Upsert de la membresia del chat (un chat, una empresa). */
  unirse(chatId: number, usuarioId: number | null, empresaId: string, rol: Rol): Promise<void>;
  /**
   * Atomico (RPC telegram_crear_empresa): si el chat ya es dueno de una empresa la devuelve (nueva=false);
   * si no, la crea con `codigo` y deja al chat como DUENO. null si el codigo choco (reintentar con otro).
   */
  crearEmpresa(chatId: number, usuarioId: number, nombre: string, codigo: string): Promise<{ empresa_id: string; codigo: string; nueva: boolean } | null>;
  proveedores(empresaId: string): Promise<Proveedor[]>;
  /**
   * Solo lectura, para el modo conversacional: las ultimas facturas de la empresa, de la mas nueva a la mas vieja.
   * Con `soloChat` filtra tambien por chat (la empresa demo la comparte todo el mundo: nadie ve lo de otro).
   */
  ultimasFacturas(empresaId: string, limite: number, soloChat?: number): Promise<FacturaVivo[]>;
  /** Solo lectura: facturas ESCALADAS que esperan al dueno (mismo filtro opcional por chat). */
  contarPendientes(empresaId: string, soloChat?: number): Promise<number>;
  agregarProveedor(empresaId: string, p: Proveedor, por: number): Promise<void>;
  fijarLimite(empresaId: string, centavos: number): Promise<void>;
}
