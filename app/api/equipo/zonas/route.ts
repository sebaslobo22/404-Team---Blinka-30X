import { NextResponse, type NextRequest } from 'next/server';
import { anotar, exigirEscritura, falla, leerJson, quienDe, texto } from '../_servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** {ruta, agente, accion: 'tomar'|'soltar'}. Tomar una zona ya tomada por otro da 409 salvo forzar:true. */
export async function POST(req: NextRequest) {
  const w = exigirEscritura(req);
  if ('error' in w) return w.error;
  const body = await leerJson(req);
  const q = quienDe(body, req);
  const ruta = texto(body.ruta, 200);
  const accion = body.accion;
  if (!ruta || (accion !== 'tomar' && accion !== 'soltar')) return falla('hacen falta ruta y accion (tomar|soltar)', 400);
  const agente = texto(body.agente, 80) ?? q.quien;

  const { data: actual, error: e0 } = await w.db.from('equipo_zonas').select('*').eq('ruta', ruta).maybeSingle();
  if (e0) return falla(e0.message);

  if (accion === 'tomar') {
    if (actual?.agente && actual.agente !== agente && body.forzar !== true) {
      return NextResponse.json({ error: `Zona tomada por ${actual.agente}`, zona: actual }, { status: 409 });
    }
    const fila = { ruta, dueno: actual?.dueno ?? q.quien, agente, tomada_en: new Date().toISOString(), nota: texto(body.nota) ?? actual?.nota ?? null };
    const { data, error } = await w.db.from('equipo_zonas').upsert(fila).select().single();
    if (error) return falla(error.message);
    await anotar(w.db, q, 'zona tomada', `${ruta} por ${agente}`);
    return NextResponse.json({ zona: data });
  }
  if (!actual) return falla('zona desconocida', 404);
  const { data, error } = await w.db.from('equipo_zonas').update({ agente: null, tomada_en: null }).eq('ruta', ruta).select().single();
  if (error) return falla(error.message);
  await anotar(w.db, q, 'zona soltada', ruta);
  return NextResponse.json({ zona: data });
}
