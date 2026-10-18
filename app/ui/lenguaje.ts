import type { FilaDemo } from '../../src/demo/estado';
import type { FilaTraza } from '../../src/demo/traza';
export const estados = {
  PAGAR: { etiqueta: 'Lista para pagar', clase: 'pagar' },
  FRENAR: { etiqueta: 'Frenada', clase: 'frenar' },
  ESCALAR: { etiqueta: 'Te necesita', clase: 'escalar' },
} as const;
export type DecisionUI = keyof typeof estados;
export function dinero(centavos: unknown, moneda: unknown) {
  if (typeof centavos !== 'number' || !Number.isFinite(centavos) || typeof moneda !== 'string' || !moneda.trim()) return 'Monto sin leer';
  return `${moneda} ${(centavos / 100).toLocaleString('es-CO', { maximumFractionDigits: 2 })}`;
}
/** Nombre llano de cada dato que leen los modelos (para decir en cuál no coincidieron). */
export const camposLeidos: Record<string, string> = {
  beneficiario: 'proveedor', id_fiscal: 'número fiscal', cuenta: 'cuenta bancaria', monto: 'monto', moneda: 'moneda',
  fecha: 'fecha del cobro', numero_factura: 'número de factura', categoria: 'tipo de gasto',
};
export const nombres: Record<string, string> = {
  R1: 'Límite por pago', R2: 'Proveedor autorizado', R3: 'Tope del mes', R4: 'Dinero para este tipo de gasto',
  R5: 'Cobro repetido', R6: 'Monto acordado', R7: 'Datos completos', R8: 'Cuenta cambiada hace poco',
  INYECCION: 'La factura intenta dar órdenes', CONFIANZA: 'Lectura clara', REGISTRO: 'Nombre del proveedor',
  EXTRACCION: 'Datos leídos', ESQUEMA: 'Datos válidos', EN_VIVO: 'Entrada en vivo',
};
export function motivo(fila: FilaDemo): string {
  const r = fila.resultado;
  if (r.decision === 'PAGAR') return 'Cumple todas tus reglas.';
  const regla = r.razones.find(x => x.efecto === r.decision)?.regla ?? r.razones[0]?.regla;
  const h = r.hechos;
  switch (regla) {
    case 'R1': return `El monto de ${dinero(h.monto_usd_centavos, 'USD')} supera tu límite de ${dinero(h.limite_pago_usd_centavos, 'USD')}.`;
    case 'R2': return 'El proveedor o su cuenta no está en tu lista.';
    case 'R3': return `El mes suma ${dinero(h.acumulado_mes_con_pago_usd_centavos, 'USD')}. Tu tope es ${dinero(h.tope_mensual_usd_centavos, 'USD')}.`;
    case 'R4': return h.presupuesto_configurado === false ? 'No hay un tope de gasto definido para este cobro.' : `El gasto suma ${dinero(h.gasto_categoria_con_pago_usd_centavos, 'USD')}. Tu tope es ${dinero(h.presupuesto_categoria_usd_centavos, 'USD')}.`;
    case 'R5': return 'Este cobro ya figura entre tus pagos.';
    case 'R6': return h.acuerdo_encontrado === false ? 'No encontramos un monto acordado para este cobro.' : 'El monto no cuadra con lo acordado.';
    case 'R7': return 'Faltan datos o no se pudieron leer bien.';
    case 'R8': return 'La cuenta se registró hace poco.';
    case 'INYECCION': return 'La factura intenta dar órdenes a Pulso.';
    case 'CONFIANZA': return 'No se leyó con claridad.';
    case 'REGISTRO': return 'El nombre no coincide con el proveedor de tu lista.';
    default: return 'Hay datos que debes revisar antes de seguir.';
  }
}
export function frase(fila: FilaDemo): string {
  const monto = dinero(fila.factura.monto_centavos, fila.factura.moneda);
  const proveedor = fila.factura.beneficiario ?? 'proveedor sin leer';
  return fila.resultado.decision === 'PAGAR'
    ? `Autorizamos ${monto} para ${proveedor}${/[.!?]$/.test(String(proveedor)) ? '' : '.'} ${motivo(fila)}`
    : `${fila.resultado.decision === 'FRENAR' ? 'Frenamos este cobro.' : 'Necesitamos tu aprobación.'} ${motivo(fila)}`;
}
// Solo presenta los estados y hechos de la traza existente; no evalúa reglas.
export function detalleRazon(t: FilaTraza): string {
  if(t.estado==='NO_EVALUADA') return 'No se pudo revisar con los datos disponibles.';
  if(t.estado==='NO_APLICA') return 'Esta revisión no corresponde a esta factura.';
  if(t.id==='EN_VIVO') return 'Entró en vivo: siempre la revisa una persona, aunque cumpla tus reglas.';
  if(t.id==='REGISTRO') return t.estado==='CUMPLE'?'El nombre leído coincide con tu lista.':'El nombre leído no coincide con tu lista.';
  if(t.id==='INYECCION') return t.cifra.includes('Sin texto')?'No hay texto original para esta revisión.':t.estado==='CUMPLE'?'No se detectaron órdenes en el texto.':'Se detectó una orden dentro del texto.';
  if(t.id==='CONFIANZA') return t.estado==='CUMPLE'?'La lectura alcanza el nivel que piden tus reglas.':'La lectura no alcanza el nivel que piden tus reglas.';
  if(t.id==='R2') return t.estado==='CUMPLE'?'El proveedor y la cuenta están en tu lista.':'El proveedor o su cuenta no está en tu lista.';
  if(t.id==='R7') return t.estado==='CUMPLE'?'Están los datos necesarios y se permite esta moneda.':'Faltan datos para decidir. Mira qué se pudo leer en la evidencia.';
  return t.cifra.replace(/(\d[\d.,]*) USD/g,(_,n:string)=>`USD ${n.replace(/,00$/,'')}`)
    .replace('Monto ','Monto: ').replace(' frente al límite de ','. Tu límite: ')
    .replace('Acumulado del mes con este pago ','Total del mes con este pago: ').replace(' frente al tope de ','. Tu tope: ')
    .replace('Gasto de la categoría con este pago ','Total de este tipo de gasto: ').replace(' frente al presupuesto de ','. Tu tope: ')
    .replace('La categoría no tiene presupuesto configurado','No hay un tope para este tipo de gasto.')
    .replace('Ventana de duplicados: ','Busca un cobro igual en los últimos ')
    .replace('Tolerancia ','Margen: ').replace('Acuerdo encontrado: sí','Hay un precio acordado.').replace('Acuerdo encontrado: no','No hay un precio acordado.')
    .replace(', ventana de ','. Tu espera: ').replace(/beneficiario/gi,'proveedor').replace(/extracción/g,'lectura');
}

/** Regla que explica la decisión: la primera fila que no cumple y coincide con la decisión. */
export function reglaPrincipal(filas: FilaTraza[] | undefined, decision: DecisionUI): string | undefined {
  if (!filas || decision === 'PAGAR') return undefined;
  return (filas.find(f => f.estado === decision) ?? filas.find(f => f.estado === 'FRENAR' || f.estado === 'ESCALAR'))?.id;
}
