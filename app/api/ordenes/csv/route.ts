import { NextResponse } from 'next/server';
import { ordenes, ordenesCsv, ordenesPorPagar } from '../../../../src/demo/orden';
import { obtenerEstado } from '../../../../src/demo/singleton';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Lote de órdenes en CSV. Por defecto solo las que faltan por pagar, para que una orden ya marcada
 * no se pague dos veces; `?incluir=pagadas` trae todas. El BOM hace que las hojas lean bien los acentos.
 */
export async function GET(req: Request) {
  try {
    const estado = await obtenerEstado();
    // Si el registro de decisiones no verifica, no sale ninguna orden: alguien altero una decision.
    const v = await estado.registroDecisiones.verificar(estado.anclaInicial);
    if (!v.ok) return NextResponse.json({ ok: false, codigo: 'REGISTRO_ALTERADO', error: 'El registro de decisiones no verifica: no se entrega ninguna orden hasta restaurarlo.' }, { status: 409 });
    const todas = new URL(req.url).searchParams.get('incluir') === 'pagadas';
    return new Response(`﻿${ordenesCsv(todas ? ordenes(estado) : ordenesPorPagar(estado))}`, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${todas ? 'pulso-ordenes-todas.csv' : 'pulso-lote-por-pagar.csv'}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'Error interno al armar el lote de órdenes.' }, { status: 500 });
  }
}
