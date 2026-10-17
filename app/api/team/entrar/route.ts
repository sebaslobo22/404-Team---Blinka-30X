import { NextResponse, type NextRequest } from 'next/server';
import { pinUsable, validarPinSeguro } from '../../../team/lib';
import { estadoBloqueo, limpiarIntentos, modoPublico, registrarFallo, type Intentos } from '../../../../src/publico';
import { PIN_COOKIE, leerJson, pinDeSolicitud, respuesta404, texto } from '../_servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Limite de intentos por IP, EN MEMORIA: 5 fallos y 15 minutos de bloqueo (429), mas una pausa corta
// ante cada fallo. En serverless (Vercel) cada instancia tiene su propia memoria y se reinicia cuando
// se duerme, asi que este limite es "mejor que nada", no una defensa real. La defensa de verdad es un
// PIN largo y aleatorio (EQUIPO_PIN de 16 o mas caracteres; ver docs/despliegue-vercel.md).
const intentos: Intentos = new Map();
const PAUSA_FALLO_MS = 750;

function ipDe(req: NextRequest): string {
  // En Vercel, x-forwarded-for lo fija la plataforma. Fuera de ella el cliente podria falsearla.
  const xff = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return req.headers.get('x-real-ip') ?? xff ?? 'desconocida';
}

/** GET: ¿esta sesión ya tiene PIN válido? */
export async function GET(req: NextRequest) {
  if (modoPublico(process.env)) return respuesta404();
  return NextResponse.json({ entrado: validarPinSeguro(pinDeSolicitud(req), process.env.EQUIPO_PIN) });
}

export async function POST(req: NextRequest) {
  if (modoPublico(process.env)) return respuesta404();
  // PIN corto: nadie entra, ni siquiera quien lo acierte.
  if (!pinUsable(process.env.EQUIPO_PIN)) {
    return NextResponse.json({ error: 'PIN demasiado corto' }, { status: 503 });
  }
  const ip = ipDe(req);
  const bloqueo = estadoBloqueo(intentos, ip, Date.now());
  if (bloqueo.bloqueado) {
    return NextResponse.json(
      { error: `Demasiados intentos. Reintenta en ${Math.ceil(bloqueo.reintentarEnSeg / 60)} min.` },
      { status: 429, headers: { 'retry-after': String(bloqueo.reintentarEnSeg) } },
    );
  }
  const body = await leerJson(req);
  const pin = typeof body.pin === 'string' ? body.pin : undefined;
  if (!validarPinSeguro(pin, process.env.EQUIPO_PIN)) {
    registrarFallo(intentos, ip, Date.now());
    await new Promise((r) => setTimeout(r, PAUSA_FALLO_MS));
    return NextResponse.json({ error: 'PIN inválido' }, { status: 401 });
  }
  limpiarIntentos(intentos, ip);
  const res = NextResponse.json({ entrado: true });
  const base = { path: '/', maxAge: 60 * 60 * 24 * 14, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production' };
  res.cookies.set(PIN_COOKIE, pin!, { ...base, httpOnly: true });
  const quien = texto(body.quien, 60);
  if (quien) res.cookies.set('equipo_quien', quien, { ...base, httpOnly: false });
  return res;
}
