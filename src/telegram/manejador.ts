import { decidir } from '../engine/decide';
import type { Config, Contexto, FacturaExtraida } from '../engine/types';
import type { EntradaFactura, ResultadoExtraccion } from '../extraccion/extraer';
import type { Almacen, FacturaVivo, ResumenFactura } from './almacen';
import type { TelegramApi } from './api';
import { MAX_BYTES, entradaDesdeBytes, validarBytes, validarReportado } from './archivo';
import {
  INTRO, NO_DISPONIBLE, NO_PUDE_LEER, PIDE_ARCHIVO, PIDE_START, fraseRazon, rechazoArchivo, rechazoCupo, textoDecision, textoParaDueno,
} from './mensajes';
import { aplicarTechoEnVivo } from './techo';
import { COMANDOS, ejecutarComando } from './comandos';
import { responderConversacion, vistaSoloLectura, type Conversar, type CupoChat } from './conversacion';
import { aprobadorDe, contextoDeEmpresa, ID_DEMO, reglasDeEmpresa, type Empresa } from './empresas';

// --- Forma de lo que manda Telegram (solo los campos que se usan) ---
export interface TgChat { id: number; type: string }
export interface TgUsuario { id: number; is_bot?: boolean }
export interface TgMensaje {
  message_id: number;
  chat: TgChat;
  from?: TgUsuario;
  text?: string;
  photo?: { file_id: string; file_size?: number }[];
  document?: { file_id: string; file_size?: number; mime_type?: string };
}
export interface TgCallback { id: string; from: TgUsuario; data?: string; message?: { message_id: number; chat: TgChat } }
export interface TgUpdate { update_id: number; message?: TgMensaje; callback_query?: TgCallback }

export interface ConfigBot {
  /** Id de Telegram de quien aprueba las facturas de la EMPRESA DEMO (Aurora). Las demas las aprueba su dueno. */
  duenoId: number | null;
  /** URL base publica del producto (PULSO_URL_PUBLICA). */
  urlPublica: string;
  topeDiario: number;
  maxPorChatHora: number;
  /** Tiempo maximo de la doble lectura; pasado esto se responde "no pude leerla". */
  limiteLecturaMs: number;
  /** Modo conversacional: mensajes por usuario y por hora, y tope global del dia (CHAT_POR_USUARIO_HORA, CHAT_GLOBAL_DIA). */
  chatPorUsuarioHora: number;
  chatGlobalDia: number;
  /** Tiempo maximo de una respuesta conversacional; pasado esto se responde la ayuda fija. */
  limiteChatMs: number;
}

export interface Deps {
  almacen: Almacen;
  telegram: TelegramApi;
  /** Doble lectura. En produccion es extraerFactura con los dos modelos fijos; en pruebas, un doble. */
  extraer: (e: EntradaFactura) => Promise<ResultadoExtraccion>;
  contexto: Contexto;
  cfgMotor: Config;
  config: ConfigBot;
  /** Modo conversacional. Ausente o null = apagado (CHAT_IA=0 o sin clave): texto suelto recibe la ayuda fija. */
  conversar?: Conversar | null;
  /** Cupo propio del modo conversacional, separado del de las facturas. */
  cupoChat?: CupoChat;
  ahora: () => Date;
  /** Registro de eventos sin datos sensibles (nunca URLs de Telegram). */
  log?: (evento: string) => void;
}

const CALLBACK = /^([ar]):([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;

/** Ejecuta un envio sin dejar que su fallo tumbe el resto del proceso. */
async function seguro<T>(d: Deps, que: string, f: () => Promise<T>): Promise<T | null> {
  try {
    return await f();
  } catch (e) {
    d.log?.(`fallo_${que}:${(e as Error).message.slice(0, 60)}`);
    return null;
  }
}

/**
 * Punto de entrada unico: lo usan el webhook y el modo local. Nunca lanza. Si el estado no esta o
 * Supabase falla, no procesa nada (falla cerrada) y, si puede, avisa que no esta disponible.
 */
export async function manejarUpdate(u: TgUpdate, d: Deps): Promise<void> {
  const chatId = u.message?.chat.id ?? u.callback_query?.message?.chat.id;
  try {
    // Descarte atomico de repetidos: INSERT ... ON CONFLICT DO NOTHING y mirar si inserto.
    if (!(await d.almacen.registrarUpdate(u.update_id))) {
      d.log?.('update_repetido');
      return;
    }
    if (u.callback_query) await manejarCallback(u.callback_query, d);
    else if (u.message) await manejarMensaje(u.message, u.update_id, d);
  } catch (e) {
    d.log?.(`error_interno:${(e as Error).message.slice(0, 60)}`);
    if (u.callback_query) await seguro(d, 'responder', () => d.telegram.responderCallback(u.callback_query!.id, NO_DISPONIBLE));
    else if (typeof chatId === 'number') await seguro(d, 'enviar', () => d.telegram.enviar(chatId, NO_DISPONIBLE));
  }
}

const esStart = (t: string | undefined) => /^\/start(@\w+)?(\s|$)/i.test((t ?? '').trim());

async function manejarMensaje(m: TgMensaje, updateId: number, d: Deps): Promise<void> {
  if (m.from?.is_bot) return;
  const chatId = m.chat.id;
  const decir = (t: string) => d.telegram.enviar(chatId, t);

  if (esStart(m.text)) {
    await d.almacen.iniciarChat(chatId, m.from?.id ?? null);
    // Quien llega por primera vez entra a la demo; nunca se le cambia la empresa a quien ya tiene una.
    if (!(await d.almacen.miembroDe(chatId))) await d.almacen.unirse(chatId, m.from?.id ?? null, ID_DEMO, 'EQUIPO');
    await decir(INTRO);
    return;
  }

  const cmd = COMANDOS.exec((m.text ?? '').trim());
  if (cmd) {
    if (!(await d.almacen.chatIniciado(chatId))) return void (await decir(PIDE_START));
    const respuesta = await ejecutarComando(cmd[1] as string, cmd[3] ?? '', {
      almacen: d.almacen,
      chatId,
      usuarioId: m.from?.id ?? null,
      privado: m.chat.type === 'private' && m.from?.id === chatId,
      ahora: d.ahora(),
      cupo: () => d.almacen.consumirCupo(chatId, d.ahora(), d.config.maxPorChatHora, d.config.topeDiario),
    });
    await decir(respuesta);
    return;
  }

  const foto = m.photo?.length ? [...m.photo].reverse().find((p) => !(typeof p.file_size === 'number' && p.file_size > MAX_BYTES)) : undefined;
  const archivo = m.document
    ? { id: m.document.file_id, tamano: m.document.file_size, mime: m.document.mime_type }
    : m.photo?.length
      ? { id: foto?.file_id, tamano: foto?.file_size ?? ((m.photo[m.photo.length - 1]?.file_size ?? 0) > MAX_BYTES ? MAX_BYTES + 1 : undefined), mime: 'image/jpeg' }
      : null;

  // Sin /start previo en este chat no se procesa ningun archivo.
  if (!(await d.almacen.chatIniciado(chatId))) {
    await decir(PIDE_START);
    return;
  }
  if (!archivo) {
    // Texto suelto: conversacion con IA (si esta encendida) o ayuda fija. Nunca escribe en el almacen.
    const texto = await responderConversacion(
      { texto: m.text, chatId, usuarioId: m.from?.id ?? null, privado: m.chat.type === 'private' && m.from?.id === chatId },
      {
        almacen: vistaSoloLectura(d.almacen),
        conversar: d.conversar,
        cupo: d.cupoChat,
        config: { urlPublica: d.config.urlPublica, chatPorUsuarioHora: d.config.chatPorUsuarioHora, chatGlobalDia: d.config.chatGlobalDia, limiteChatMs: d.config.limiteChatMs },
        ahora: d.ahora,
        proveedoresDemo: d.contexto.beneficiarios.length,
        ...(d.log ? { log: d.log } : {}),
      },
    );
    await decir(texto);
    return;
  }
  // La factura se decide con las reglas de la empresa del chat. Sin empresa, no se procesa.
  let miembro = await d.almacen.miembroDe(chatId);
  if (!miembro) {
    // Chat que hizo /start antes de las empresas: entra a la demo, como cualquier recien llegado.
    await d.almacen.unirse(chatId, m.from?.id ?? null, ID_DEMO, 'EQUIPO');
    miembro = await d.almacen.miembroDe(chatId);
  }
  const empresa = miembro ? await d.almacen.empresa(miembro.empresa_id) : null;
  if (!miembro || !empresa) {
    await decir(PIDE_START);
    return;
  }

  // Validacion previa a la descarga, con lo que reporta Telegram.
  const previa = validarReportado(archivo.tamano, archivo.mime);
  if (!previa.ok || !archivo.id) {
    await decir(rechazoArchivo(previa.ok ? 'GRANDE' : previa.motivo));
    return;
  }

  // Limites atomicos en la base: por chat y por hora, y tope global del dia.
  const cupo = await d.almacen.consumirCupo(chatId, d.ahora(), d.config.maxPorChatHora, d.config.topeDiario);
  if (cupo !== 'ok') {
    await decir(rechazoCupo(cupo, d.config.maxPorChatHora));
    return;
  }

  await seguro(d, 'enviar', () => decir('Recibida. La estoy leyendo con dos modelos, tarda unos segundos.'));

  // Descarga y segunda validacion (tamano real y firma de bytes).
  const info = await seguro(d, 'obtener_archivo', () => d.telegram.obtenerArchivo(archivo.id as string));
  if (!info) {
    await decir(NO_PUDE_LEER);
    return;
  }
  const reportado = validarReportado(info.tamano, undefined);
  if (!reportado.ok) {
    await decir(rechazoArchivo(reportado.motivo));
    return;
  }
  const bytes = await seguro(d, 'descargar', () => d.telegram.descargar(info.ruta, MAX_BYTES));
  if (!bytes) {
    await decir(NO_PUDE_LEER);
    return;
  }
  const real = validarBytes(bytes);
  if (!real.ok) {
    await decir(rechazoArchivo(real.motivo));
    return;
  }

  const lectura = await leerConLimite(d, entradaDesdeBytes(bytes, real.tipo));
  if (!lectura) {
    await decir(NO_PUDE_LEER);
    return;
  }
  const factura = fortalecer(lectura);
  // No se pudo leer (un modelo fallo, tardo o no hubo texto): sin decision, nunca PAGAR.
  if (factura.alertas?.some((a) => a.startsWith('lector_fallo'))) {
    await decir(NO_PUDE_LEER);
    return;
  }

  const idDecision = `TG-${updateId}`;
  const [contexto, reglas] = empresa.es_demo
    ? [d.contexto, d.cfgMotor]
    : [contextoDeEmpresa(await d.almacen.proveedores(empresa.id), d.ahora()), reglasDeEmpresa(d.cfgMotor, empresa)];
  const motor = decidir(idDecision, factura, contexto, reglas);
  const resultado = aplicarTechoEnVivo(motor);
  const resumen: ResumenFactura = {
    beneficiario: factura.beneficiario,
    numero_factura: factura.numero_factura,
    monto_centavos: factura.monto_centavos,
    moneda: factura.moneda,
  };
  const pendiente = resultado.decision === 'ESCALAR';
  const id = await d.almacen.guardarFactura({
    chat_id: chatId,
    empresa_id: empresa.id,
    update_id: updateId,
    decision: resultado.decision,
    decision_motor: motor.decision,
    razones: resultado.razones,
    resumen,
    estado_resolucion: pendiente ? 'PENDIENTE' : 'NO_APLICA',
  });

  const texto = textoDecision(resultado, resumen, factura.alertas ?? [], d.config.urlPublica);
  const botones = [
    { texto: 'Aprobar', data: `a:${id}` },
    { texto: 'Rechazar', data: `r:${id}` },
  ];
  const aprobador = aprobadorDe(empresa, d.config.duenoId);
  const esDueno = aprobador !== null && m.from?.id === aprobador.usuarioId && m.chat.type === 'private';

  if (pendiente && esDueno) {
    await decir(texto);
    await d.telegram.enviar(chatId, 'Esta factura espera tu decisión (simulada).', botones);
    return;
  }
  await decir(pendiente ? `${texto}\n\nQueda pendiente de la aprobación del dueño de ${nombreEmpresa(empresa)}.` : texto);
  if (pendiente && aprobador !== null) {
    const razones = resultado.razones.map((r) => fraseRazon(resultado, r));
    await seguro(d, 'avisar_dueno', () => d.telegram.enviar(aprobador.chatId, textoParaDueno(id, resumen, razones, empresa.nombre), botones));
  }
}

/** Doble lectura con tope de tiempo. null si tarda de mas. */
async function leerConLimite(d: Deps, entrada: EntradaFactura): Promise<ResultadoExtraccion | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limite = new Promise<null>((ok) => {
    timer = setTimeout(() => ok(null), d.config.limiteLecturaMs);
  });
  try {
    return await Promise.race([d.extraer(entrada).catch(() => null), limite]);
  } finally {
    clearTimeout(timer);
  }
}

/** Si responde un modelo distinto al pedido, la factura se marca con una alerta (el motor la manda a ESCALAR). */
function fortalecer(r: ResultadoExtraccion): FacturaExtraida {
  const alertas = [...(r.factura.alertas ?? [])];
  // Un servido ausente tampoco se puede comprobar: se trata igual que uno distinto.
  if (r.modelo_versiones.some((v) => v.servido !== v.pedido)) alertas.push('modelo_distinto');
  return { ...r.factura, alertas };
}

async function manejarCallback(cb: TgCallback, d: Deps): Promise<void> {
  const responder = (t: string) => d.telegram.responderCallback(cb.id, t);
  const m = cb.data ? CALLBACK.exec(cb.data) : null;
  if (!m) return void (await responder('Acción no válida.'));
  // Solo desde un chat privado con el dueno.
  const chat = cb.message?.chat;
  if (!chat || chat.type !== 'private' || chat.id !== cb.from.id) return void (await responder('Solo se aprueba desde un chat privado.'));

  const accion = m[1] === 'a' ? 'APROBADA' : 'RECHAZADA';
  const id = m[2] as string;
  // Se vuelve a leer el estado en el momento del clic (los botones viejos no mandan).
  const f = await d.almacen.obtenerFactura(id);
  if (!f) return void (await responder('Esa factura no existe.'));
  // Solo aprueba quien aprueba en la empresa DE ESA FACTURA (factura sin empresa: nadie).
  const empresa = f.empresa_id ? await d.almacen.empresa(f.empresa_id) : null;
  const aprobador = aprobadorDe(empresa, d.config.duenoId);
  if (aprobador === null || cb.from.id !== aprobador.usuarioId) return void (await responder('No estás autorizado para aprobar.'));
  if (f.decision !== 'ESCALAR') return void (await responder('Una factura frenada no se puede aprobar.'));
  if (f.estado_resolucion !== 'PENDIENTE') return void (await responder('Esta factura ya fue resuelta.'));
  // UPDATE condicional atomico: si otro clic se adelanto, devuelve false.
  if (!(await d.almacen.resolverFactura(id, accion, cb.from.id))) return void (await responder('Esta factura ya fue resuelta.'));

  await seguro(d, 'responder', () => responder(accion === 'APROBADA' ? 'Aprobada (simulada).' : 'Rechazada.'));
  if (cb.message) {
    const mid = cb.message.message_id;
    await seguro(d, 'quitar_botones', () => d.telegram.quitarBotones(chat.id, mid));
  }
  await avisarResolucion(f, accion, d);
}

async function avisarResolucion(f: FacturaVivo, accion: 'APROBADA' | 'RECHAZADA', d: Deps): Promise<void> {
  const que = accion === 'APROBADA' ? 'aprobada por el dueño (orden simulada: no se movió dinero)' : 'rechazada por el dueño';
  await seguro(d, 'avisar_origen', () => d.telegram.enviar(f.chat_id, `Tu factura ${f.resumen.numero_factura ?? ''} fue ${que}.`.replace('  ', ' ')));
}

const nombreEmpresa = (e: Empresa) => `«${e.nombre.replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 60)}»`;
