// Ayudas de las rutas de escritura: PIN, cliente de servicio, bitácora.
import { NextResponse, type NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { clienteServidor } from '../../team/datos';
import { pinUsable, validarPinSeguro } from '../../team/lib';
import { estadoBloqueo, limpiarIntentos, modoPublico, registrarFallo, type Intentos } from '../../../src/publico';

export const PIN_COOKIE = 'equipo_pin';

export function pinDeSolicitud(req: NextRequest): string | undefined {
  return req.headers.get('x-equipo-pin') ?? req.cookies.get(PIN_COOKIE)?.value;
}

/** 404 vacio, sin pistas: lo que ve quien llama a lo interno en el despliegue publico. */
export function respuesta404(): NextResponse {
  return new NextResponse(null, { status: 404 });
}

// Limite de intentos por IP, EN MEMORIA: 5 fallos y 15 minutos de bloqueo (429). Compartido por la
// entrada (POST /api/team/entrar) y por las escrituras con cabecera x-equipo-pin, para que no haya un
// camino sin limite. En serverless (Vercel) cada instancia tiene su propia memoria y se reinicia cuando
// se duerme, asi que este limite es "mejor que nada", no una defensa real. La defensa de verdad es un
// PIN largo y aleatorio (EQUIPO_PIN de 16 o mas caracteres; ver docs/despliegue-vercel.md).
const intentos: Intentos = new Map();

export function ipDe(req: NextRequest): string {
  // En Vercel, x-forwarded-for lo fija la plataforma. Fuera de ella el cliente podria falsearla.
  const xff = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return req.headers.get('x-real-ip') ?? xff ?? 'desconocida';
}

/**
 * Comprueba el PIN con limite de intentos. Sincrona (sin await) para que una rafaga paralela no
 * pase el limite. Un PIN ausente no cuenta como fallo; uno presente y erroneo si.
 * Devuelve la respuesta de error, o null si el PIN es valido.
 */
export function comprobarPin(req: NextRequest, recibido: string | undefined): NextResponse | null {
  const ip = ipDe(req);
  const bloqueo = estadoBloqueo(intentos, ip, Date.now());
  if (bloqueo.bloqueado) {
    return NextResponse.json(
      { error: `Demasiados intentos. Reintenta en ${Math.ceil(bloqueo.reintentarEnSeg / 60)} min.` },
      { status: 429, headers: { 'retry-after': String(bloqueo.reintentarEnSeg) } },
    );
  }
  if (validarPinSeguro(recibido, process.env.EQUIPO_PIN)) {
    limpiarIntentos(intentos, ip);
    return null;
  }
  if (recibido) registrarFallo(intentos, ip, Date.now());
  return NextResponse.json({ error: recibido ? 'PIN inválido' : 'PIN requerido o inválido' }, { status: 401 });
}

/** Devuelve una respuesta de error si no se puede escribir; null si todo bien. */
export function exigirEscritura(req: NextRequest): { error: NextResponse } | { db: SupabaseClient } {
  if (modoPublico(process.env)) return { error: respuesta404() };
  if (!pinUsable(process.env.EQUIPO_PIN)) {
    return { error: NextResponse.json({ error: 'PIN demasiado corto' }, { status: 503 }) };
  }
  const rechazo = comprobarPin(req, pinDeSolicitud(req));
  if (rechazo) return { error: rechazo };
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
