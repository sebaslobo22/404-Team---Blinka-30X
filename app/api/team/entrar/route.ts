import { NextResponse, type NextRequest } from 'next/server';
import { pinUsable, validarPinSeguro } from '../../../team/lib';
import { modoPublico } from '../../../../src/publico';
import { PIN_COOKIE, comprobarPin, leerJson, pinDeSolicitud, respuesta404, texto } from '../_servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// El limite de intentos por IP (5 fallos, 15 min, 429) vive en ../_servidor.ts (comprobarPin) y se
// comparte con las rutas de escritura. Aqui solo se anade una pausa corta ante cada fallo.
const PAUSA_FALLO_MS = 750;

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
  const body = await leerJson(req);
  const pin = typeof body.pin === 'string' ? body.pin : undefined;
  // Desde aqui no hay mas await antes de decidir: una rafaga paralela no se cuela por el limite.
  const rechazo = comprobarPin(req, pin);
  if (rechazo) {
    if (rechazo.status === 401) await new Promise((r) => setTimeout(r, PAUSA_FALLO_MS));
    return rechazo;
  }
  const res = NextResponse.json({ entrado: true });
  const base = { path: '/', maxAge: 60 * 60 * 24 * 14, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production' };
  res.cookies.set(PIN_COOKIE, pin!, { ...base, httpOnly: true });
  const quien = texto(body.quien, 60);
  if (quien) res.cookies.set('equipo_quien', quien, { ...base, httpOnly: false });
  return res;
}
