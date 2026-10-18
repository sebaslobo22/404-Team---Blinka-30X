import { instruccionPago } from './estado';
import type { EstadoDemo, EventoPago, FilaDemo, InstruccionPago } from './estado';
import { VENCIMIENTO_DIFIEREN, vencimientoDe } from './vencimiento';

/**
 * Orden de pago "lista para Blinka". FORMATO PROPUESTO: Blinka no publica una API, asi que estos
 * campos son nuestra propuesta de lo que un sistema de pagos necesitaria, no un contrato de Blinka.
 * Pulso no ejecuta pagos: la orden es la unica salida hacia afuera y la ejecuta otro sistema o una
 * persona. Las funciones de conversion son puras; marcarPagada() solo deja constancia.
 */

export const FORMATO_ORDEN = 'pulso-orden-blinka/propuesto-v1' as const;
export const AVISO_ORDEN = 'Formato propuesto para Blinka. Pulso no ejecuta pagos.' as const;

export type CodigoRiel = 'BRE_B' | 'SPEI' | 'PIX' | 'SEPA' | 'CBU_CVU' | 'ACH' | 'SWIFT' | 'POR_DEFINIR';

export interface RielSugerido {
  codigo: CodigoRiel;
  /** Nombre visible del riel. */
  nombre: string;
  /** Por que se sugiere, en palabras simples. */
  motivo: string;
}

export type EstadoOrden = 'EMITIDA' | 'MARCADA_PAGADA';

export interface OrdenBlinka extends InstruccionPago {
  formato: typeof FORMATO_ORDEN;
  aviso: typeof AVISO_ORDEN;
  /** Monto en unidades con 2 decimales, como texto (sin flotantes). */
  monto: string;
  /** Numero de la factura, para que el proveedor reconozca el pago. */
  referencia: string | null;
  /** Tipo de gasto de la factura. */
  concepto: string | null;
  /** Vencimiento leido en la factura (AAAA-MM-DD), o null si no hay uno claro. */
  fecha_sugerida: string | null;
  /** Pais del beneficiario segun el prefijo de su ID fiscal ficticio (FIC-XX-), o null. */
  pais_beneficiario: string | null;
  riel: RielSugerido;
  version_reglas: string;
  estado: EstadoOrden;
  /** Constancia de la persona que marco la orden como pagada; null mientras este EMITIDA. */
  pago: { referencia_banco: string; marcado_por: string; marcado_en: string } | null;
}

/** Datos de la factura que la orden agrega a la instruccion de pago. */
export interface DatosOrden {
  numero_factura: string | null;
  categoria: string | null;
  vencimiento: string | null;
  version_reglas: string;
}

/** Pais (codigo de 2 letras) del prefijo del ID fiscal ficticio: FIC-PE-001 -> PE. */
export function paisDeIdFiscal(idFiscal: unknown): string | null {
  if (typeof idFiscal !== 'string') return null;
  const m = /^FIC-([A-Z]{2})-/.exec(idFiscal.trim().toUpperCase());
  return m ? m[1]! : null;
}

const POR_DEFINIR: RielSugerido = {
  codigo: 'POR_DEFINIR',
  nombre: 'Por definir: lo elige una persona',
  motivo: 'No hay un riel claro para esta moneda y este país. Pulso no lo adivina.',
};

/** Rieles de un solo pais: solo se sugieren si el beneficiario esta en ese pais. */
const LOCALES: Record<string, { pais: string; riel: RielSugerido }> = {
  COP: { pais: 'CO', riel: { codigo: 'BRE_B', nombre: 'Bre-B', motivo: 'Pago en pesos colombianos a un proveedor en Colombia.' } },
  MXN: { pais: 'MX', riel: { codigo: 'SPEI', nombre: 'SPEI', motivo: 'Pago en pesos mexicanos a un proveedor en México.' } },
  BRL: { pais: 'BR', riel: { codigo: 'PIX', nombre: 'Pix', motivo: 'Pago en reales a un proveedor en Brasil.' } },
  ARS: { pais: 'AR', riel: { codigo: 'CBU_CVU', nombre: 'CBU/CVU', motivo: 'Pago en pesos argentinos a un proveedor en Argentina.' } },
};

/**
 * Paises de la zona SEPA que damos por seguros (UE 27, EEE, Suiza, Reino Unido y microestados).
 * Si el pais no esta aqui, un pago en EUR queda "por definir": mejor preguntar que suponer.
 */
const ZONA_SEPA = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK',
  'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'CH', 'GB', 'MC', 'SM', 'AD', 'VA',
]);

/**
 * Riel sugerido segun moneda y pais del beneficiario. Solo los rieles que Blinka dice tener.
 * Cualquier caso que no encaje (por ejemplo PEN: Blinka tiene ruta en Peru pero no la detalla)
 * queda "por definir" para que lo elija una persona.
 */
export function rielSugerido(moneda: unknown, pais: string | null): RielSugerido {
  if (typeof moneda !== 'string') return POR_DEFINIR;
  const m = moneda.trim().toUpperCase();
  const local = LOCALES[m];
  if (local) return pais === local.pais ? local.riel : POR_DEFINIR;
  if (m === 'EUR') {
    return pais !== null && ZONA_SEPA.has(pais) ? { codigo: 'SEPA', nombre: 'SEPA', motivo: 'Pago en euros a un proveedor en la zona SEPA.' } : POR_DEFINIR;
  }
  if (m === 'USD' && pais === 'US') return { codigo: 'ACH', nombre: 'ACH', motivo: 'Pago en dólares a un proveedor en Estados Unidos.' };
  if (m === 'USD' && pais !== null) {
    return { codigo: 'SWIFT', nombre: 'Wire internacional (SWIFT)', motivo: 'Pago en dólares a un proveedor fuera de Estados Unidos.' };
  }
  return POR_DEFINIR;
}

/** Centavos enteros a texto con 2 decimales, sin pasar por flotantes: 980000 -> "9800.00". */
export function montoUnidades(centavos: number): string {
  if (!Number.isSafeInteger(centavos)) throw new Error('El monto debe ser un entero de centavos.');
  const signo = centavos < 0 ? '-' : '';
  const abs = Math.abs(centavos);
  return `${signo}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/** Funcion pura: instruccion de pago + datos de la factura (+ pago marcado, si lo hay) -> orden. */
export function construirOrden(instruccion: InstruccionPago, datos: DatosOrden, pago: EventoPago | null = null): OrdenBlinka {
  const pais = paisDeIdFiscal(instruccion.id_fiscal);
  return {
    formato: FORMATO_ORDEN,
    aviso: AVISO_ORDEN,
    ...instruccion,
    monto: montoUnidades(instruccion.monto_centavos),
    referencia: datos.numero_factura,
    concepto: datos.categoria,
    fecha_sugerida: datos.vencimiento,
    pais_beneficiario: pais,
    riel: rielSugerido(instruccion.moneda, pais),
    version_reglas: datos.version_reglas,
    estado: pago ? 'MARCADA_PAGADA' : 'EMITIDA',
    pago: pago ? { referencia_banco: pago.referencia_banco, marcado_por: pago.marcado_por, marcado_en: pago.marcado_en } : null,
  };
}

/** Orden de una fila del estado, o null si no hay instruccion de pago (FRENAR, ESCALAR sin aprobar...). */
export function ordenDe(estado: EstadoDemo, fila: FilaDemo): OrdenBlinka | null {
  const instruccion = instruccionPago(estado, fila);
  if (!instruccion) return null;
  const v = vencimientoDe(fila);
  return construirOrden(
    instruccion,
    {
      numero_factura: fila.factura.numero_factura ?? null,
      categoria: fila.factura.categoria ?? null,
      vencimiento: v === VENCIMIENTO_DIFIEREN ? null : v,
      version_reglas: fila.resultado.version_reglas,
    },
    estado.pagos.get(fila.id) ?? null,
  );
}

/** Todas las ordenes del estado, en el orden del set. */
export function ordenes(estado: EstadoDemo): OrdenBlinka[] {
  return estado.filas.map((f) => ordenDe(estado, f)).filter((o): o is OrdenBlinka => o !== null);
}

/**
 * Ordenes que faltan por pagar. Es lo que va al lote CSV por defecto: si una orden ya marcada como
 * pagada saliera en el lote, un importador que no lea la columna "estado" la pagaria dos veces.
 */
export function ordenesPorPagar(estado: EstadoDemo): OrdenBlinka[] {
  return ordenes(estado).filter((o) => o.estado === 'EMITIDA');
}

/** Texto plano para pegar en el banco y pagar a mano. */
export function textoParaPagar(o: OrdenBlinka): string {
  return [
    `Beneficiario: ${o.beneficiario}`,
    `ID fiscal: ${o.id_fiscal}`,
    `Cuenta: ${o.cuenta}`,
    `Monto: ${o.moneda} ${o.monto}`,
    `Referencia: ${o.referencia ?? 'Sin número de factura'}`,
    `Concepto: ${o.concepto ?? 'Sin tipo de gasto'}`,
    `Fecha sugerida: ${o.fecha_sugerida ?? 'Sin fecha de vencimiento'}`,
    `Riel sugerido: ${o.riel.nombre}`,
    `Factura en Pulso: ${o.factura_id}`,
    AVISO_ORDEN,
  ].join('\n');
}

// ---------------------------------------------------------------- CSV del lote

export const COLUMNAS_CSV = [
  'factura', 'referencia', 'beneficiario', 'id_fiscal', 'pais', 'cuenta', 'moneda', 'monto', 'concepto', 'fecha_sugerida',
  'riel', 'origen', 'aprobado_por', 'version_reglas', 'hash_decision', 'estado', 'referencia_banco',
] as const;

/**
 * Celda CSV. Los datos vienen de facturas (no confiables). Toda celda va entre comillas, asi un ';'
 * o un tabulador dentro del texto no parte la celda aunque la hoja de calculo use otro separador
 * (Excel en espanol usa ';'). Si la celda empieza como formula (=, +, -, @, tabulador, retorno), se
 * antepone un apostrofo para que no se ejecute.
 */
export function celdaCsv(valor: string | number | null): string {
  let t = valor === null ? '' : String(valor);
  if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
  return `"${t.replace(/"/g, '""')}"`;
}

/** CSV del lote: una fila por orden, encabezados en la primera linea, separador coma, fin de linea CRLF. */
export function ordenesCsv(lista: OrdenBlinka[]): string {
  const filas = lista.map((o) =>
    [
      o.factura_id, o.referencia, o.beneficiario, o.id_fiscal, o.pais_beneficiario, o.cuenta, o.moneda, o.monto, o.concepto, o.fecha_sugerida,
      o.riel.nombre, o.origen_aprobacion === 'PERSONA' ? 'Persona' : 'Reglas', o.aprobado_por, o.version_reglas, o.decision_hash, o.estado,
      o.pago?.referencia_banco ?? null,
    ].map(celdaCsv).join(','),
  );
  return [COLUMNAS_CSV.map(celdaCsv).join(','), ...filas].join('\r\n') + '\r\n';
}

// ---------------------------------------------------------------- Marcar como pagada

export type CodigoRechazoPago = 'NO_ENCONTRADA' | 'SIN_ORDEN' | 'YA_RESUELTA' | 'REFERENCIA_INVALIDA';

export type ResultadoPago =
  | { ok: true; evento: EventoPago; orden: OrdenBlinka }
  | { ok: false; codigo: CodigoRechazoPago; mensaje: string };

export const MAX_REFERENCIA_BANCO = 64;

const MENSAJES_PAGO: Record<CodigoRechazoPago, string> = {
  NO_ENCONTRADA: 'La factura no existe.',
  SIN_ORDEN: 'Esta factura no tiene orden de pago. Una factura frenada, o escalada sin aprobar, no se puede marcar como pagada.',
  YA_RESUELTA: 'Esta orden ya fue marcada como pagada.',
  REFERENCIA_INVALIDA: `Escribe la referencia que te dio el banco (hasta ${MAX_REFERENCIA_BANCO} caracteres).`,
};

const rechazoPago = (codigo: CodigoRechazoPago): ResultadoPago => ({ ok: false, codigo, mensaje: MENSAJES_PAGO[codigo] });

/** Referencia del banco limpia, o null si no es valida: texto no vacio, sin caracteres de control, hasta 64. */
export function limpiarReferencia(x: unknown): string | null {
  if (typeof x !== 'string') return null;
  const t = x.trim();
  // eslint-disable-next-line no-control-regex
  if (t.length === 0 || t.length > MAX_REFERENCIA_BANCO || /[\u0000-\u001f\u007f]/.test(t)) return null;
  return t;
}

/**
 * Marca como pagada la orden de una factura. Se hace cumplir en el servidor: sin orden (FRENAR, o
 * ESCALAR sin aprobar o rechazado) se rechaza. Queda en su propio registro encadenado y, si falla la
 * escritura, no cambia nada. No mueve dinero ni comprueba el pago con el banco.
 */
export async function marcarPagada(estado: EstadoDemo, facturaId: unknown, referenciaBanco: unknown, por: string): Promise<ResultadoPago> {
  const referencia = limpiarReferencia(referenciaBanco);
  if (referencia === null) return rechazoPago('REFERENCIA_INVALIDA');
  const fila = typeof facturaId === 'string' ? estado.filas.find((f) => f.id === facturaId) : undefined;
  if (!fila) return rechazoPago('NO_ENCONTRADA');
  if (!ordenDe(estado, fila)) return rechazoPago('SIN_ORDEN');
  if (estado.pagos.has(fila.id)) return rechazoPago('YA_RESUELTA');

  const evento: EventoPago = {
    factura_id: fila.id,
    referencia_banco: referencia,
    marcado_por: por,
    marcado_en: estado.ahora,
    version_reglas: fila.resultado.version_reglas,
    hash_decision: fila.entrada.hash,
  };
  // Reserva el lugar antes de esperar la escritura para que dos clics simultaneos no marquen dos veces.
  estado.pagos.set(fila.id, evento);
  try {
    await estado.registroPagos.anadir(evento);
  } catch {
    estado.pagos.delete(fila.id);
    throw new Error('No se pudo registrar el pago; no se aplicó.');
  }
  return { ok: true, evento, orden: ordenDe(estado, fila)! };
}
