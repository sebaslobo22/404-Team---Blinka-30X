import { NextResponse } from 'next/server';
import { reiniciarEstado } from '../../../../src/demo/singleton';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    await reiniciarEstado();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'Error interno al restaurar la demo.' }, { status: 500 });
  }
}
