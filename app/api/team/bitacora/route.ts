import { NextResponse, type NextRequest } from 'next/server';
import { exigirEscritura, falla, leerJson, quienDe, texto } from '../_servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const w = exigirEscritura(req);
  if ('error' in w) return w.error;
  const body = await leerJson(req);
  const q = quienDe(body, req);
  const accion = texto(body.accion, 200) ?? texto(body.nota, 200);
  if (!accion) return falla('falta accion', 400);
  const { data, error } = await w.db
    .from('equipo_bitacora')
    .insert({ ...q, accion, detalle: texto(body.detalle, 2000) ?? null, commit: texto(body.commit, 64) ?? null })
    .select()
    .single();
  if (error) return falla(error.message);
  return NextResponse.json({ entrada: data }, { status: 201 });
}
