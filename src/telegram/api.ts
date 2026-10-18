/**
 * Cliente minimo de la API de Telegram (fetch nativo) detras de una interfaz, para probar con un doble.
 * El token solo sale de la configuracion y va dentro de la URL de Telegram: esas URLs NUNCA se registran
 * ni se incluyen en mensajes de error (los errores que salen de aqui son codigos cortos).
 */

export interface Boton {
  texto: string;
  data: string;
}

export interface ArchivoTelegram {
  /** Ruta interna de Telegram. No es secreta, pero con el token forma la URL de descarga: no se registra. */
  ruta: string;
  tamano: number | null;
}

export interface TelegramApi {
  enviar(chatId: number, texto: string, botones?: Boton[]): Promise<number | null>;
  quitarBotones(chatId: number, mensajeId: number): Promise<void>;
  responderCallback(callbackId: string, texto: string): Promise<void>;
  obtenerArchivo(fileId: string): Promise<ArchivoTelegram | null>;
  /** Descarga con tope: no lee mas de `maxBytes + 1` bytes. null si falla. */
  descargar(ruta: string, maxBytes: number): Promise<Uint8Array | null>;
}

const BASE = 'https://api.telegram.org';

export class TelegramHttp implements TelegramApi {
  constructor(private readonly token: string, private readonly f: typeof fetch = fetch) {}

  private async llamar<T>(metodo: string, cuerpo: Record<string, unknown>): Promise<T> {
    let r: Response;
    try {
      r = await this.f(`${BASE}/bot${this.token}/${metodo}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new Error(`telegram_red:${metodo}`);
    }
    if (!r.ok) throw new Error(`telegram_http_${r.status}:${metodo}`);
    const j = (await r.json().catch(() => null)) as { ok?: boolean; result?: T } | null;
    if (!j?.ok) throw new Error(`telegram_rechazo:${metodo}`);
    return j.result as T;
  }

  async enviar(chatId: number, texto: string, botones?: Boton[]): Promise<number | null> {
    const cuerpo: Record<string, unknown> = { chat_id: chatId, text: texto.slice(0, 4000), disable_web_page_preview: true };
    if (botones?.length) cuerpo['reply_markup'] = { inline_keyboard: [botones.map((b) => ({ text: b.texto, callback_data: b.data }))] };
    const r = await this.llamar<{ message_id?: number }>('sendMessage', cuerpo);
    return typeof r?.message_id === 'number' ? r.message_id : null;
  }

  async quitarBotones(chatId: number, mensajeId: number): Promise<void> {
    await this.llamar('editMessageReplyMarkup', { chat_id: chatId, message_id: mensajeId, reply_markup: { inline_keyboard: [] } });
  }

  async responderCallback(callbackId: string, texto: string): Promise<void> {
    await this.llamar('answerCallbackQuery', { callback_query_id: callbackId, text: texto.slice(0, 190), show_alert: false });
  }

  async obtenerArchivo(fileId: string): Promise<ArchivoTelegram | null> {
    const r = await this.llamar<{ file_path?: string; file_size?: number }>('getFile', { file_id: fileId });
    if (!r?.file_path) return null;
    return { ruta: r.file_path, tamano: typeof r.file_size === 'number' ? r.file_size : null };
  }

  async descargar(ruta: string, maxBytes: number): Promise<Uint8Array | null> {
    let r: Response;
    try {
      r = await this.f(`${BASE}/file/bot${this.token}/${ruta}`, { signal: AbortSignal.timeout(20_000) });
    } catch {
      throw new Error('telegram_red:descarga');
    }
    if (!r.ok) throw new Error(`telegram_http_${r.status}:descarga`);
    const largo = Number(r.headers.get('content-length'));
    if (Number.isFinite(largo) && largo > maxBytes) return new Uint8Array(maxBytes + 1);
    if (!r.body) return null;
    const trozos: Uint8Array[] = [];
    let total = 0;
    const lector = r.body.getReader();
    for (;;) {
      const { done, value } = await lector.read();
      if (done) break;
      total += value.length;
      trozos.push(value);
      if (total > maxBytes) {
        await lector.cancel().catch(() => undefined);
        break;
      }
    }
    const salida = new Uint8Array(total);
    let o = 0;
    for (const t of trozos) {
      salida.set(t, o);
      o += t.length;
    }
    return salida;
  }
}
