import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { obtenerEstado } from '../../../src/demo/singleton';
import { lecturaEnVivoActiva } from '../../../src/vivo/activa';
import { entradaDesdeBytes, MAX_BYTES } from '../../../src/vivo/entrada';
import { leerYDecidir } from '../../../src/vivo/leer-y-decidir';
import { enteroEnv, Limitador } from '../../../src/vivo/limite';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Dos lecturas en paralelo con un reintento cada una pueden tardar; el lector corta a los 30 s.
export const maxDuration = 60;

const CLAVE = Symbol.for('pulso.vivo.limitador');
type Global = typeof globalThis & { [CLAVE]?: Limitador };
function limitador(): Limitador {
  const g = globalThis as Global;
  g[CLAVE] ??= new Limitador({
    porVisitanteHora: enteroEnv(process.env['VIVO_POR_VISITANTE_HORA'], 5),
    globalDia: enteroEnv(process.env['VIVO_GLOBAL_DIA'], 150),
  });
  return g[CLAVE];
}

/** Se guarda un resumen de la IP, nunca la IP. */
function visitante(req: Request): string {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'sin-ip';
  return createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

export async function GET() {
  return NextResponse.json({ activa: lecturaEnVivoActiva() });
}

export async function POST(req: Request) {
  if (!lecturaEnVivoActiva()) {
    return NextResponse.json({ ok: false, codigo: 'APAGADA', error: 'La lectura en vivo no está activada en este despliegue.' }, { status: 503 });
  }
  const largo = Number(req.headers.get('content-length') ?? '0');
  if (largo > MAX_BYTES + 64 * 1024) {
    return NextResponse.json({ ok: false, codigo: 'MUY_GRANDE', error: 'El archivo pesa más de 4 MB.' }, { status: 413 });
  }
  let archivo: File | null = null;
  try {
    const form = await req.formData();
    const v = form.get('factura');
    archivo = v instanceof File ? v : null;
  } catch {
    return NextResponse.json({ ok: false, codigo: 'FORMULARIO', error: 'No llegó ningún archivo.' }, { status: 400 });
  }
  if (!archivo) return NextResponse.json({ ok: false, codigo: 'FORMULARIO', error: 'No llegó ningún archivo.' }, { status: 400 });

  // Se valida el archivo antes de contar el limite: un archivo malo no gasta cupo.
  const r = entradaDesdeBytes(new Uint8Array(await archivo.arrayBuffer()));
  if (!r.ok) return NextResponse.json({ ok: false, codigo: r.codigo, error: r.mensaje }, { status: r.codigo === 'MUY_GRANDE' ? 413 : 415 });

  const cupo = limitador().intentar(visitante(req));
  if (!cupo.ok) return NextResponse.json({ ok: false, codigo: `LIMITE_${cupo.motivo}`, error: cupo.mensaje }, { status: 429 });

  try {
    const estado = await obtenerEstado();
    const vivo = await leerYDecidir(r.entrada, estado);
    return NextResponse.json({ ok: true, tipo: r.tipo, restantes: cupo.restantesVisitante, ...vivo });
  } catch {
    // leerYDecidir no deberia lanzar (el lector y el motor fallan cerrado), pero si pasa no hay decision.
    return NextResponse.json({ ok: false, codigo: 'INTERNO', error: 'No pudimos leer la factura. No se tomó ninguna decisión.' }, { status: 500 });
  }
}
