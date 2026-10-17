// Motor de reglas determinístico. La IA nunca pasa por aquí: recibe datos ya extraídos y decide.
// Regla de oro: solo se PAGA si TODAS las comprobaciones dan "ok". Cualquier otra cosa frena o escala.

import { aCentavos, aUsdCentavos, formatear, aTexto } from './dinero.js';

export const CATALOGO = {
  DATOS: { nombre: 'Datos completos y legibles', decision: 'ESCALAR' },
  CONFIANZA: { nombre: 'Lectura confiable de la factura', decision: 'ESCALAR' },
  MANIPULACION: { nombre: 'Sin instrucciones ocultas en la factura', decision: 'ESCALAR' },
  MONEDA: { nombre: 'Moneda aceptada', decision: 'ESCALAR' },
  DUPLICADO: { nombre: 'No es un cobro duplicado', decision: 'FRENAR' },
  BENEFICIARIO: { nombre: 'Beneficiario en la lista aprobada', decision: 'FRENAR' },
  REGISTRO: { nombre: 'Nombre y cuenta coinciden con el registro', decision: 'ESCALAR' },
  CUENTA_RECIENTE: { nombre: 'Cuenta bancaria sin cambios recientes', decision: 'ESCALAR' },
  COTEJO: { nombre: 'Monto cuadra con lo acordado', decision: 'ESCALAR' },
  LIMITE: { nombre: 'Dentro del límite por pago', decision: 'ESCALAR' },
  PRESUPUESTO: { nombre: 'Hay presupuesto en el periodo', decision: 'FRENAR' },
};
const CODIGOS = Object.keys(CATALOGO);
const SEVERIDAD = { PAGAR: 0, ESCALAR: 1, FRENAR: 2 };
const DIA_MS = 86_400_000;
const HORA_MS = 3_600_000;

// Frases que una factura legítima no necesita. Si aparecen, se escala (un falso positivo solo
// cuesta una revisión humana; un falso negativo podría costar un pago indebido).
const PATRONES_INSTRUCCION = [
  /\b(ignor[ae]|ignore|olvida|forget|disregard)\b.{0,40}\b(instrucciones|reglas|instructions|rules|previous|anteriores)\b/i,
  /\b(aprueb\w*|aprob\w*|approv\w*|autoriz\w*|authoriz\w*)\s.{0,25}\b(este|esta|this|inmediatamente|immediately|sin\s+revis|without)/i,
  /\b(agente|asistente|modelo|assistant|llm|ia|ai)\s*[:,]/i,
  /\[(system|sistema)\]|^\s*(system|sistema)\s*:/im,
  /\bno\s+(escal[ae]s?|frenes?|revises?)\b/i,
];

const normalizarId = (s) => String(s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const normalizarNombre = (s) =>
  String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const texto = (s) => (typeof s === 'string' ? s.trim() : '');

function fechaAMs(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [a, m, d] = s.split('-').map(Number);
  const ms = Date.UTC(a, m - 1, d);
  const f = new Date(ms);
  return f.getUTCFullYear() === a && f.getUTCMonth() === m - 1 && f.getUTCDate() === d ? ms : null;
}

function exigir(condicion, mensaje) {
  if (!condicion) throw new Error(`Configuración inválida: ${mensaje}`);
}

export function prepararReglas(reglas) {
  exigir(reglas && typeof reglas === 'object', 'no hay reglas');
  const limite = aCentavos(reglas.limite_por_pago_usd);
  const tope = aCentavos(reglas.tope_mensual_usd);
  exigir(limite !== null, 'límite por pago');
  exigir(tope !== null, 'tope mensual');
  exigir(Array.isArray(reglas.monedas_aceptadas) && reglas.monedas_aceptadas.length > 0, 'monedas aceptadas');
  const monedas = reglas.monedas_aceptadas.map((m) => String(m).toUpperCase());
  const tasas = {};
  for (const m of monedas) {
    const tasa = aCentavos(reglas.tasas_por_usd?.[m]);
    exigir(tasa !== null && tasa > 0n, `falta la tasa de cambio de ${m}`);
    tasas[m] = tasa;
  }
  const toleranciaBps = Math.round(Number(reglas.tolerancia_acordado_pct) * 100);
  exigir(Number.isInteger(toleranciaBps) && toleranciaBps >= 0 && toleranciaBps <= 10_000, 'tolerancia');
  const ventanaDias = Number(reglas.ventana_duplicado_dias);
  exigir(Number.isInteger(ventanaDias) && ventanaDias >= 0, 'ventana de duplicados');
  const congelamientoHoras = Number(reglas.congelamiento_cambio_cuenta_horas ?? 72);
  exigir(Number.isInteger(congelamientoHoras) && congelamientoHoras >= 0, 'horas de congelamiento tras cambio de cuenta');
  const confianzaMinima = Number(reglas.confianza_minima);
  exigir(Number.isFinite(confianzaMinima) && confianzaMinima >= 0 && confianzaMinima <= 1, 'confianza mínima');
  exigir(Array.isArray(reglas.proveedores), 'lista de proveedores');
  const proveedores = reglas.proveedores.map((p) => {
    const idFiscal = normalizarId(p.id_fiscal);
    const acordado = aCentavos(p.acordado?.monto);
    exigir(idFiscal && texto(p.nombre), `proveedor ${p.id ?? '?'} sin nombre o ID fiscal`);
    exigir(acordado !== null && acordado > 0n, `proveedor ${p.id ?? '?'} sin monto acordado`);
    const cuentaCambiadaMs = p.cuenta_cambiada_en ? fechaAMs(p.cuenta_cambiada_en) : null;
    exigir(!p.cuenta_cambiada_en || cuentaCambiadaMs !== null, `proveedor ${p.id ?? '?'} con fecha de cambio de cuenta inválida`);
    return {
      id: p.id,
      nombre: p.nombre,
      idFiscal,
      cuenta: normalizarId(p.cuenta),
      cuentaCambiadaEn: p.cuenta_cambiada_en ?? null,
      cuentaCambiadaMs,
      acordado,
      monedaAcordada: String(p.acordado.moneda).toUpperCase(),
    };
  });
  return {
    version: String(reglas.version ?? 'sin-version'),
    limite, tope, monedas, tasas, toleranciaBps, ventanaDias, congelamientoHoras, confianzaMinima, proveedores,
  };
}

export function prepararEstado(estado) {
  exigir(estado && typeof estado === 'object', 'no hay estado del periodo');
  const gastado = aCentavos(estado.gastado_usd);
  exigir(gastado !== null, 'gastado del periodo');
  const historial = (estado.historial ?? []).map((h) => {
    const monto = aCentavos(h.monto);
    const fechaMs = fechaAMs(h.fecha);
    exigir(monto !== null && fechaMs !== null, 'historial con datos inválidos');
    return {
      facturaId: h.factura_id ?? null,
      idFiscal: normalizarId(h.id_fiscal),
      numero: normalizarId(h.numero_factura),
      moneda: String(h.moneda).toUpperCase(),
      monto,
      fechaMs,
    };
  });
  // Fecha "de hoy" del lote. Se pasa explícita para que la decisión sea reproducible.
  const fechaProcesoMs = estado.fecha_proceso ? fechaAMs(estado.fecha_proceso) : null;
  exigir(!estado.fecha_proceso || fechaProcesoMs !== null, 'fecha de proceso inválida');
  return { gastado, historial, fechaProcesoMs };
}

function buscarInstrucciones(fuente) {
  if (typeof fuente !== 'string') return [];
  const plano = fuente.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const hallazgos = [];
  for (const patron of PATRONES_INSTRUCCION) {
    const m = plano.match(patron);
    if (m) hallazgos.push(`"${m[0].trim().slice(0, 60)}"`);
  }
  return hallazgos;
}

// Evalúa una factura contra reglas y estado ya preparados. Puede lanzar error: quien la llama
// convierte cualquier error en ESCALAR (falla cerrada).
export function evaluar(entrada, R, estado) {
  const comprobaciones = [];
  const marcar = (codigo, ok, detalle) =>
    comprobaciones.push({
      codigo,
      nombre: CATALOGO[codigo].nombre,
      resultado: ok === null ? 'no_evaluada' : ok ? 'ok' : 'falla',
      decision_si_falla: CATALOGO[codigo].decision,
      detalle,
    });
  const x = entrada?.extraccion ?? null;

  // 1. Datos completos
  const beneficiario = texto(x?.beneficiario);
  const idFiscal = normalizarId(x?.id_fiscal);
  const monto = aCentavos(x?.monto);
  const moneda = texto(x?.moneda).toUpperCase();
  const fechaMs = fechaAMs(x?.fecha);
  const numero = normalizarId(x?.numero_factura);
  const faltan = [];
  if (!beneficiario) faltan.push('beneficiario');
  if (!idFiscal) faltan.push('ID fiscal');
  if (monto === null || monto <= 0n) faltan.push('monto');
  if (!/^[A-Z]{3}$/.test(moneda)) faltan.push('moneda');
  if (fechaMs === null) faltan.push('fecha');
  if (!numero) faltan.push('número de factura');
  const datosOk = faltan.length === 0;
  marcar('DATOS', datosOk, datosOk
    ? 'Se leyeron todos los datos clave: beneficiario, ID fiscal, monto, moneda, fecha y número.'
    : `No se pudo leer con certeza: ${faltan.join(', ')}.`);

  // 2. Confianza de la lectura
  const confianza = typeof x?.confianza === 'number' && Number.isFinite(x.confianza) ? x.confianza : null;
  const alertas = Array.isArray(x?.alertas) ? x.alertas.filter(Boolean).map(String) : [];
  const confianzaOk = confianza !== null && confianza >= R.confianzaMinima && alertas.length === 0;
  const porcentaje = (v) => `${Math.round(v * 100)} %`;
  marcar('CONFIANZA', confianzaOk, confianzaOk
    ? `La lectura tiene confianza ${porcentaje(confianza)} (mínimo ${porcentaje(R.confianzaMinima)}).`
    : [
        confianza === null ? 'El lector no reportó su confianza.' : null,
        confianza !== null && confianza < R.confianzaMinima
          ? `Confianza de lectura ${porcentaje(confianza)}, por debajo del mínimo ${porcentaje(R.confianzaMinima)}.` : null,
        alertas.length ? `Alertas del lector: ${alertas.join('; ')}.` : null,
      ].filter(Boolean).join(' '));

  // 3. Instrucciones ocultas (el texto de la factura es dato, nunca orden)
  const hallazgos = buscarInstrucciones(entrada?.texto_fuente);
  if (x?.instrucciones_detectadas === true) hallazgos.push('el lector marcó instrucciones dirigidas al agente');
  marcar('MANIPULACION', hallazgos.length === 0, hallazgos.length === 0
    ? 'La factura no contiene órdenes dirigidas al agente.'
    : `La factura contiene texto que intenta dar órdenes al agente (${hallazgos.join(', ')}). Se ignora como orden y se pide revisión.`);

  let usd = null;
  let proveedor = null;
  let registro = null;

  if (!datosOk) {
    for (const c of ['MONEDA', 'DUPLICADO', 'BENEFICIARIO', 'REGISTRO', 'CUENTA_RECIENTE', 'COTEJO', 'LIMITE', 'PRESUPUESTO']) {
      marcar(c, null, 'No se pudo comprobar porque faltan datos de la factura.');
    }
  } else {
    registro = { facturaId: entrada?.id ?? null, idFiscal, numero, moneda, monto, fechaMs };

    // 4. Moneda
    const aceptada = R.monedas.includes(moneda);
    marcar('MONEDA', aceptada, aceptada
      ? `${moneda} es una moneda aceptada.`
      : `${moneda} no está entre las monedas aceptadas (${R.monedas.join(', ')}).`);
    if (aceptada) usd = aUsdCentavos(monto, R.tasas[moneda]);

    // 5. Duplicado
    const ventanaMs = R.ventanaDias * DIA_MS;
    const mismoNumero = estado.historial.find((h) => h.idFiscal === idFiscal && h.numero === numero);
    const mismoMonto = estado.historial.find((h) => h.idFiscal === idFiscal && h.moneda === moneda
      && h.monto === monto && Math.abs(h.fechaMs - fechaMs) <= ventanaMs);
    const previo = mismoNumero ?? mismoMonto;
    const ref = previo?.facturaId ? ` (ya recibida como ${previo.facturaId})` : '';
    marcar('DUPLICADO', !previo, !previo
      ? `No hay otra factura de este proveedor con el mismo número ni el mismo monto en ${R.ventanaDias} días.`
      : mismoNumero
        ? `Este proveedor ya envió la factura número ${x.numero_factura}${ref}. Es un cobro duplicado.`
        : `Este proveedor ya cobró ${formatear(monto, moneda)} hace menos de ${R.ventanaDias} días${ref}. Posible cobro duplicado.`);

    // 6. Beneficiario permitido (por ID fiscal; el nombre solo no basta)
    proveedor = R.proveedores.find((p) => p.idFiscal === idFiscal) ?? null;
    marcar('BENEFICIARIO', proveedor !== null, proveedor
      ? `${proveedor.nombre} (ID fiscal ${x.id_fiscal}) está en la lista de proveedores aprobados.`
      : `"${beneficiario}" (ID fiscal ${x.id_fiscal}) no está en la lista de proveedores aprobados.`);

    // 7. Nombre y cuenta coinciden con lo registrado
    if (!proveedor) {
      marcar('REGISTRO', null, 'No aplica: el beneficiario no está registrado.');
    } else {
      const a = normalizarNombre(beneficiario);
      const b = normalizarNombre(proveedor.nombre);
      const nombreOk = a.length >= 4 && (a.includes(b) || b.includes(a));
      const cuenta = normalizarId(x?.cuenta);
      const cuentaOk = !cuenta || !proveedor.cuenta || cuenta === proveedor.cuenta;
      const problemas = [];
      if (!nombreOk) problemas.push(`el nombre "${beneficiario}" no coincide con el registrado ("${proveedor.nombre}")`);
      if (!cuentaOk) problemas.push(`la cuenta de destino ${x.cuenta} es distinta a la registrada`);
      marcar('REGISTRO', problemas.length === 0, problemas.length === 0
        ? `El nombre${cuenta ? ' y la cuenta' : ''} coinciden con el registro del proveedor.`
        : `Inconsistencia con el registro: ${problemas.join(' y ')}.`);
    }

    // 8. Cuenta cambiada hace poco: así se desvían pagos por suplantación de correo (BEC).
    if (!proveedor) {
      marcar('CUENTA_RECIENTE', null, 'No aplica: el beneficiario no está registrado.');
    } else if (proveedor.cuentaCambiadaMs === null) {
      marcar('CUENTA_RECIENTE', true, 'La cuenta bancaria del proveedor no tiene cambios registrados.');
    } else if (estado.fechaProcesoMs === null) {
      marcar('CUENTA_RECIENTE', null, `La cuenta cambió el ${proveedor.cuentaCambiadaEn} y no se conoce la fecha de hoy para compararlo.`);
    } else {
      const horas = (estado.fechaProcesoMs - proveedor.cuentaCambiadaMs) / HORA_MS;
      const reciente = horas <= R.congelamientoHoras;
      marcar('CUENTA_RECIENTE', !reciente, reciente
        ? `La cuenta bancaria de ${proveedor.nombre} se cambió el ${proveedor.cuentaCambiadaEn} (hace ${Math.max(0, Math.round(horas))} horas). Todo cambio de cuenta en las últimas ${R.congelamientoHoras} horas se revisa: es la forma más común de desviar un pago.`
        : `La cuenta se cambió el ${proveedor.cuentaCambiadaEn}, hace más de ${R.congelamientoHoras} horas.`);
    }

    // 9. Cotejo con lo acordado
    if (!proveedor) {
      marcar('COTEJO', null, 'No aplica: no hay acuerdo con un beneficiario no registrado.');
    } else if (proveedor.monedaAcordada !== moneda) {
      marcar('COTEJO', false, `Se acordó pagar en ${proveedor.monedaAcordada} y la factura viene en ${moneda}.`);
    } else {
      const diferencia = monto > proveedor.acordado ? monto - proveedor.acordado : proveedor.acordado - monto;
      const cuadra = diferencia * 10_000n <= BigInt(R.toleranciaBps) * proveedor.acordado;
      const tol = `${R.toleranciaBps / 100} %`;
      marcar('COTEJO', cuadra, cuadra
        ? `Cobra ${formatear(monto, moneda)}; lo acordado es ${formatear(proveedor.acordado, moneda)} (tolerancia ${tol}).`
        : `Cobra ${formatear(monto, moneda)} pero lo acordado es ${formatear(proveedor.acordado, moneda)}: la diferencia de ${formatear(diferencia, moneda)} supera la tolerancia de ${tol}.`);
    }

    // 10. Límite por pago y 11. Presupuesto del periodo (en USD, calculado por el código)
    if (usd === null) {
      marcar('LIMITE', null, 'No se pudo convertir a USD porque la moneda no es aceptada.');
      marcar('PRESUPUESTO', null, 'No se pudo convertir a USD porque la moneda no es aceptada.');
    } else {
      const equivalente = moneda === 'USD' ? formatear(usd, 'USD') : `${formatear(usd, 'USD')} (${formatear(monto, moneda)} a ${aTexto(R.tasas[moneda])} ${moneda} por USD)`;
      const dentroLimite = usd <= R.limite;
      marcar('LIMITE', dentroLimite, dentroLimite
        ? `${equivalente} no supera el límite de ${formatear(R.limite, 'USD')} por pago.`
        : `${equivalente} supera el límite de ${formatear(R.limite, 'USD')} por pago sin aprobación humana.`);
      const disponible = R.tope - estado.gastado;
      const alcanza = estado.gastado + usd <= R.tope;
      marcar('PRESUPUESTO', alcanza, alcanza
        ? `Quedan ${formatear(disponible, 'USD')} del tope mensual de ${formatear(R.tope, 'USD')}; alcanza.`
        : `Quedan ${formatear(disponible < 0n ? 0n : disponible, 'USD')} del tope mensual de ${formatear(R.tope, 'USD')} y esta factura pide ${formatear(usd, 'USD')}.`);
    }
  }

  // Decisión: la falla más grave manda. Algo sin evaluar nunca permite pagar.
  let decision = 'PAGAR';
  for (const c of comprobaciones) {
    if (c.resultado === 'ok') continue;
    const d = c.resultado === 'falla' ? c.decision_si_falla : 'ESCALAR';
    if (SEVERIDAD[d] > SEVERIDAD[decision]) decision = d;
  }
  // Candado final, redundante a propósito.
  const todoOk = comprobaciones.length === CODIGOS.length && comprobaciones.every((c) => c.resultado === 'ok');
  if (decision === 'PAGAR' && !(todoOk && usd !== null)) decision = 'ESCALAR';

  const resultado = {
    factura_id: entrada?.id ?? null,
    decision,
    motivos: comprobaciones.filter((c) => c.resultado === 'falla').map((c) => c.codigo),
    comprobaciones,
    datos: datosOk ? {
      beneficiario, proveedor_id: proveedor?.id ?? null, id_fiscal: x.id_fiscal,
      numero_factura: x.numero_factura, fecha: x.fecha,
      fecha_vencimiento: fechaAMs(x?.fecha_vencimiento) === null ? null : x.fecha_vencimiento,
      moneda, monto: aTexto(monto),
      monto_usd: usd === null ? null : aTexto(usd),
      tasa_por_usd: usd === null ? null : aTexto(R.tasas[moneda]),
    } : null,
    version_reglas: R.version,
    explicacion: '',
  };
  resultado.explicacion = explicar(resultado, R, estado, usd);
  return { resultado, interno: { registro, usd } };
}

function explicar(r, R, estado, usd) {
  if (r.decision === 'PAGAR') {
    const d = r.datos;
    const restante = R.tope - estado.gastado - usd;
    const original = d.moneda === 'USD' ? '' : ` (${formatear(aCentavos(d.monto), d.moneda)})`;
    const vence = d.fecha_vencimiento ? `, con vencimiento el ${d.fecha_vencimiento}` : '';
    return `PAGAR: se aprueba pagar ${formatear(usd, 'USD')}${original} a ${d.beneficiario}, factura ${d.numero_factura}${vence}. `
      + `Pasó las ${r.comprobaciones.length} comprobaciones. Tras este pago quedan ${formatear(restante, 'USD')} del tope mensual.`;
  }
  const fallas = r.comprobaciones.filter((c) => c.resultado === 'falla');
  const motivos = fallas.length ? fallas.map((c) => `• ${c.nombre}: ${c.detalle}`).join('\n') : '• No se pudieron completar las comprobaciones.';
  return r.decision === 'FRENAR'
    ? `FRENAR: no se paga y no se puede aprobar desde el tablero.\n${motivos}`
    : `ESCALAR: no se paga hasta que una persona lo apruebe o lo rechace.\n${motivos}`;
}

export function falloCerrado(entrada, reglas, error) {
  return {
    factura_id: entrada?.id ?? null,
    decision: 'ESCALAR',
    motivos: ['SISTEMA'],
    comprobaciones: [{
      codigo: 'SISTEMA', nombre: 'El sistema funcionó sin errores', resultado: 'falla',
      decision_si_falla: 'ESCALAR', detalle: `Error interno: ${error?.message ?? error}.`,
    }],
    datos: null,
    version_reglas: reglas?.version ?? null,
    explicacion: `ESCALAR: el sistema tuvo un error y por seguridad no paga.\n• ${error?.message ?? error}`,
  };
}

// Decide una sola factura. Nunca lanza error: cualquier falla interna termina en ESCALAR.
export function decidir(entrada, reglas, estado) {
  try {
    return evaluar(entrada, prepararReglas(reglas), prepararEstado(estado)).resultado;
  } catch (error) {
    return falloCerrado(entrada, reglas, error);
  }
}

// Procesa facturas en orden. Cada pago aprobado consume presupuesto y toda factura leída entra al
// historial de duplicados (aunque se haya frenado o escalado).
export function procesarLote(entradas, reglas, estadoInicial) {
  let R;
  let estado;
  try {
    R = prepararReglas(reglas);
    estado = prepararEstado(estadoInicial);
  } catch (error) {
    return { resultados: entradas.map((e) => falloCerrado(e, reglas, error)), gastado_usd: estadoInicial?.gastado_usd ?? null };
  }
  const resultados = [];
  for (const entrada of entradas) {
    try {
      const { resultado, interno } = evaluar(entrada, R, estado);
      resultados.push(resultado);
      if (interno.registro) estado.historial.push(interno.registro);
      if (resultado.decision === 'PAGAR') estado.gastado += interno.usd;
    } catch (error) {
      resultados.push(falloCerrado(entrada, reglas, error));
    }
  }
  return { resultados, gastado_usd: aTexto(estado.gastado) };
}
