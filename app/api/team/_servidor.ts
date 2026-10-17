// Ayudas de las rutas de escritura: PIN, cliente de servicio, bitácora.
import { NextResponse, type NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { clienteServidor } from '../../team/datos';
import { pinUsable, validarPinSeguro } from '../../team/lib';
import { modoPublico } from '../../../src/publico';

export const PIN_COOKIE = 'equipo_pin';

export function pinDeSolicitud(req: NextRequest): string | undefined {
  return req.headers.get('x-equipo-pin') ?? req.cookies.get(PIN_COOKIE)?.value;
}

/** 404 vacio, sin pistas: lo que ve quien llama a lo interno en el despliegue publico. */
export function respuesta404(): NextResponse {
  return new NextResponse(null, { status: 404 });
}

/** Devuelve una respuesta de error si no se puede escribir; null si todo bien. */
export function exigirEscritura(req: NextRequest): { error: NextResponse } | { db: SupabaseClient } {
  if (modoPublico(process.env)) return { error: respuesta404() };
  if (!pinUsable(process.env.EQUIPO_PIN)) {
    return { error: NextResponse.json({ error: 'PIN demasiado corto' }, { status: 503 }) };
  }
  if (!validarPinSeguro(pinDeSolicitud(req), process.env.EQUIPO_PIN)) {
    return { error: NextResponse.json({ error: 'PIN requerido o inválido' }, { status: 401 }) };
  }
  const db = clienteServidor();
  if (!db) return { error: NextResponse.json({ error: 'Sin conexión a Supabase: modo solo lectura' }, { status: 503 }) };
  return { db };
}

export async function leerJson(req: NextRequest): Promise<Record<string, unknown>> {
  try {
    const x = await req.json();
    return x && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function texto(x: unknown, max = 500): string | undefined {
  return typeof x === 'string' && x.trim() ? x.trim().slice(0, max) : undefined;
}

export function quienDe(body: Record<string, unknown>, req: NextRequest) {
  return {
    quien: texto(body.quien, 60) ?? req.headers.get('x-equipo-quien') ?? 'Equipo',
    es_agente: body.es_agente === true || req.headers.get('x-equipo-agente') === '1',
  };
}

export async function anotar(
  db: SupabaseClient,
  q: { quien: string; es_agente: boolean },
  accion: string,
  detalle?: string,
  commit?: string,
) {
  const { error } = await db.from('equipo_bitacora').insert({ ...q, accion, detalle: detalle ?? null, commit: commit ?? null });
  return error;
}

export function falla(msg: string, status = 500) {
  return NextResponse.json({ error: msg }, { status });
}
