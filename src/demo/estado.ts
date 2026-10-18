import defensas from '../../data/dev-set-defensas.json';
import dataset from '../../data/dev-set.json';
import indice from '../../data/facturas/indice.json';
import { decidir } from '../engine/decide';
import type { Config, Contexto, Decision, FacturaExtraida, ResultadoDecision } from '../engine/types';
import { AlmacenEnMemoria, Registro } from '../ledger';
import type { EntradaRegistro } from '../ledger';
import { facturaSinLectura, lecturaDe } from './lecturas';
import type { LecturaGrabada } from './lecturas';
import { VERSION_BASE, configDesdeParametros, parametrosPorDefecto } from './parametros';
import type { ParametrosReglas } from './parametros';

/**
 * Estado del modo replay: las 18 facturas del set de desarrollo (F-001 a F-015 y los casos de
 * defensas F-016 a F-018, que se procesan despues sobre el mismo contexto acumulado), decididas por
 * el motor, con su registro encadenado. Las extracciones son lecturas REALES grabadas (doble lectura
 * con dos modelos) y reproducidas: no se llama a ningun modelo ni se usan claves. Si falta la lectura
 * de una factura, se arma una factura con campos null y la alerta lector_fallo:replay_sin_lectura
 * (falla cerrada: el motor ESCALA). El contexto y la decision esperada siguen saliendo del dev-set.
 * Vive en memoria del servidor; no hay base de datos.
 */

export interface EventoAprobacion {
  factura_id: string;
  accion: 'APROBAR' | 'RECHAZAR';
  por: string;
  decidido_en: string;
  version_reglas: string;
  hash_decision: string;
}

/**
 * Una persona dice que el pago ya se hizo por fuera (en el banco o en Blinka) y anota la referencia
 * que le dio el banco. Pulso no lo comprueba ni mueve dinero: solo deja constancia para conciliar.
 */
export interface EventoPago {
  factura_id: string;
  referencia_banco: string;
  marcado_por: string;
  marcado_en: string;
  version_reglas: string;
  hash_decision: string;
}

export interface InstruccionPago {
  factura_id: string;
  beneficiario: string;
  id_fiscal: string;
  cuenta: string;
  monto_centavos: number;
  moneda: string;
  origen_aprobacion: 'AUTOMATICA_REGLAS' | 'PERSONA';
  aprobado_por: string | null;
  decision_hash: string;
}

export type EstadoAprobacion = 'NO_APLICA' | 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';

/** Documento fuente de la factura, segun data/facturas/indice.json. */
export interface FuenteDocumento {
  archivo: string;
  formato: string;
}

export interface FilaDemo {
  id: string;
  trampa: string;
  esperada: Decision;
  /** Lo que el lector extrajo (de la lectura grabada, o factura de falla cerrada si falta). */
  factura: FacturaExtraida;
  /** Lectura completa grabada (modelos, versiones, tiempos, costo); null si falta o es invalida. */
  lectura: LecturaGrabada | null;
  /** Archivo y formato del documento, de indice.json; null si el indice no lo trae. */
  fuente: FuenteDocumento | null;
  resultado: ResultadoDecision;
  entrada: EntradaRegistro;
}

/** Almacen de demostracion que permite simular una manipulacion para mostrar que se detecta. */
export class AlmacenManipulable extends AlmacenEnMemoria {
  corromper(indice: number): boolean {
    const e = this.entradas[indice];
    if (!e) return false;
    e.resultado.decision = e.resultado.decision === 'PAGAR' ? 'FRENAR' : 'PAGAR';
    return true;
  }
}

export interface EstadoDemo {
  /** Fecha y hora fijas del replay (el reloj de la demo). */
  ahora: string;
  parametros: ParametrosReglas;
  config: Config;
  edicion: number;
  filas: FilaDemo[];
  aprobaciones: Map<string, EventoAprobacion>;
  almacenDecisiones: AlmacenManipulable;
  registroDecisiones: Registro;
  registroAprobaciones: Registro<EventoAprobacion>;
  /** Ordenes marcadas como pagadas por una persona (una por factura). */
  pagos: Map<string, EventoPago>;
  registroPagos: Registro<EventoPago>;
  /** Punto de control tomado al terminar de sembrar las decisiones. */
  anclaInicial: { n: number; cabeza: string | null };
}

interface CasoJson {
  id: string;
  trampa: string;
  esperada: Decision;
  /** Extraccion escrita a mano del dev-set. Ya no se usa: se lee la lectura real grabada. */
  factura?: FacturaExtraida;
}

interface EntradaIndice {
  id: string;
  archivo: string;
  formato: string;
}

/** Reloj fijo del replay: la demo es repetible. */
const AHORA = dataset.contexto.ahora;

/**
 * `fuenteLecturas` solo existe para pruebas (falla cerrada, vencimientos sinteticos); por defecto se
 * usan las 18 lecturas grabadas importadas de forma estatica.
 */
export async function crearEstado(
  parametros: ParametrosReglas = parametrosPorDefecto(),
  edicion = 0,
  fuenteLecturas?: Record<string, unknown>,
): Promise<EstadoDemo> {
  const version = edicion === 0 ? VERSION_BASE : `${VERSION_BASE}+edicion.${edicion}`;
  const config = configDesdeParametros(parametros, version);
  const ctx = structuredClone(dataset.contexto) as unknown as Contexto;
  for (const [cat, usd] of Object.entries(parametros.presupuestos_usd)) ctx.presupuestos[cat] = usd * 100;

  const almacenDecisiones = new AlmacenManipulable();
  const registroDecisiones = new Registro(almacenDecisiones, () => AHORA);
  const registroAprobaciones = new Registro<EventoAprobacion>(new AlmacenEnMemoria<EventoAprobacion>(), () => AHORA);
  const registroPagos = new Registro<EventoPago>(new AlmacenEnMemoria<EventoPago>(), () => AHORA);
  const filas: FilaDemo[] = [];

  for (const caso of [...(dataset.facturas as unknown as CasoJson[]), ...(defensas.facturas as unknown as CasoJson[])]) {
    const lectura = fuenteLecturas ? lecturaDe(caso.id, fuenteLecturas) : lecturaDe(caso.id);
    const factura: FacturaExtraida = lectura ? lectura.resultado.factura : facturaSinLectura();
    const idx = (indice.facturas as EntradaIndice[]).find((x) => x.id === caso.id);
    const fuente: FuenteDocumento | null = idx ? { archivo: idx.archivo, formato: idx.formato } : null;
    const resultado = decidir(caso.id, factura, ctx, config);
    const entrada = await registroDecisiones.anadir(resultado);
    filas.push({ id: caso.id, trampa: caso.trampa, esperada: caso.esperada, factura, lectura, fuente, resultado, entrada });
    if (resultado.decision === 'PAGAR') {
      const f = factura;
      ctx.historial.push({
        numero_factura: f.numero_factura as string,
        id_fiscal: f.id_fiscal as string,
        monto_centavos: f.monto_centavos as number,
        moneda: f.moneda as string,
        categoria: f.categoria as string,
        fecha: ctx.ahora.slice(0, 10),
        estado: 'PAGADA',
      });
    }
  }
  return {
    ahora: AHORA,
    parametros,
    config,
    edicion,
    filas,
    aprobaciones: new Map(),
    almacenDecisiones,
    registroDecisiones,
    registroAprobaciones,
    pagos: new Map(),
    registroPagos,
    anclaInicial: await registroDecisiones.ancla(),
  };
}

export function estadoAprobacion(estado: EstadoDemo, fila: FilaDemo): EstadoAprobacion {
  if (fila.resultado.decision !== 'ESCALAR') return 'NO_APLICA';
  const ev = estado.aprobaciones.get(fila.id);
  if (!ev) return 'PENDIENTE';
  return ev.accion === 'APROBAR' ? 'APROBADA' : 'RECHAZADA';
}

/**
 * Unica salida hacia afuera. Solo existe para PAGAR (reglas) o ESCALAR aprobado por una persona.
 * Para FRENAR, y para ESCALAR sin aprobar o rechazado, devuelve null. El sistema no ejecuta pagos.
 */
export function instruccionPago(estado: EstadoDemo, fila: FilaDemo): InstruccionPago | null {
  const d = fila.resultado.decision;
  const ev = estado.aprobaciones.get(fila.id);
  let origen: InstruccionPago['origen_aprobacion'];
  if (d === 'PAGAR') origen = 'AUTOMATICA_REGLAS';
  else if (d === 'ESCALAR' && ev?.accion === 'APROBAR') origen = 'PERSONA';
  else return null;

  const f = fila.factura;
  if (!f.beneficiario || !f.id_fiscal || !f.cuenta || !f.moneda || typeof f.monto_centavos !== 'number' || f.monto_centavos < 1) return null;
  return {
    factura_id: fila.id,
    beneficiario: f.beneficiario,
    id_fiscal: f.id_fiscal,
    cuenta: f.cuenta,
    monto_centavos: f.monto_centavos,
    moneda: f.moneda,
    origen_aprobacion: origen,
    aprobado_por: origen === 'PERSONA' ? (ev?.por ?? null) : null,
    decision_hash: fila.entrada.hash,
  };
}

export type CodigoRechazo = 'NO_ENCONTRADA' | 'NO_SE_PUEDE_APROBAR' | 'YA_RESUELTA' | 'ACCION_INVALIDA';

export type ResultadoResolucion =
  | { ok: true; evento: EventoAprobacion; instruccion: InstruccionPago | null }
  | { ok: false; codigo: CodigoRechazo; mensaje: string };

const MENSAJES: Record<CodigoRechazo, string> = {
  NO_ENCONTRADA: 'La factura no existe.',
  NO_SE_PUEDE_APROBAR: 'Solo se pueden aprobar o rechazar facturas escaladas. Una factura frenada no tiene aprobación posible.',
  YA_RESUELTA: 'Esta factura ya fue resuelta.',
  ACCION_INVALIDA: 'La acción debe ser APROBAR o RECHAZAR.',
};

const rechazo = (codigo: CodigoRechazo): ResultadoResolucion => ({ ok: false, codigo, mensaje: MENSAJES[codigo] });

/**
 * Aprobar o rechazar una factura ESCALAR. Se hace cumplir en el servidor, no solo con
 * ocultar el boton: FRENAR y PAGAR se rechazan siempre. La resolucion queda en su propio
 * registro encadenado y, si falla la escritura, no cambia nada.
 */
export async function resolver(estado: EstadoDemo, facturaId: unknown, accion: unknown, por: string): Promise<ResultadoResolucion> {
  if (accion !== 'APROBAR' && accion !== 'RECHAZAR') return rechazo('ACCION_INVALIDA');
  const fila = typeof facturaId === 'string' ? estado.filas.find((f) => f.id === facturaId) : undefined;
  if (!fila) return rechazo('NO_ENCONTRADA');
  if (fila.resultado.decision !== 'ESCALAR') return rechazo('NO_SE_PUEDE_APROBAR');
  if (estado.aprobaciones.has(fila.id)) return rechazo('YA_RESUELTA');

  const evento: EventoAprobacion = {
    factura_id: fila.id,
    accion,
    por,
    decidido_en: dataset.contexto.ahora,
    version_reglas: fila.resultado.version_reglas,
    hash_decision: fila.entrada.hash,
  };
  // Reserva el lugar antes de esperar la escritura para que dos clics simultaneos no resuelvan dos veces.
  estado.aprobaciones.set(fila.id, evento);
  try {
    await estado.registroAprobaciones.anadir(evento);
  } catch {
    estado.aprobaciones.delete(fila.id);
    throw new Error('No se pudo registrar la resolucion; no se aplico.');
  }
  return { ok: true, evento, instruccion: instruccionPago(estado, fila) };
}

/** Costo total de leer las facturas, sumado de las lecturas grabadas (nunca inventado). */
export function costoLecturasUsd(estado: EstadoDemo): number {
  return estado.filas.reduce((s, f) => s + (f.lectura?.resultado.costo_usd ?? 0), 0);
}

/** Confianza final de la lectura (la menor de las dos), o null si no hay. */
export function confianzaDe(fila: FilaDemo): number | null {
  return typeof fila.factura.confianza === 'number' ? fila.factura.confianza : null;
}

export function resumen(estado: EstadoDemo) {
  const cuenta = { PAGAR: 0, FRENAR: 0, ESCALAR: 0 };
  for (const f of estado.filas) cuenta[f.resultado.decision]++;
  const pendientes = estado.filas.filter((f) => estadoAprobacion(estado, f) === 'PENDIENTE').length;
  const total = estado.filas.length;
  // Cuantas coinciden con la decision esperada del set. Es una medida sobre el set de desarrollo
  // (el mismo con el que se afinaron las reglas): no mide generalizacion.
  const decididasBien = estado.filas.filter((f) => f.resultado.decision === f.esperada).length;
  return {
    total,
    ...cuenta,
    pendientes,
    sinPersona: cuenta.PAGAR + cuenta.FRENAR,
    decididasBien,
    pctSinPersona: total === 0 ? 0 : Math.round(((cuenta.PAGAR + cuenta.FRENAR) / total) * 1000) / 10,
  };
}
