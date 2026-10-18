import { NextResponse } from 'next/server';
import { obtenerEstado } from '../../../src/demo/singleton';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const estado = await obtenerEstado();
    const [decisiones, aprobaciones, pagos] = await Promise.all([
      estado.registroDecisiones.verificar(estado.anclaInicial),
      estado.registroAprobaciones.verificar(),
      estado.registroPagos.verificar(),
    ]);
    return NextResponse.json({
      decisiones,
      aprobaciones,
      pagos,
      n_decisiones: estado.filas.length,
      n_aprobaciones: estado.aprobaciones.size,
      n_pagos: estado.pagos.size,
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'Error interno al verificar el registro.' }, { status: 500 });
  }
}
