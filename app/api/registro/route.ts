import { NextResponse } from 'next/server';
import { obtenerEstado } from '../../../src/demo/singleton';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const estado = await obtenerEstado();
    const [decisiones, aprobaciones] = await Promise.all([
      estado.registroDecisiones.verificar(estado.anclaInicial),
      estado.registroAprobaciones.verificar(),
    ]);
    return NextResponse.json({
      decisiones,
      aprobaciones,
      n_decisiones: estado.filas.length,
      n_aprobaciones: estado.aprobaciones.size,
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'Error interno al verificar el registro.' }, { status: 500 });
  }
}
