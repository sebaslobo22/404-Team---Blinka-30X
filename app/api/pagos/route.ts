import { NextResponse } from 'next/server';
import { marcarPagada } from '../../../src/demo/orden';
import type { CodigoRechazoPago } from '../../../src/demo/orden';
import { obtenerEstado } from '../../../src/demo/singleton';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Quien marca es fijo en la demo: nunca viene del cliente. */
const REVISOR = 'revisor-demo';

const ESTADO_HTTP: Record<CodigoRechazoPago, number> = {
  NO_ENCONTRADA: 404,
  SIN_ORDEN: 403,
  YA_RESUELTA: 409,
  REFERENCIA_INVALIDA: 400,
};

/** Marca una orden como pagada con la referencia del banco. No mueve dinero: solo deja constancia. */
export async function POST(req: Request) {
  // Solo JSON: un formulario de otro sitio no puede enviar application/json sin que el navegador pregunte antes.
  if (!(req.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
    return NextResponse.json({ ok: false, error: 'El cuerpo debe ser JSON (application/json).' }, { status: 415 });
  }
  let cuerpo: unknown;
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'El cuerpo debe ser JSON válido.' }, { status: 400 });
  }
  const o = typeof cuerpo === 'object' && cuerpo !== null && !Array.isArray(cuerpo) ? (cuerpo as Record<string, unknown>) : {};
  try {
    const estado = await obtenerEstado();
    const r = await marcarPagada(estado, o['factura_id'], o['referencia_banco'], REVISOR);
    if (r.ok) return NextResponse.json({ ok: true, evento: r.evento, orden: r.orden });
    return NextResponse.json({ ok: false, codigo: r.codigo, error: r.mensaje }, { status: ESTADO_HTTP[r.codigo] });
  } catch {
    return NextResponse.json({ ok: false, error: 'Error interno al registrar el pago.' }, { status: 500 });
  }
}
