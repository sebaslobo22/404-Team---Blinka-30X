import { NextResponse } from 'next/server';
import { cargarContexto } from '../../../team/datos';
import { agruparPorDueno } from '../../../team/lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const ctx = await cargarContexto();
  return NextResponse.json({ ...ctx, tareas: agruparPorDueno(ctx.tareas) }, { headers: { 'cache-control': 'no-store' } });
}
