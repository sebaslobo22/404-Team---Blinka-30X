import { NextResponse } from 'next/server';
import { validarParametros } from '../../../src/demo/parametros';
import { obtenerEstado, reemplazarEstado, reiniciarEstado } from '../../../src/demo/singleton';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let cuerpo: unknown;
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'El cuerpo debe ser JSON válido.' }, { status: 400 });
  }
  const v = validarParametros(cuerpo);
  if (!v.ok) return NextResponse.json({ ok: false, error: v.error }, { status: 400 });
  try {
    const actual = await obtenerEstado();
    const nuevo = await reemplazarEstado(v.params, actual.edicion + 1);
    return NextResponse.json({ ok: true, version: nuevo.config.version });
  } catch {
    return NextResponse.json({ ok: false, error: 'Error interno al aplicar las reglas.' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const nuevo = await reiniciarEstado();
    return NextResponse.json({ ok: true, version: nuevo.config.version });
  } catch {
    return NextResponse.json({ ok: false, error: 'Error interno al restablecer las reglas.' }, { status: 500 });
  }
}
