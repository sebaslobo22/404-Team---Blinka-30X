import { formatoUsd } from './money';
import type { Config, Efecto, Hecho, ResultadoDecision } from './types';

export interface Comprobacion {
  codigo: string;
  /** Nombre legible en espanol. */
  nombre: string;
  resultado: 'ok' | 'falla' | 'no_evaluada';
  /** Que pasa si la comprobacion falla. */
  efecto: Efecto;
  detalle: string;
}

type Hechos = Record<string, Hecho>;
const n = (h: Hechos, k: string) => (typeof h[k] === 'number' ? String(h[k]) : '?');
const usd = (h: Hechos, k: string) => (typeof h[k] === 'number' ? formatoUsd(h[k] as number) : '?');

interface Def {
  codigo: string;
  nombre: string;
  efecto: Efecto;
  /** true si el motor llego a evaluar la regla, dados los hechos y las razones. */
  evaluada: (h: Hechos, falla: (c: string) => boolean) => boolean;
  ok: (h: Hechos, cfg: Config) => string;
  falla: (h: Hechos, cfg: Config) => string;
}

const tras7 = (h: Hechos) => h['campos_invalidos_n'] === undefined;
const llegoR2 = (h: Hechos, falla: (c: string) => boolean) => tras7(h) && !falla('R2');

// Orden = orden de evaluacion del motor.
const DEFS: Def[] = [
  {
    codigo: 'EXTRACCION', nombre: 'Sin alertas de la lectura', efecto: 'ESCALAR', evaluada: () => true,
    ok: () => 'El lector no levantó alertas de seguridad.',
    falla: (h) => `El lector levantó ${n(h, 'alertas_n')} alerta(s) de seguridad en el documento.`,
  },
  {
    codigo: 'INYECCION', nombre: 'Sin instrucciones ocultas en la factura', efecto: 'ESCALAR', evaluada: () => true,
    ok: () => 'La factura no contiene órdenes dirigidas al agente.',
    falla: () => 'La factura contiene texto que intenta dar órdenes al agente; se ignora como orden y se pide revisión.',
  },
  {
    codigo: 'CONFIANZA', nombre: 'Lectura confiable de la factura', efecto: 'ESCALAR',
    evaluada: (h) => h['confianza_valida'] !== undefined,
    ok: (h) => `La lectura tiene confianza de ${n(h, 'confianza_pct')} por ciento (mínimo ${n(h, 'confianza_minima_pct')} por ciento).`,
    falla: (h) =>
      h['confianza_valida'] === true
        ? `La lectura tiene confianza de ${n(h, 'confianza_pct')} por ciento, bajo el mínimo de ${n(h, 'confianza_minima_pct')} por ciento.`
        : 'El lector no reportó una confianza válida.',
  },
  {
    codigo: 'R7', nombre: 'Datos completos y moneda aceptada', efecto: 'ESCALAR', evaluada: () => true,
    ok: () => 'Todos los campos críticos están completos y la moneda es aceptada.',
    falla: (h) => `Hay ${n(h, 'campos_invalidos_n')} campo(s) crítico(s) faltantes o inválidos.`,
  },
  {
    codigo: 'R2', nombre: 'Beneficiario y cuenta en la lista aprobada', efecto: 'FRENAR', evaluada: tras7,
    ok: () => 'El ID fiscal y la cuenta están en la lista de beneficiarios aprobados.',
    falla: () => 'El beneficiario o la cuenta no están en la lista aprobada.',
  },
  {
    codigo: 'REGISTRO', nombre: 'Nombre coincide con el registro', efecto: 'ESCALAR', evaluada: llegoR2,
    ok: () => 'El nombre leído coincide con el nombre registrado.',
    falla: () => 'El nombre leído no coincide con el registrado para este ID fiscal y esta cuenta.',
  },
  {
    codigo: 'R8', nombre: 'Cuenta bancaria sin cambios recientes', efecto: 'ESCALAR', evaluada: llegoR2,
    ok: (h) => `La cuenta se registró hace ${n(h, 'horas_desde_cambio_cuenta')} horas, fuera de la ventana de ${n(h, 'ventana_cuenta_dias')} días.`,
    falla: (h) =>
      h['horas_desde_cambio_cuenta'] === null
        ? 'No se pudo leer la fecha de registro de la cuenta.'
        : `La cuenta se registró hace ${n(h, 'horas_desde_cambio_cuenta')} horas, dentro de la ventana de ${n(h, 'ventana_cuenta_dias')} días.`,
  },
  {
    codigo: 'R1', nombre: 'Dentro del límite por pago', efecto: 'ESCALAR', evaluada: tras7,
    ok: (h) => `${usd(h, 'monto_usd_centavos')} USD no supera el límite de ${usd(h, 'limite_pago_usd_centavos')} USD.`,
    falla: (h) => `${usd(h, 'monto_usd_centavos')} USD supera el límite de ${usd(h, 'limite_pago_usd_centavos')} USD por pago.`,
  },
  {
    codigo: 'R3', nombre: 'Dentro del tope mensual del beneficiario', efecto: 'ESCALAR', evaluada: tras7,
    ok: (h) => `El acumulado del mes sería ${usd(h, 'acumulado_mes_con_pago_usd_centavos')} USD, bajo el tope de ${usd(h, 'tope_mensual_usd_centavos')} USD.`,
    falla: (h) => `El acumulado del mes sería ${usd(h, 'acumulado_mes_con_pago_usd_centavos')} USD y el tope es ${usd(h, 'tope_mensual_usd_centavos')} USD.`,
  },
  {
    codigo: 'R4', nombre: 'Hay presupuesto en la categoría', efecto: 'FRENAR', evaluada: tras7,
    ok: (h) => `El gasto de la categoría sería ${usd(h, 'gasto_categoria_con_pago_usd_centavos')} USD, dentro del presupuesto de ${usd(h, 'presupuesto_categoria_usd_centavos')} USD.`,
    falla: (h) =>
      h['presupuesto_configurado'] === false
        ? 'La categoría no tiene presupuesto configurado.'
        : `El gasto de la categoría sería ${usd(h, 'gasto_categoria_con_pago_usd_centavos')} USD y el presupuesto es ${usd(h, 'presupuesto_categoria_usd_centavos')} USD.`,
  },
  {
    codigo: 'R5', nombre: 'No es un cobro duplicado', efecto: 'FRENAR', evaluada: tras7,
    ok: (h) => `No hay otro pago del mismo beneficiario con el mismo número ni el mismo monto en ${n(h, 'ventana_duplicado_dias')} días.`,
    falla: (h) => `Ya hay un pago o reserva del mismo beneficiario con el mismo número de factura o igual monto en ${n(h, 'ventana_duplicado_dias')} días.`,
  },
  {
    codigo: 'R6', nombre: 'Monto cuadra con lo acordado', efecto: 'ESCALAR', evaluada: tras7,
    ok: (h) => `El monto está dentro de la tolerancia de ${n(h, 'tolerancia_pct')} por ciento del acuerdo.`,
    falla: (h) =>
      h['acuerdo_encontrado'] === false
        ? 'No hay un acuerdo registrado para este beneficiario y esta moneda.'
        : `El monto difiere del acuerdo en más de ${n(h, 'tolerancia_pct')} por ciento.`,
  },
];

/**
 * Adaptador para el tablero: TODAS las comprobaciones del motor, en el orden en que se evaluan,
 * con su resultado. 'no_evaluada' = el motor no llego a esa regla (por ejemplo, tras un corte
 * por datos incompletos). Pura y total: con una entrada inesperada todo queda 'no_evaluada'.
 */
export function comprobaciones(decision: ResultadoDecision, config: Config): Comprobacion[] {
  const razones = Array.isArray(decision?.razones) ? decision.razones : [];
  const h: Hechos = decision && typeof decision.hechos === 'object' && decision.hechos !== null ? decision.hechos : {};
  const falla = (c: string) => razones.some((r) => r?.regla === c);
  const errorInterno = h['error_interno'] === true;
  const filas: Comprobacion[] = DEFS.map((d) => {
    let resultado: Comprobacion['resultado'];
    if (errorInterno || !d.evaluada(h, falla)) resultado = 'no_evaluada';
    else resultado = falla(d.codigo) ? 'falla' : 'ok';
    const detalle =
      resultado === 'falla' ? d.falla(h, config) : resultado === 'ok' ? d.ok(h, config) : 'No se evaluó: una comprobación anterior detuvo el análisis.';
    return { codigo: d.codigo, nombre: d.nombre, resultado, efecto: d.efecto, detalle };
  });
  if (errorInterno || falla('ESQUEMA')) {
    filas.push({
      codigo: 'ESQUEMA', nombre: 'El sistema evaluó la factura sin errores', efecto: 'ESCALAR', resultado: 'falla',
      detalle: 'No se pudo evaluar la factura; se escala por seguridad.',
    });
  }
  return filas;
}
