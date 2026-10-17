import { NextResponse } from 'next/server';
import { obtenerEstado } from '../../../../src/demo/singleton';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Solo demuestra que una alteración del registro se detecta. Se deshace con "Restaurar demo". */
export async function POST(req: Request) {
  let cuerpo: unknown;
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'El cuerpo debe ser JSON válido.' }, { status: 400 });
  }
  const indice = typeof cuerpo === 'object' && cuerpo !== null ? (cuerpo as Record<string, unknown>)['indice'] : undefined;
  try {
    const estado = await obtenerEstado();
    const ultimo = estado.filas.length - 1;
    if (typeof indice !== 'number' || !Number.isInteger(indice) || indice < 0 || indice > ultimo) {
      return NextResponse.json({ ok: false, error: `El índice debe ser un entero entre 0 y ${ultimo}.` }, { status: 400 });
    }
    if (!estado.almacenDecisiones.corromper(indice)) {
      return NextResponse.json({ ok: false, error: 'No existe esa entrada en el registro.' }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: 'Error interno al simular la manipulación.' }, { status: 500 });
  }
}
