import { NextResponse, type NextRequest } from 'next/server';
import { esDueno, esEstado } from '../../../team/lib';
import { anotar, exigirEscritura, falla, leerJson, quienDe, texto } from '../_servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Crear (sin id) o actualizar (con id) una tarea: estado, dueño, orden, título, detalle, bloque. */
export async function POST(req: NextRequest) {
  const w = exigirEscritura(req);
  if ('error' in w) return w.error;
  const body = await leerJson(req);
  const q = quienDe(body, req);
  const campos: Record<string, unknown> = { actualizado_por: q.quien, actualizado_en: new Date().toISOString() };
  if (body.estado !== undefined) {
    if (!esEstado(body.estado)) return falla('estado inválido', 400);
    campos.estado = body.estado;
  }
  if (body.dueno !== undefined) {
    if (!esDueno(body.dueno)) return falla('dueño inválido', 400);
    campos.dueno = body.dueno;
  }
  for (const k of ['orden', 'bloque'] as const) {
    if (body[k] !== undefined) {
      if (!Number.isInteger(body[k])) return falla(`${k} debe ser entero`, 400);
      campos[k] = body[k];
    }
  }
  const titulo = texto(body.titulo, 300);
  if (titulo) campos.titulo = titulo;
  if (body.detalle !== undefined) campos.detalle = texto(body.detalle, 2000) ?? null;

  const id = texto(body.id, 64);
  if (id) {
    const { data, error } = await w.db.from('equipo_tareas').update(campos).eq('id', id).select().single();
    if (error) return falla(error.message, error.code === 'PGRST116' ? 404 : 500);
    const e = await anotar(w.db, q, 'tarea actualizada', `${data.titulo} → ${data.estado}`);
    return NextResponse.json({ tarea: data, bitacora_error: e?.message ?? null });
  }
  if (!titulo || !esDueno(body.dueno)) return falla('para crear hacen falta titulo y dueno', 400);
  const { data, error } = await w.db.from('equipo_tareas').insert(campos).select().single();
  if (error) return falla(error.message);
  const e = await anotar(w.db, q, 'tarea creada', `${data.titulo} (${data.dueno})`);
  return NextResponse.json({ tarea: data, bitacora_error: e?.message ?? null }, { status: 201 });
}
