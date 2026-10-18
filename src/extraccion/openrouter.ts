/** Cliente minimo de OpenRouter con fetch nativo. La clave sale de process.env y nunca se imprime ni se guarda. */

const URL_OPENROUTER = 'https://openrouter.ai/api/v1/chat/completions';

export interface PeticionLLM {
  modelo: string;
  sistema: string;
  /** Texto del usuario. */
  texto: string;
  /** Imagen como data URL base64 (data:image/png;base64,...). */
  imagenDataUrl?: string;
  /** Si viene, se pide salida estricta con este JSON Schema. */
  esquema?: { name: string; schema: Record<string, unknown> };
  /**
   * Preferencias de proveedor de OpenRouter (campo `provider` del cuerpo). Opcional: si no viene, el
   * cuerpo es identico al de siempre (web y replay no cambian). El bot de Telegram lo usa para fijar
   * `allow_fallbacks: false` (nadie contesta en lugar del modelo pedido) y `data_collection: 'deny'`.
   */
  proveedor?: { allow_fallbacks?: boolean; data_collection?: 'allow' | 'deny' };
}

export interface OpcionesLLM {
  apiKey?: string;
  timeoutMs?: number;
  /** Reintentos tras el primer intento (default 1). */
  reintentos?: number;
  fetchImpl?: typeof fetch;
}

export interface RespuestaLLM {
  contenido: string;
  modelo_servido: string | null;
  tokens_entrada: number;
  tokens_salida: number;
  /** Costo en USD si OpenRouter lo informa (usage.cost); si no, null. */
  costo_usd: number | null;
  /** Latencia total en ms, incluidos reintentos. */
  ms: number;
  intentos: number;
}

/** Fallo de la llamada. `motivo` es corto y seguro de registrar (nunca contiene la clave). */
export class ErrorLLM extends Error {
  constructor(public motivo: string) {
    super(motivo);
    this.name = 'ErrorLLM';
  }
}

function mensajes(p: PeticionLLM) {
  const contenido: Record<string, unknown>[] = [{ type: 'text', text: p.texto }];
  if (p.imagenDataUrl) contenido.push({ type: 'image_url', image_url: { url: p.imagenDataUrl } });
  return [
    { role: 'system', content: p.sistema },
    { role: 'user', content: contenido },
  ];
}

function cuerpo(p: PeticionLLM, conEsquema: boolean) {
  const b: Record<string, unknown> = {
    model: p.modelo,
    messages: mensajes(p),
    temperature: 0,
    max_tokens: 1200,
    usage: { include: true },
  };
  if (p.proveedor) b['provider'] = p.proveedor;
  if (p.esquema && conEsquema) {
    b['response_format'] = { type: 'json_schema', json_schema: { name: p.esquema.name, strict: true, schema: p.esquema.schema } };
  } else {
    b['response_format'] = { type: 'json_object' };
  }
  return b;
}

const limpiar = (s: string) => s.replace(/sk-[A-Za-z0-9_-]{8,}/g, '[clave]').slice(0, 160);

/** Una llamada con timeout de 30 s y un reintento (red, timeout, 429, 5xx; y 400 sin esquema estricto). */
export async function llamarOpenRouter(p: PeticionLLM, o: OpcionesLLM = {}): Promise<RespuestaLLM> {
  const apiKey = o.apiKey ?? process.env['OPENROUTER_API_KEY'];
  if (!apiKey) throw new ErrorLLM('sin_clave');
  const f = o.fetchImpl ?? fetch;
  const timeoutMs = o.timeoutMs ?? 30_000;
  const maxIntentos = 1 + (o.reintentos ?? 1);
  const t0 = Date.now();
  let conEsquema = true;
  let ultimo = 'desconocido';
  for (let intento = 1; intento <= maxIntentos; intento++) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const r = await f(URL_OPENROUTER, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'X-Title': 'Agente pagador 404' },
        body: JSON.stringify(cuerpo(p, conEsquema)),
        signal: ctl.signal,
      });
      const texto = await r.text();
      if (!r.ok) {
        ultimo = `http_${r.status}`;
        // El modelo no soporta esquema estricto: reintenta sin el.
        if (r.status === 400 && conEsquema && p.esquema) conEsquema = false;
        else if (r.status !== 429 && r.status < 500) throw new ErrorLLM(`${ultimo}:${limpiar(texto).slice(0, 100)}`);
        continue;
      }
      let j: any;
      try {
        j = JSON.parse(texto);
      } catch {
        ultimo = 'respuesta_no_json';
        continue;
      }
      if (j?.error) {
        ultimo = `error_proveedor:${limpiar(String(j.error?.message ?? j.error?.code ?? ''))}`;
        continue;
      }
      const msg = j?.choices?.[0]?.message?.content;
      const contenido = typeof msg === 'string' ? msg : Array.isArray(msg) ? msg.map((x: any) => x?.text ?? '').join('') : '';
      if (!contenido.trim()) {
        ultimo = 'respuesta_vacia';
        continue;
      }
      const u = j?.usage ?? {};
      return {
        contenido,
        modelo_servido: typeof j?.model === 'string' ? j.model : null,
        tokens_entrada: Number(u.prompt_tokens) || 0,
        tokens_salida: Number(u.completion_tokens) || 0,
        costo_usd: typeof u.cost === 'number' ? u.cost : null,
        ms: Date.now() - t0,
        intentos: intento,
      };
    } catch (e) {
      if (e instanceof ErrorLLM) throw e;
      ultimo = (e as Error)?.name === 'AbortError' ? 'timeout' : 'red';
    } finally {
      clearTimeout(timer);
    }
  }
  throw new ErrorLLM(ultimo);
}
