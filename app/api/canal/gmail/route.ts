import { NextResponse } from 'next/server';
import { obtenerEstado } from '../../../../src/demo/singleton';
import { URL_PUBLICA_POR_DEFECTO } from '../../../../src/telegram/deps';
import { entradaDesdeBytes } from '../../../../src/vivo/entrada';
import { canalGmailActivo, claveRemitente, MAX_BYTES_GMAIL, secretoValido, textoParaCorreo } from '../../../../src/vivo/gmail';
import { leerYDecidir } from '../../../../src/vivo/leer-y-decidir';
import { enteroEnv, Limitador } from '../../../../src/vivo/limite';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CLAVE = Symbol.for('pulso.gmail.limitador');
type Global = typeof globalThis & { [CLAVE]?: Limitador };
function limitador(): Limitador {
  const g = globalThis as Global;
  g[CLAVE] ??= new Limitador({
    porVisitanteHora: enteroEnv(process.env['GMAIL_POR_REMITENTE_HORA'], 5),
    globalDia: enteroEnv(process.env['GMAIL_GLOBAL_DIA'], 100),
  });
  return g[CLAVE];
}

const json = (status: number, cuerpo: Record<string, unknown>) => NextResponse.json(cuerpo, { status });

/**
 * Recibe un adjunto desde el script de Apps Script del buzon del equipo. Respuestas que el script usa
 * para decidir: 200 = responder en el hilo con `texto`; 4xx con `texto` = responder ese aviso y no
 * reintentar; 401/503 = configuracion, reintentar y luego marcar error; 5xx (incluido 502 si ningun
 * modelo pudo leer) = reintentar.
 */
export async function POST(req: Request) {
  if (!canalGmailActivo()) return json(503, { ok: false, codigo: 'APAGADO', error: 'El canal de Gmail no está activado en este despliegue.' });
  if (!secretoValido(req.headers.get('authorization'), process.env['GMAIL_CANAL_SECRETO'])) return json(401, { ok: false, codigo: 'NO_AUTORIZADO' });

  const largo = Number(req.headers.get('content-length') ?? '0');
  if (largo > MAX_BYTES_GMAIL + 64 * 1024) return json(413, { ok: false, codigo: 'MUY_GRANDE', texto: 'El adjunto pesa más de 3 MB. Envía una foto más liviana o un PDF más pequeño.' });

  let archivo: File | null = null;
  let remitente: FormDataEntryValue | null = null;
  try {
    const form = await req.formData();
    const v = form.get('factura');
    archivo = v instanceof File ? v : null;
    remitente = form.get('remitente');
  } catch {
    return json(400, { ok: false, codigo: 'FORMULARIO', texto: 'No encontré ningún adjunto en el correo.' });
  }
  if (!archivo) return json(400, { ok: false, codigo: 'FORMULARIO', texto: 'No encontré ningún adjunto en el correo.' });
  const bytes = new Uint8Array(await archivo.arrayBuffer());
  if (bytes.length > MAX_BYTES_GMAIL) return json(413, { ok: false, codigo: 'MUY_GRANDE', texto: 'El adjunto pesa más de 3 MB. Envía una foto más liviana o un PDF más pequeño.' });

  const r = entradaDesdeBytes(bytes);
  if (!r.ok) return json(415, { ok: false, codigo: r.codigo, texto: r.mensaje });

  const cupo = limitador().intentar(claveRemitente(remitente));
  if (!cupo.ok) return json(429, { ok: false, codigo: `LIMITE_${cupo.motivo}`, texto: cupo.mensaje });

  try {
    const vivo = await leerYDecidir(r.entrada, await obtenerEstado());
    // Si ningun modelo respondio (red, clave, tiempo agotado), no hay lectura que contar: el script reintenta.
    if (vivo.modelos.length > 0 && vivo.modelos.every((m) => !m.ok)) return json(502, { ok: false, codigo: 'LECTOR_CAIDO' });
    const url = (process.env['PULSO_URL_PUBLICA'] ?? '').trim().replace(/\/+$/, '') || URL_PUBLICA_POR_DEFECTO;
    return json(200, { ok: true, id: vivo.id, decision: vivo.resultado.decision, texto: textoParaCorreo(vivo, url) });
  } catch {
    return json(500, { ok: false, codigo: 'INTERNO' });
  }
}
