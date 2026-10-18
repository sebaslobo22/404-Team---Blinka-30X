import { NextResponse } from 'next/server';
import { AVISO_ORDEN, FORMATO_ORDEN, ordenes } from '../../../src/demo/orden';
import { obtenerEstado } from '../../../src/demo/singleton';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Todas las órdenes de pago del lote. Formato propuesto: Blinka no publica API. Pulso no ejecuta pagos. */
export async function GET() {
  try {
    const estado = await obtenerEstado();
    // Si el registro de decisiones no verifica, no sale ninguna orden: alguien altero una decision.
    const v = await estado.registroDecisiones.verificar(estado.anclaInicial);
    if (!v.ok) return NextResponse.json({ ok: false, codigo: 'REGISTRO_ALTERADO', error: 'El registro de decisiones no verifica: no se entrega ninguna orden hasta restaurarlo.' }, { status: 409 });
    const lista = ordenes(estado);
    return NextResponse.json({ formato: FORMATO_ORDEN, aviso: AVISO_ORDEN, n: lista.length, ordenes: lista });
  } catch {
    return NextResponse.json({ ok: false, error: 'Error interno al armar las órdenes.' }, { status: 500 });
  }
}
