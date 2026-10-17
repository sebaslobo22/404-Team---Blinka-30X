export type Decision = 'PAGAR' | 'FRENAR' | 'ESCALAR';
export type Efecto = 'FRENAR' | 'ESCALAR';

/** Salida del extractor. Todo campo critico puede venir null: eso implica ESCALAR. */
export interface FacturaExtraida {
  numero_factura: string | null;
  beneficiario: string | null;
  id_fiscal: string | null;
  cuenta: string | null;
  monto_centavos: number | null;
  moneda: string | null;
  fecha_emision: string | null;
  categoria: string | null;
  lineas?: { descripcion: string; monto_centavos: number }[];
}

export interface CuentaRegistrada {
  cuenta: string;
  /** Fecha ISO (AAAA-MM-DD) desde la que la cuenta esta registrada. */
  desde: string;
}

export interface BeneficiarioPermitido {
  id_fiscal: string;
  nombre: string;
  cuentas: CuentaRegistrada[];
}

export interface Acuerdo {
  id_fiscal: string;
  moneda: string;
  monto_centavos: number;
  categoria?: string;
}

export interface Historial {
  numero_factura: string;
  id_fiscal: string;
  monto_centavos: number;
  moneda: string;
  categoria: string;
  /** Fecha ISO (AAAA-MM-DD) del pago o de la reserva. */
  fecha: string;
  estado: 'PAGADA' | 'RESERVADA' | 'RECHAZADA';
}

export interface Contexto {
  /** Fecha y hora ISO de la decision. Se pasa de fuera para que el motor sea puro. */
  ahora: string;
  beneficiarios: BeneficiarioPermitido[];
  acuerdos: Acuerdo[];
  /** Presupuesto mensual por categoria, en centavos de USD. */
  presupuestos: Record<string, number>;
  historial: Historial[];
}

export interface Config {
  version: string;
  limite_pago_usd_centavos: number;
  tope_mensual_usd_centavos: number;
  ventana_duplicado_dias: number;
  /** Tolerancia del cotejo, en puntos base (200 = 2%). */
  tolerancia_bps: number;
  ventana_cuenta_dias: number;
  /** Unidades de cada moneda por 1 USD, multiplicadas por 1000 (enteros). */
  tasas_milli: Record<string, number>;
}

export interface Razon {
  regla: string;
  efecto: Efecto;
}

export type Hecho = number | string | boolean | null;

export interface ResultadoDecision {
  factura_id: string;
  decision: Decision;
  razones: Razon[];
  version_reglas: string;
  hechos: Record<string, Hecho>;
  explicacion: string;
  decidido_en: string;
}
