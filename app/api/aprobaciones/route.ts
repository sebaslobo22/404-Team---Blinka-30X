import { NextResponse } from 'next/server';
import { resolver } from '../../../src/demo/estado';
import type { CodigoRechazo } from '../../../src/demo/estado';
import { obtenerEstado } from '../../../src/demo/singleton';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** El nombre del revisor es fijo en la demo: nunca viene del cliente. */
const REVISOR = 'revisor-demo';

const ESTADO_HTTP: Record<CodigoRechazo, number> = {
  NO_ENCONTRADA: 404,
  NO_SE_PUEDE_APROBAR: 403,
  YA_RESUELTA: 409,
  ACCION_INVALIDA: 400,
};

export async function POST(req: Request) {
  let cuerpo: unknown;
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'El cuerpo debe ser JSON válido.' }, { status: 400 });
  }
  const o = typeof cuerpo === 'object' && cuerpo !== null && !Array.isArray(cuerpo) ? (cuerpo as Record<string, unknown>) : {};
  try {
    const estado = await obtenerEstado();
    const r = await resolver(estado, o['factura_id'], o['accion'], REVISOR);
    if (r.ok) return NextResponse.json({ ok: true, evento: r.evento, instruccion: r.instruccion });
    return NextResponse.json({ ok: false, codigo: r.codigo, error: r.mensaje }, { status: ESTADO_HTTP[r.codigo] });
  } catch {
    return NextResponse.json({ ok: false, error: 'Error interno al registrar la resolución.' }, { status: 500 });
  }
}
