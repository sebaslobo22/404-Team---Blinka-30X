import type { Almacen } from './almacen';
import { ID_DEMO, LIMITES_USD, nombreValido, normalizarCodigo, nuevoCodigo, type Empresa, type Miembro } from './empresas';
import { limpio } from './mensajes';

/**
 * Onboarding de empresas por comandos atomicos (sin conversacion por pasos que pueda quedar trabada):
 * /crear, /unirme, /demo, /empresa, /proveedor, /limite. Todos solo en chat privado.
 */

export const COMANDOS = /^\/(crear|unirme|demo|empresa|proveedor|limite|ayuda)(@\w+)?(?:\s+([\s\S]*))?$/i;

export interface Contexto {
  almacen: Almacen;
  chatId: number;
  usuarioId: number | null;
  privado: boolean;
  ahora: Date;
  /** Reserva un intento contra el mismo cupo de las facturas (evita adivinar codigos a fuerza bruta). */
  cupo: () => Promise<'ok' | 'chat' | 'dia'>;
}

const usd = (centavos: number) => `USD ${(centavos / 100).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;

export const AYUDA = [
  'Esto puedo hacer:',
  '/crear Nombre de tu empresa: creas tu empresa y quedas como dueño (tú apruebas).',
  '/unirme PULSO-XXXXXX: te unes a la empresa de tu equipo para enviarle facturas.',
  '/empresa: te digo en qué empresa estás y con qué reglas decido.',
  '/proveedor ID-FISCAL CUENTA Nombre: el dueño agrega un proveedor a su lista.',
  '/limite 1000, 5000, 10000 o 25000: el dueño cambia el límite por pago en USD.',
  '/demo: vuelves a la empresa de ejemplo (Aurora Cloud).',
].join('\n');

const SOLO_PRIVADO = 'Esto se hace en un chat privado conmigo, no en un grupo.';
const SOLO_DUENO = 'Eso solo lo puede hacer el dueño de la empresa.';

async function empresaDe(c: Contexto): Promise<{ m: Miembro; e: Empresa } | null> {
  const m = await c.almacen.miembroDe(c.chatId);
  if (!m) return null;
  const e = await c.almacen.empresa(m.empresa_id);
  return e ? { m, e } : null;
}

/** Un dueno de una empresa propia no se va a otra con un comando: la dejaria sin quien apruebe. */
function bloqueoDeDueno(actual: { m: Miembro; e: Empresa } | null): string | null {
  if (actual && actual.m.rol === 'DUENO' && !actual.e.es_demo) {
    return `Eres el dueño de «${limpio(actual.e.nombre, 60)}». Si te vas, nadie podría aprobar sus facturas, así que no te cambio de empresa.`;
  }
  return null;
}

export async function ejecutarComando(comando: string, argumento: string, c: Contexto): Promise<string> {
  const cmd = comando.toLowerCase();
  if (cmd === 'ayuda') return AYUDA;
  if (!c.privado) return SOLO_PRIVADO;
  const actual = await empresaDe(c);

  if (cmd === 'empresa') {
    if (!actual) return 'Todavía no estás en ninguna empresa. Escribe /start para empezar.';
    const { m, e } = actual;
    const provs = e.es_demo ? null : (await c.almacen.proveedores(e.id)).length;
    return [
      `Estás en «${limpio(e.nombre, 60)}» como ${m.rol === 'DUENO' ? 'dueño: tú apruebas' : e.es_demo ? 'invitado de la empresa de ejemplo' : 'parte del equipo: aprueba el dueño'}.`,
      `Límite por pago: ${usd(e.limite_pago_usd_centavos)}.`,
      provs === null ? 'Proveedores: los de la empresa de ejemplo.' : `Proveedores en tu lista: ${provs}.`,
      m.rol === 'DUENO' ? `Código para tu equipo: ${e.codigo}` : '',
    ].filter(Boolean).join('\n');
  }

  if (cmd === 'demo') {
    const bloqueo = bloqueoDeDueno(actual);
    if (bloqueo) return bloqueo;
    await c.almacen.unirse(c.chatId, c.usuarioId, ID_DEMO, 'EQUIPO');
    return 'Volviste a la empresa de prueba, Aurora Cloud. Sus facturas las aprueba el equipo de Pulso.';
  }

  if (cmd === 'crear') {
    if (c.usuarioId === null) return 'No pude saber quién eres. Inténtalo de nuevo.';
    const nombre = nombreValido(argumento);
    if (!nombre) return 'Escribe el nombre después del comando, por ejemplo: /crear Panadería La Esquina';
    for (let i = 0; i < 5; i++) {
      const r = await c.almacen.crearEmpresa(c.chatId, c.usuarioId, nombre, nuevoCodigo());
      if (!r) continue; // el codigo choco: otro
      if (!r.nueva) {
        const e = await c.almacen.empresa(r.empresa_id);
        return `Ya eres el dueño de «${limpio(e?.nombre ?? nombre, 60)}». Su código para el equipo es ${r.codigo}.`;
      }
      return [
        `Listo. Creé «${nombre}» y tú eres el dueño: las facturas que se salgan de tus reglas te las pregunto a ti.`,
        '',
        `Código para tu equipo: ${r.codigo}`,
        `Quien escriba /unirme ${r.codigo} podrá enviarme facturas de tu empresa.`,
        '',
        `Límite por pago: ${usd(500000)}. Cámbialo con /limite 1000, 5000, 10000 o 25000.`,
        'Tu lista de proveedores está vacía: hasta que agregues uno, frenaré sus facturas. Agrégalo así:',
        '/proveedor ID-FISCAL CUENTA Nombre del proveedor',
      ].join('\n');
    }
    return 'No pude crear la empresa ahora. Inténtalo de nuevo en un momento.';
  }

  if (cmd === 'unirme') {
    const bloqueo = bloqueoDeDueno(actual);
    if (bloqueo) return bloqueo;
    const codigo = normalizarCodigo(argumento);
    if (!codigo) return 'Escribe el código que te dio el dueño, por ejemplo: /unirme PULSO-7KQ2MX';
    const cupo = await c.cupo();
    if (cupo === 'dia') return 'Pulso llegó hoy a su tope de uso de prueba. Vuelve a intentar mañana.';
    if (cupo !== 'ok') return 'Hiciste muchos intentos seguidos. Espera un rato y vuelve a probar.';
    const e = await c.almacen.empresaPorCodigo(codigo);
    if (!e || e.es_demo) return 'Ese código no existe. Revisa que esté bien escrito o pídeselo de nuevo al dueño.';
    await c.almacen.unirse(c.chatId, c.usuarioId, e.id, 'EQUIPO');
    return `Te uniste a «${limpio(e.nombre, 60)}». Envíame sus facturas: las decido con sus reglas y las aprueba su dueño.`;
  }

  // /proveedor y /limite: solo el dueno de una empresa propia.
  if (!actual || actual.m.rol !== 'DUENO' || actual.e.es_demo || actual.e.dueno_usuario_id !== c.usuarioId) return SOLO_DUENO;

  if (cmd === 'limite') {
    const n = Number(argumento.replace(/[.\s]/g, ''));
    if (!(LIMITES_USD as readonly number[]).includes(n)) return 'Elige uno de estos límites por pago en USD: /limite 1000, 5000, 10000 o 25000';
    await c.almacen.fijarLimite(actual.e.id, n * 100);
    return [
      `Listo. Tu límite por pago es ${usd(n * 100)}: todo pago por encima te lo pregunto.`,
      'Mientras tu empresa no tenga acuerdos ni presupuestos cargados, igual te pregunto todas las facturas. Lo que entra por este chat nunca se paga solo.',
    ].join('\n');
  }

  // /proveedor ID-FISCAL CUENTA Nombre
  const partes = argumento.trim().split(/\s+/);
  const [idFiscal, cuenta, ...resto] = partes;
  const nombre = nombreValido(resto.join(' '));
  const ok = (v: string | undefined, max: number) => typeof v === 'string' && v.length >= 1 && v.length <= max && /^[\w.\-/]+$/.test(v);
  if (!ok(idFiscal, 40) || !ok(cuenta, 60) || !nombre) {
    return 'Escríbelo así, con el ID fiscal y la cuenta sin espacios:\n/proveedor J-12345678-9 0102-0000-11-2222333344 Distribuidora El Sol';
  }
  const desde = c.ahora.toISOString().slice(0, 10);
  await c.almacen.agregarProveedor(actual.e.id, { id_fiscal: idFiscal as string, cuenta: cuenta as string, nombre, desde }, c.usuarioId as number);
  return [
    `Agregué a «${nombre}» (${idFiscal}, cuenta ${cuenta}) a tu lista.`,
    'Como la cuenta es nueva, sus facturas de los próximos días te las pregunto antes de dar nada por bueno.',
  ].join('\n');
}
