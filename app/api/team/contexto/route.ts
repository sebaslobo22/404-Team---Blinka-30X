import { NextResponse } from 'next/server';
import { cargarContexto } from '../../../team/datos';
import { agruparPorDueno } from '../../../team/lib';
import { modoPublico } from '../../../../src/publico';
import { respuesta404 } from '../_servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (modoPublico(process.env)) return respuesta404();
  const ctx = await cargarContexto();
  return NextResponse.json({ ...ctx, tareas: agruparPorDueno(ctx.tareas) }, { headers: { 'cache-control': 'no-store' } });
}
