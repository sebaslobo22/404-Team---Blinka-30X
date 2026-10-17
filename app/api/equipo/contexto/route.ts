import { NextResponse } from 'next/server';
import { cargarContexto } from '../../../equipo/datos';
import { agruparPorDueno } from '../../../equipo/lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const ctx = await cargarContexto();
  return NextResponse.json({ ...ctx, tareas: agruparPorDueno(ctx.tareas) }, { headers: { 'cache-control': 'no-store' } });
}
