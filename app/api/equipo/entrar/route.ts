import { NextResponse, type NextRequest } from 'next/server';
import { validarPin } from '../../../equipo/lib';
import { PIN_COOKIE, leerJson, pinDeSolicitud, texto } from '../_servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET: ¿esta sesión ya tiene PIN válido? */
export async function GET(req: NextRequest) {
  return NextResponse.json({ entrado: validarPin(pinDeSolicitud(req), process.env.EQUIPO_PIN) });
}

export async function POST(req: NextRequest) {
  const body = await leerJson(req);
  const pin = typeof body.pin === 'string' ? body.pin : undefined;
  if (!validarPin(pin, process.env.EQUIPO_PIN)) {
    return NextResponse.json({ error: 'PIN inválido' }, { status: 401 });
  }
  const res = NextResponse.json({ entrado: true });
  const base = { path: '/', maxAge: 60 * 60 * 24 * 14, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production' };
  res.cookies.set(PIN_COOKIE, pin!, { ...base, httpOnly: true });
  const quien = texto(body.quien, 60);
  if (quien) res.cookies.set('equipo_quien', quien, { ...base, httpOnly: false });
  return res;
}
