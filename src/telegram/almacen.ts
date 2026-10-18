import type { Decision, Razon } from '../engine/types';

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

export type NuevaFactura = Omit<FacturaVivo, 'id' | 'simulada' | 'resuelta_por'>;

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
}
