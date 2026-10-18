import { NextResponse } from 'next/server';
import { AVISO_ORDEN, FORMATO_ORDEN, ordenes } from '../../../src/demo/orden';
import { obtenerEstado } from '../../../src/demo/singleton';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Todas las órdenes de pago del lote. Formato propuesto: Blinka no publica API. Pulso no ejecuta pagos. */
export async function GET() {
  try {
    const estado = await obtenerEstado();
    const lista = ordenes(estado);
    return NextResponse.json({ formato: FORMATO_ORDEN, aviso: AVISO_ORDEN, n: lista.length, ordenes: lista });
  } catch {
    return NextResponse.json({ ok: false, error: 'Error interno al armar las órdenes.' }, { status: 500 });
  }
}
