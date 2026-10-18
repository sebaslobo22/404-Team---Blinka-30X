import { createHash } from 'node:crypto';
import dataset from '../../data/dev-set.json';
import { decidir } from '../engine/decide';
import type { Contexto, FacturaExtraida, ResultadoDecision } from '../engine/types';
import type { EstadoDemo } from '../demo/estado';
import { construirTraza } from '../demo/traza';
import type { FilaTraza } from '../demo/traza';
import { extraerFactura, MODELOS_POR_DEFECTO } from '../extraccion/extraer';
import type { EntradaFactura, OpcionesExtraer } from '../extraccion/extraer';
import { llamarOpenRouter } from '../extraccion/openrouter';
import type { PeticionLLM } from '../extraccion/openrouter';
import { OPCIONES_LECTURA, PROVEEDOR_FIJO } from '../telegram/deps';
import { aplicarTechoEnVivo } from '../telegram/techo';

export interface ResultadoVivo {
  id: string;
  factura: FacturaExtraida;
  resultado: ResultadoDecision;
  traza: FilaTraza[];
  modelos: { pedido: string; servido: string | null; ok: boolean }[];
  ms: number;
  costo_usd: number;
}

/**
 * El modelo que respondio debe ser el que se pidio (o una version fechada del mismo). Si OpenRouter
 * desvia la llamada a otro modelo, ya no hay dos lecturas de dos empresas distintas: se escala.
 */
export function modeloEsElPedido(pedido: string, servido: string | null): boolean {
  if (servido === null) return false;
  return servido === pedido || servido.startsWith(`${pedido}-`) || servido.startsWith(`${pedido}:`);
}

/**
 * Contexto de la empresa ficticia (Aurora Cloud) tal como queda despues de las 18 facturas de la
 * demo: mismas reglas editadas, mismos presupuestos y los pagos ya hechos en el historial. Copia la
 * construccion de crearEstado() sin tocar el estado compartido: la factura en vivo no entra al
 * registro ni al historial de la demo, y ningun otro visitante la ve.
 */
export function contextoDeLaDemo(estado: EstadoDemo): Contexto {
  const ctx = structuredClone(dataset.contexto) as unknown as Contexto;
  for (const [cat, usd] of Object.entries(estado.parametros.presupuestos_usd)) ctx.presupuestos[cat] = usd * 100;
  for (const fila of estado.filas) {
    if (fila.resultado.decision !== 'PAGAR') continue;
    const f = fila.factura;
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
  return ctx;
}

/**
 * Lectura en vivo + decision, para la subida web. Usa las mismas piezas que el bot de Telegram: los
 * dos modelos fijos sin proveedor de reemplazo ni retencion de datos (PROVEEDOR_FIJO) y el mismo techo
 * (aplicarTechoEnVivo): el resultado nunca es PAGAR. Ademas compara el modelo servido con el pedido.
 * No guarda el archivo ni la lectura.
 */
export async function leerYDecidir(entrada: EntradaFactura, estado: EstadoDemo, opciones: Pick<OpcionesExtraer, 'llamar' | 'modelos'> = {}): Promise<ResultadoVivo> {
  const id = `V-${createHash('sha256').update(entrada.texto ?? entrada.imagenBase64 ?? '').digest('hex').slice(0, 8).toUpperCase()}`;
  const llamar = opciones.llamar ?? ((p: PeticionLLM) => llamarOpenRouter({ ...p, proveedor: PROVEEDOR_FIJO }, OPCIONES_LECTURA));
  const ex = await extraerFactura(entrada, { modelos: opciones.modelos ?? MODELOS_POR_DEFECTO, llamar, id, replay: false, guardar: false });
  const alertas = [...(ex.factura.alertas ?? [])];
  for (const l of ex.lecturas) {
    if (l.ok && !modeloEsElPedido(l.modelo, l.modelo_servido)) alertas.push(`modelo_no_esperado:${l.modelo}`);
  }
  const factura: FacturaExtraida = { ...ex.factura, alertas };
  const resultado = aplicarTechoEnVivo(decidir(id, factura, contextoDeLaDemo(estado), estado.config));
  return {
    id,
    factura,
    resultado,
    traza: construirTraza(resultado, estado.config, factura),
    modelos: ex.lecturas.map((l) => ({ pedido: l.modelo, servido: l.modelo_servido, ok: l.ok })),
    ms: ex.ms,
    costo_usd: ex.costo_usd,
  };
}
