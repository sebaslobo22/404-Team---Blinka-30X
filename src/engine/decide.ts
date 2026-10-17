import { diaNumero, mesDe } from './dates';
import { explicar } from './explain';
import { aUsdCentavos, esEnteroSeguro } from './money';
import type { Config, Contexto, Decision, FacturaExtraida, Hecho, Historial, Razon, ResultadoDecision } from './types';

/**
 * Motor de reglas. Funcion pura: misma entrada, misma salida; sin red, sin reloj, sin azar.
 * Precedencia: FRENAR > ESCALAR > PAGAR. Ante duda o error interno: ESCALAR.
 * El modelo de lenguaje nunca llega aqui con poder de decision: solo entrega la factura extraida.
 */
export function decidir(facturaId: string, f: FacturaExtraida, ctx: Contexto, cfg: Config): ResultadoDecision {
  try {
    return evaluar(facturaId, f, ctx, cfg);
  } catch {
    return resultadoSeguro(facturaId, ctx, cfg);
  }
}

function resultadoSeguro(facturaId: string, ctx: Contexto, cfg: Config): ResultadoDecision {
  const razones: Razon[] = [{ regla: 'ESQUEMA', efecto: 'ESCALAR' }];
  const hechos: Record<string, Hecho> = { error_interno: true };
  return {
    factura_id: facturaId,
    decision: 'ESCALAR',
    razones,
    version_reglas: cfg.version,
    hechos,
    explicacion: explicar('ESCALAR', razones, hechos),
    decidido_en: typeof ctx?.ahora === 'string' ? ctx.ahora : '1970-01-01T00:00:00Z',
  };
}

const activo = (h: Historial) => h.estado === 'PAGADA' || h.estado === 'RESERVADA';
const texto = (s: unknown): s is string => typeof s === 'string' && s.trim().length > 0;
const tiene = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

function distancia(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min((prev[j] ?? 0) + 1, (cur[j - 1] ?? 0) + 1, (prev[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n] ?? 0;
}

function evaluar(facturaId: string, f: FacturaExtraida, ctx: Contexto, cfg: Config): ResultadoDecision {
  const hoy = diaNumero(ctx.ahora);
  if (hoy === null) throw new Error('ahora invalido');
  const razones: Razon[] = [];
  const hechos: Record<string, Hecho> = {};

  // R7: campos criticos y moneda. Si falla, la extraccion no es confiable: se escala sin mas.
  const fallos: string[] = [];
  if (!texto(f.numero_factura)) fallos.push('numero_factura');
  if (!texto(f.beneficiario)) fallos.push('beneficiario');
  if (!texto(f.id_fiscal)) fallos.push('id_fiscal');
  if (!texto(f.cuenta)) fallos.push('cuenta');
  if (!texto(f.categoria)) fallos.push('categoria');
  if (!esEnteroSeguro(f.monto_centavos) || f.monto_centavos <= 0) fallos.push('monto_centavos');
  if (!texto(f.moneda) || !tiene(cfg.tasas_milli, f.moneda)) fallos.push('moneda');
  if (diaNumero(f.fecha_emision) === null) fallos.push('fecha_emision');
  if (Array.isArray(f.lineas) && f.lineas.length > 0) {
    const okLineas = f.lineas.every((l) => esEnteroSeguro(l?.monto_centavos));
    const suma = okLineas ? f.lineas.reduce((s, l) => s + l.monto_centavos, 0) : NaN;
    if (!okLineas || suma !== f.monto_centavos) fallos.push('lineas');
  }
  if (fallos.length > 0) {
    razones.push({ regla: 'R7', efecto: 'ESCALAR' });
    hechos['campos_invalidos_n'] = fallos.length;
    hechos['campos_invalidos'] = fallos.join(',');
    return armar(facturaId, 'ESCALAR', razones, hechos, ctx, cfg);
  }

  const idFiscal = (f.id_fiscal as string).trim();
  const cuenta = (f.cuenta as string).trim();
  const moneda = f.moneda as string;
  const monto = f.monto_centavos as number;
  const categoria = (f.categoria as string).trim();
  const numero = (f.numero_factura as string).trim();
  const mes = mesDe(ctx.ahora);

  const usd = aUsdCentavos(monto, moneda, cfg.tasas_milli);
  if (usd === null) throw new Error('monto no convertible');
  hechos['monto_usd_centavos'] = usd;

  const usdDe = (h: { monto_centavos: number; moneda: string }) => {
    const v = aUsdCentavos(h.monto_centavos, h.moneda, cfg.tasas_milli);
    if (v === null) throw new Error('historial no convertible');
    return v;
  };

  // R2: beneficiario permitido (ID fiscal y cuenta, coincidencia exacta). Lo difuso solo sugiere.
  const benef = ctx.beneficiarios.find((b) => b.id_fiscal === idFiscal);
  const reg = benef?.cuentas.find((c) => c.cuenta === cuenta);
  if (!reg) {
    razones.push({ regla: 'R2', efecto: 'FRENAR' });
    hechos['beneficiario_registrado'] = benef !== undefined;
    hechos['cuenta_registrada'] = false;
    const nombre = (f.beneficiario as string).trim().toLowerCase();
    const cercano = ctx.beneficiarios.find((b) => b.nombre.toLowerCase() !== nombre && distancia(b.nombre.toLowerCase(), nombre) <= 2);
    if (cercano) hechos['sugerencia_nombre'] = cercano.nombre;
  }

  // R8: cuenta registrada hace menos de la ventana (cambio reciente).
  if (reg) {
    const desde = diaNumero(reg.desde);
    const dias = desde === null ? null : hoy - desde;
    hechos['dias_desde_cambio_cuenta'] = dias;
    hechos['ventana_cuenta_dias'] = cfg.ventana_cuenta_dias;
    if (dias === null || dias < cfg.ventana_cuenta_dias) razones.push({ regla: 'R8', efecto: 'ESCALAR' });
  }

  // R1: limite por pago.
  hechos['limite_pago_usd_centavos'] = cfg.limite_pago_usd_centavos;
  if (usd > cfg.limite_pago_usd_centavos) razones.push({ regla: 'R1', efecto: 'ESCALAR' });

  // R3: tope mensual por beneficiario (pagos y reservas del mes).
  const acumulado = ctx.historial
    .filter((h) => activo(h) && h.id_fiscal === idFiscal && mesDe(h.fecha) === mes)
    .reduce((s, h) => s + usdDe(h), 0);
  hechos['acumulado_mes_con_pago_usd_centavos'] = acumulado + usd;
  hechos['tope_mensual_usd_centavos'] = cfg.tope_mensual_usd_centavos;
  if (acumulado + usd > cfg.tope_mensual_usd_centavos) razones.push({ regla: 'R3', efecto: 'ESCALAR' });

  // R4: presupuesto por categoria. Sin presupuesto configurado, se escala.
  if (!tiene(ctx.presupuestos, categoria)) {
    hechos['presupuesto_configurado'] = false;
    razones.push({ regla: 'R4', efecto: 'ESCALAR' });
  } else {
    const presupuesto = ctx.presupuestos[categoria] as number;
    const gasto = ctx.historial
      .filter((h) => activo(h) && h.categoria === categoria && mesDe(h.fecha) === mes)
      .reduce((s, h) => s + usdDe(h), 0);
    hechos['presupuesto_categoria_usd_centavos'] = presupuesto;
    hechos['gasto_categoria_con_pago_usd_centavos'] = gasto + usd;
    if (gasto + usd > presupuesto) razones.push({ regla: 'R4', efecto: 'FRENAR' });
  }

  // R5: duplicado. Mismo numero de factura del mismo beneficiario, o mismo monto y moneda dentro de la ventana.
  const duplicada = ctx.historial.some((h) => {
    if (!activo(h) || h.id_fiscal !== idFiscal) return false;
    if (h.numero_factura === numero) return true;
    const d = diaNumero(h.fecha);
    return h.monto_centavos === monto && h.moneda === moneda && d !== null && Math.abs(hoy - d) <= cfg.ventana_duplicado_dias;
  });
  hechos['ventana_duplicado_dias'] = cfg.ventana_duplicado_dias;
  if (duplicada) razones.push({ regla: 'R5', efecto: 'FRENAR' });

  // R6: cotejo con lo acordado. Sin acuerdo registrado, se escala.
  const acuerdos = ctx.acuerdos.filter(
    (a) => a.id_fiscal === idFiscal && a.moneda === moneda && (a.categoria === undefined || a.categoria === categoria),
  );
  hechos['tolerancia_pct'] = cfg.tolerancia_bps / 100;
  hechos['acuerdo_encontrado'] = acuerdos.length > 0;
  const cumple = acuerdos.some((a) => Math.abs(monto - a.monto_centavos) * 10_000 <= a.monto_centavos * cfg.tolerancia_bps);
  if (!cumple) razones.push({ regla: 'R6', efecto: 'ESCALAR' });

  const decision: Decision = razones.some((r) => r.efecto === 'FRENAR')
    ? 'FRENAR'
    : razones.length > 0
      ? 'ESCALAR'
      : 'PAGAR';
  return armar(facturaId, decision, razones, hechos, ctx, cfg);
}

function armar(
  facturaId: string,
  decision: Decision,
  razones: Razon[],
  hechos: Record<string, Hecho>,
  ctx: Contexto,
  cfg: Config,
): ResultadoDecision {
  return {
    factura_id: facturaId,
    decision,
    razones,
    version_reglas: cfg.version,
    hechos,
    explicacion: explicar(decision, razones, hechos),
    decidido_en: ctx.ahora,
  };
}
