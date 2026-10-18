// Ayudas compartidas de las pruebas del bot de Telegram: dobles de Telegram, de OpenRouter y del almacen.
// Nada aqui toca la red ni usa claves reales.
import { extraerFactura, type EntradaFactura, type Lectura, type ResultadoExtraccion } from '../src/extraccion/extraer';
import { ErrorLLM, type PeticionLLM, type RespuestaLLM } from '../src/extraccion/openrouter';
import type { ArchivoTelegram, Boton, TelegramApi } from '../src/telegram/api';
import { contextoYReglasDeAurora } from '../src/telegram/deps';
import type { ConfigBot, Deps, TgUpdate } from '../src/telegram/manejador';
import { AlmacenEnMemoria } from '../src/telegram/memoria';

export const DUENO = 777;
export const JURADO = 111;

export interface Enviado {
  chat: number;
  texto: string;
  botones?: Boton[];
}

/** Doble de la API de Telegram: guarda lo enviado y sirve archivos de un mapa. */
export class TelegramFalso implements TelegramApi {
  enviados: Enviado[] = [];
  callbacks: { id: string; texto: string }[] = [];
  botonesQuitados: { chat: number; mensaje: number }[] = [];
  archivos = new Map<string, { bytes: Uint8Array; tamanoReportado?: number | null }>();
  descargas = 0;
  /** Si se pone, el envio a ese chat falla (p. ej. el dueno nunca abrio el bot). */
  chatsCaidos = new Set<number>();
  private n = 100;

  async enviar(chatId: number, texto: string, botones?: Boton[]): Promise<number | null> {
    if (this.chatsCaidos.has(chatId)) throw new Error('telegram_http_403:sendMessage');
    this.enviados.push({ chat: chatId, texto, ...(botones ? { botones } : {}) });
    return ++this.n;
  }
  async quitarBotones(chat: number, mensaje: number): Promise<void> {
    this.botonesQuitados.push({ chat, mensaje });
  }
  async responderCallback(id: string, texto: string): Promise<void> {
    this.callbacks.push({ id, texto });
  }
  async obtenerArchivo(fileId: string): Promise<ArchivoTelegram | null> {
    const a = this.archivos.get(fileId);
    if (!a) return null;
    return { ruta: `docs/${fileId}`, tamano: a.tamanoReportado === undefined ? a.bytes.length : a.tamanoReportado };
  }
  async descargar(ruta: string): Promise<Uint8Array | null> {
    this.descargas++;
    return this.archivos.get(ruta.replace('docs/', ''))?.bytes ?? null;
  }
  /** Textos enviados a un chat. */
  a(chat: number): string[] {
    return this.enviados.filter((e) => e.chat === chat).map((e) => e.texto);
  }
  ultimo(chat: number): Enviado | undefined {
    return this.enviados.filter((e) => e.chat === chat).at(-1);
  }
}

export const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]);
export const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]);
export const PDF = new Uint8Array(Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n'));
export const EXE = new Uint8Array([0x4d, 0x5a, 0x90, 0, 3, 0]);

/** Lectura que un modelo daria de una factura. Por defecto: copia exacta de Luz Andina dentro del acuerdo. */
export function lecturaClon(extra: Partial<Lectura> = {}): Lectura {
  return {
    beneficiario: 'Luz Andina S.A.C.', id_fiscal: 'FIC-PE-001', cuenta: 'ACC-PE-0001', monto: '6000.00', moneda: 'PEN',
    moneda_explicita: true, fecha: '2026-10-16', fecha_vencimiento: '2026-11-16', numero_factura: 'LA-2026-9001',
    categoria: 'Infraestructura', confianza: 0.97, instrucciones_detectadas: false, ...extra,
  };
}

export interface OpcionesLlamada {
  lectura?: Lectura;
  /** Lectura distinta para el segundo modelo. */
  lecturaB?: Lectura;
  /** Modelo que dice haber respondido, por modelo pedido. Por defecto el mismo. */
  servido?: (pedido: string) => string | null;
  falla?: boolean;
  lanza?: Error;
}

/** Doble de OpenRouter: devuelve JSON valido sin salir a la red. */
export function llamarFalso(o: OpcionesLlamada = {}): { llamar: (p: PeticionLLM) => Promise<RespuestaLLM>; peticiones: PeticionLLM[] } {
  const peticiones: PeticionLLM[] = [];
  const llamar = async (p: PeticionLLM): Promise<RespuestaLLM> => {
    peticiones.push(p);
    if (o.lanza) throw o.lanza;
    if (o.falla) throw new ErrorLLM('http_500');
    const esB = peticiones.length % 2 === 0;
    const l = esB ? (o.lecturaB ?? o.lectura ?? lecturaClon()) : (o.lectura ?? lecturaClon());
    return {
      contenido: JSON.stringify(l),
      modelo_servido: o.servido ? o.servido(p.modelo) : p.modelo,
      tokens_entrada: 10, tokens_salida: 10, costo_usd: 0.001, ms: 5, intentos: 1,
    };
  };
  return { llamar, peticiones };
}

export const extractorCon = (llamar: (p: PeticionLLM) => Promise<RespuestaLLM>) => (e: EntradaFactura): Promise<ResultadoExtraccion> =>
  extraerFactura(e, { replay: false, llamar });

export function crearDepsPrueba(o: Omit<Partial<Deps>, 'config'> & { config?: Partial<ConfigBot> } = {}): Deps & { almacen: AlmacenEnMemoria; telegram: TelegramFalso } {
  const { contexto, cfgMotor } = contextoYReglasDeAurora();
  const base: Deps = {
    almacen: new AlmacenEnMemoria(),
    telegram: new TelegramFalso(),
    extraer: extractorCon(llamarFalso().llamar),
    contexto,
    cfgMotor,
    config: { duenoId: DUENO, urlPublica: 'https://pulso.example', topeDiario: 100, maxPorChatHora: 5, limiteLecturaMs: 5000, ...o.config },
    ahora: () => new Date('2026-10-17T15:00:00Z'),
    ...(o.log ? { log: o.log } : {}),
  };
  const { config: _c, ...resto } = o;
  return { ...base, ...resto, config: base.config } as Deps & { almacen: AlmacenEnMemoria; telegram: TelegramFalso };
}

let contador = 1000;
export const siguienteUpdate = () => ++contador;

export function mensajeTexto(chat: number, texto: string, o: { desde?: number; tipo?: string; update?: number } = {}): TgUpdate {
  return { update_id: o.update ?? siguienteUpdate(), message: { message_id: 1, chat: { id: chat, type: o.tipo ?? 'private' }, from: { id: o.desde ?? chat }, text: texto } };
}

export function mensajeArchivo(chat: number, fileId: string, o: { desde?: number; tipo?: string; mime?: string; tamano?: number; foto?: boolean; update?: number } = {}): TgUpdate {
  const base = { message_id: 2, chat: { id: chat, type: o.tipo ?? 'private' }, from: { id: o.desde ?? chat } };
  const msg = o.foto
    ? { ...base, photo: [{ file_id: `${fileId}-chica`, file_size: 100 }, { file_id: fileId, ...(o.tamano !== undefined ? { file_size: o.tamano } : {}) }] }
    : { ...base, document: { file_id: fileId, mime_type: o.mime ?? 'application/pdf', ...(o.tamano !== undefined ? { file_size: o.tamano } : {}) } };
  return { update_id: o.update ?? siguienteUpdate(), message: msg };
}

export function callback(data: string, o: { desde?: number; chat?: number; tipo?: string; update?: number } = {}): TgUpdate {
  const desde = o.desde ?? DUENO;
  return {
    update_id: o.update ?? siguienteUpdate(),
    callback_query: { id: `cb-${contador}`, from: { id: desde }, data, message: { message_id: 55, chat: { id: o.chat ?? desde, type: o.tipo ?? 'private' } } },
  };
}
