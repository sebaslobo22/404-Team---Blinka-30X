import { NextResponse, type NextRequest } from 'next/server';
import { anotar, exigirEscritura, falla, leerJson, quienDe, texto } from '../_servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** {clave, valor}: reemplaza el valor JSON de una clave de equipo_estado (p. ej. "ahora"). */
export async function POST(req: NextRequest) {
  const w = exigirEscritura(req);
  if ('error' in w) return w.error;
  const body = await leerJson(req);
  const clave = texto(body.clave, 60);
  if (!clave || body.valor === undefined || body.valor === null) return falla('hacen falta clave y valor', 400);
  const { data, error } = await w.db
    .from('equipo_estado')
    .upsert({ clave, valor: body.valor, actualizado_en: new Date().toISOString() })
    .select()
    .single();
  if (error) return falla(error.message);
  await anotar(w.db, quienDe(body, req), 'estado actualizado', clave);
  return NextResponse.json({ estado: data });
}
