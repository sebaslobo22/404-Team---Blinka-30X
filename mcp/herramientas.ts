import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { estadoAprobacion, resumen } from '../src/demo/estado';
import type { EstadoDemo, FilaDemo } from '../src/demo/estado';
import { AVISO_ORDEN, FORMATO_ORDEN, ordenDe } from '../src/demo/orden';
import { obtenerEstado } from '../src/demo/singleton';
import { construirTraza } from '../src/demo/traza';
import { decidir } from '../src/engine/decide';
import type { FacturaExtraida, ResultadoDecision } from '../src/engine/types';
import type { OpcionesExtraer } from '../src/extraccion/extraer';
import { fraseRazon } from '../src/telegram/mensajes';
import { aplicarTechoEnVivo } from '../src/telegram/techo';
import { entradaDesdeBytes, MAX_BYTES } from '../src/vivo/entrada';
import { contextoDeLaDemo, leerYDecidir } from '../src/vivo/leer-y-decidir';

/**
 * Herramientas del servidor MCP de Pulso. Ninguna mueve dinero: leen facturas, deciden con el motor
 * determinista y preparan una orden en un formato propuesto. Estan separadas de mcp/servidor.ts (que solo
 * habla el protocolo) para poder probarlas sin red y sin arrancar nada.
 */

export type RespuestaHerramienta = { ok: true; datos: Record<string, unknown> } | { ok: false; codigo: string; error: string };

export interface DepsHerramientas {
  env?: Record<string, string | undefined>;
  estado?: () => Promise<EstadoDemo>;
  /** Solo para pruebas: reemplaza la llamada a OpenRouter. */
  llamar?: OpcionesExtraer['llamar'];
  /** Solo para pruebas: reemplaza la lectura de un archivo local. */
  leerArchivo?: (ruta: string) => Uint8Array;
}

const falla = (codigo: string, error: string): RespuestaHerramienta => ({ ok: false, codigo, error });
const bien = (datos: Record<string, unknown>): RespuestaHerramienta => ({ ok: true, datos });
const esObjeto = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

const AVISO_SIN_DINERO = 'Pulso nunca mueve dinero. Esto es una decisión y una explicación, no un pago.';

// ---------------------------------------------------------------- definiciones (lo que ve el cliente MCP)

export interface DefinicionHerramienta {
  name: string;
  description: string;
  inputSchema: { type: 'object'; properties: Record<string, unknown>; required?: string[]; additionalProperties: false };
}

export const HERRAMIENTAS: DefinicionHerramienta[] = [
  {
    name: 'leer_y_decidir_factura',
    description:
      'Lee una factura real (PDF con texto, JPG o PNG, hasta 4 MB) con dos modelos de IA y la decide con el motor de reglas: PAGAR, FRENAR o ESCALAR, con las razones en frases. ' +
      'Entrada en vivo: el resultado nunca es PAGAR (como máximo ESCALAR, la revisa una persona). Requiere OPENROUTER_API_KEY en el entorno del servidor y gasta centavos por factura. ' +
      'Pasa `ruta` (archivo local) o `base64` (contenido), no ambos. No mueve dinero.',
    inputSchema: {
      type: 'object',
      properties: {
        ruta: { type: 'string', description: 'Ruta local de un PDF, JPG o PNG.' },
        base64: { type: 'string', description: 'Contenido del archivo en base64 (alternativa a ruta).' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'decidir_factura_estructurada',
    description:
      'Decide una factura que ya está extraída (JSON), solo con el motor de reglas: sin red, sin clave, sin costo. Usa el contexto de la demo (empresa ficticia Aurora Cloud) y el mismo techo en vivo: nunca devuelve PAGAR. ' +
      'Dinero en centavos enteros (monto_centavos). Los campos que falten cuentan como no leídos y escalan. Si omites `confianza`, el motor no evalúa la confianza de lectura. No mueve dinero.',
    inputSchema: {
      type: 'object',
      properties: {
        numero_factura: { type: ['string', 'null'] },
        beneficiario: { type: ['string', 'null'] },
        id_fiscal: { type: ['string', 'null'] },
        cuenta: { type: ['string', 'null'] },
        monto_centavos: { type: ['integer', 'null'], description: 'Entero de centavos, por ejemplo 600000 para 6.000,00.' },
        moneda: { type: ['string', 'null'], description: 'Código de 3 letras, por ejemplo USD.' },
        fecha_emision: { type: ['string', 'null'], description: 'AAAA-MM-DD.' },
        categoria: { type: ['string', 'null'] },
        alertas: { type: 'array', items: { type: 'string' }, description: 'Alertas de la lectura. Cualquiera fuerza ESCALAR.' },
        confianza: { type: ['number', 'null'], minimum: 0, maximum: 1 },
        instrucciones_detectadas: { type: 'boolean' },
        texto_fuente: { type: 'string', description: 'Texto plano de la factura; se revisa en busca de instrucciones dirigidas al agente.' },
      },
      additionalProperties: false,
    },
  },
  {
    name: 'listar_facturas_demo',
    description: 'Lista las 18 facturas de la demo (empresa ficticia Aurora Cloud) con su decisión y el resumen del lote. Solo lectura, sin red.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'ver_decision',
    description: 'Detalle de la decisión de una factura de la demo (por ejemplo F-009): razones en frases, hechos, traza regla por regla y hash del registro. Solo lectura, sin red.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Identificador de la factura de la demo, por ejemplo F-001.' } },
      required: ['id'],
      additionalProperties: false,
    },
  },
  {
    name: 'orden_para_blinka',
    description:
      'Orden de pago preparada para una factura de la demo. Formato PROPUESTO por Pulso: Blinka no publica una API. Solo existe para facturas decididas PAGAR por las reglas o ESCALAR aprobadas por una persona; ' +
      'para FRENAR o ESCALAR sin aprobar no hay orden. Pulso no ejecuta el pago: otra persona o sistema lo hace.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Identificador de la factura de la demo, por ejemplo F-001.' } },
      required: ['id'],
      additionalProperties: false,
    },
  },
];

// ---------------------------------------------------------------- validacion manual de entradas

/** Texto de una razon del motor en frase, igual que en el bot y en la web. */
function razonesEnFrases(r: ResultadoDecision): { regla: string; efecto: string; frase: string }[] {
  return r.razones.map((x) => ({ regla: x.regla, efecto: x.efecto, frase: fraseRazon(r, x) }));
}

function texto(v: unknown, campo: string, max = 500): string | null | undefined | Error {
  if (v === undefined || v === null) return v;
  if (typeof v !== 'string') return new Error(`${campo} debe ser texto o null.`);
  if (v.length > max) return new Error(`${campo} supera ${max} caracteres.`);
  return v;
}

/** Valida y arma la FacturaExtraida a partir de lo que mande el cliente. Devuelve un mensaje si algo no cuadra. */
export function validarFactura(args: unknown): { ok: true; factura: FacturaExtraida } | { ok: false; error: string } {
  if (!esObjeto(args)) return { ok: false, error: 'La entrada debe ser un objeto JSON con la factura.' };
  const permitidas = new Set([
    'numero_factura', 'beneficiario', 'id_fiscal', 'cuenta', 'monto_centavos', 'moneda', 'fecha_emision', 'categoria', 'alertas', 'confianza', 'instrucciones_detectadas', 'texto_fuente',
  ]);
  for (const k of Object.keys(args)) if (!permitidas.has(k)) return { ok: false, error: `Campo desconocido: ${k}.` };

  const f: FacturaExtraida = {
    numero_factura: null, beneficiario: null, id_fiscal: null, cuenta: null, monto_centavos: null, moneda: null, fecha_emision: null, categoria: null,
  };
  for (const k of ['numero_factura', 'beneficiario', 'id_fiscal', 'cuenta', 'moneda', 'fecha_emision', 'categoria'] as const) {
    const t = texto(args[k], k, 200);
    if (t instanceof Error) return { ok: false, error: t.message };
    f[k] = t ?? null;
  }
  if (f.fecha_emision !== null && !/^\d{4}-\d{2}-\d{2}$/.test(f.fecha_emision)) return { ok: false, error: 'fecha_emision debe ser AAAA-MM-DD.' };

  const m = args['monto_centavos'];
  if (m !== undefined && m !== null) {
    if (typeof m !== 'number' || !Number.isSafeInteger(m)) return { ok: false, error: 'monto_centavos debe ser un entero de centavos (sin decimales).' };
    f.monto_centavos = m;
  }
  if (args['alertas'] !== undefined) {
    const a = args['alertas'];
    if (!Array.isArray(a) || a.length > 50 || a.some((x) => typeof x !== 'string' || x.length > 200)) return { ok: false, error: 'alertas debe ser una lista de hasta 50 textos cortos.' };
    f.alertas = a as string[];
  }
  if (args['confianza'] !== undefined) {
    const c = args['confianza'];
    if (c !== null && (typeof c !== 'number' || !Number.isFinite(c) || c < 0 || c > 1)) return { ok: false, error: 'confianza debe ser un número entre 0 y 1, o null.' };
    f.confianza = c as number | null;
  }
  if (args['instrucciones_detectadas'] !== undefined) {
    if (typeof args['instrucciones_detectadas'] !== 'boolean') return { ok: false, error: 'instrucciones_detectadas debe ser verdadero o falso.' };
    f.instrucciones_detectadas = args['instrucciones_detectadas'];
  }
  if (args['texto_fuente'] !== undefined) {
    const t = texto(args['texto_fuente'], 'texto_fuente', 20_000);
    if (t instanceof Error) return { ok: false, error: t.message };
    if (typeof t === 'string') f.texto_fuente = t;
  }
  return { ok: true, factura: f };
}

// ---------------------------------------------------------------- manejadores

async function leerYDecidirFactura(args: unknown, deps: DepsHerramientas): Promise<RespuestaHerramienta> {
  const env = deps.env ?? process.env;
  if (!esObjeto(args)) return falla('ENTRADA_INVALIDA', 'La entrada debe ser un objeto con `ruta` o `base64`.');
  for (const k of Object.keys(args)) if (k !== 'ruta' && k !== 'base64') return falla('ENTRADA_INVALIDA', `Campo desconocido: ${k}.`);
  const { ruta, base64 } = args;
  if ((ruta === undefined) === (base64 === undefined)) return falla('ENTRADA_INVALIDA', 'Pasa exactamente uno: `ruta` (archivo local) o `base64` (contenido).');
  if (!env['OPENROUTER_API_KEY'] && !deps.llamar) {
    return falla('SIN_CLAVE', 'Falta OPENROUTER_API_KEY en el entorno del servidor MCP, así que no puedo leer la factura. Defínela (en .env.local o al registrar el servidor) o usa decidir_factura_estructurada, que no necesita clave.');
  }

  let bytes: Uint8Array;
  if (ruta !== undefined) {
    if (typeof ruta !== 'string' || ruta.trim() === '' || ruta.includes('\0')) return falla('ENTRADA_INVALIDA', '`ruta` debe ser el camino de un archivo.');
    try {
      if (!deps.leerArchivo) {
        const st = statSync(ruta);
        if (!st.isFile()) return falla('ARCHIVO', 'La ruta no es un archivo.');
        if (st.size > MAX_BYTES) return falla('MUY_GRANDE', 'El archivo pesa más de 4 MB.');
      }
      bytes = deps.leerArchivo ? deps.leerArchivo(ruta) : new Uint8Array(readFileSync(ruta));
    } catch {
      return falla('ARCHIVO', 'No pude leer ese archivo (no existe o no hay permiso).');
    }
  } else {
    if (typeof base64 !== 'string' || base64 === '') return falla('ENTRADA_INVALIDA', '`base64` debe ser texto con el contenido del archivo.');
    if (base64.length > Math.ceil((MAX_BYTES * 4) / 3) + 8) return falla('MUY_GRANDE', 'El archivo pesa más de 4 MB.');
    bytes = new Uint8Array(Buffer.from(base64, 'base64'));
  }

  // Tipo por firma de bytes (no por extension): solo PDF con texto, JPG y PNG llegan a los modelos.
  const e = entradaDesdeBytes(bytes);
  if (!e.ok) return falla(e.codigo, e.mensaje);

  const estado = await (deps.estado ?? obtenerEstado)();
  const vivo = await leerYDecidir(e.entrada, estado, deps.llamar ? { llamar: deps.llamar } : {});
  // Si ningun modelo respondio no hay lectura que decidir: se dice claro en vez de presentar un ESCALAR vacio como si fuera juicio.
  const lectorCaido = vivo.modelos.length > 0 && vivo.modelos.every((m) => !m.ok);
  const f = vivo.factura;
  return bien({
    aviso: AVISO_SIN_DINERO,
    id: vivo.id,
    decision: vivo.resultado.decision,
    razones: razonesEnFrases(vivo.resultado),
    explicacion: vivo.resultado.explicacion,
    hechos: vivo.resultado.hechos,
    factura: { numero_factura: f.numero_factura, beneficiario: f.beneficiario, id_fiscal: f.id_fiscal, monto_centavos: f.monto_centavos, moneda: f.moneda, alertas: f.alertas ?? [] },
    lector: { modelos: vivo.modelos, costo_usd: vivo.costo_usd, ms: vivo.ms, ningun_modelo_respondio: lectorCaido },
    version_reglas: vivo.resultado.version_reglas,
    tipo_archivo: e.tipo,
  });
}

async function decidirFacturaEstructurada(args: unknown, deps: DepsHerramientas): Promise<RespuestaHerramienta> {
  const v = validarFactura(args);
  if (!v.ok) return falla('ENTRADA_INVALIDA', v.error);
  const estado = await (deps.estado ?? obtenerEstado)();
  const id = `E-${createHash('sha256').update(JSON.stringify(v.factura)).digest('hex').slice(0, 8).toUpperCase()}`;
  const resultado = aplicarTechoEnVivo(decidir(id, v.factura, contextoDeLaDemo(estado), estado.config));
  return bien({
    aviso: AVISO_SIN_DINERO,
    id,
    decision: resultado.decision,
    razones: razonesEnFrases(resultado),
    explicacion: resultado.explicacion,
    hechos: resultado.hechos,
    traza: construirTraza(resultado, estado.config, v.factura),
    version_reglas: resultado.version_reglas,
    nota: 'Contexto de la demo (Aurora Cloud, ficticia). Entrada en vivo: nunca PAGAR, como máximo ESCALAR.',
  });
}

function filaPorId(estado: EstadoDemo, id: unknown): FilaDemo | RespuestaHerramienta {
  if (typeof id !== 'string' || id.trim() === '') return falla('ENTRADA_INVALIDA', '`id` debe ser el identificador de una factura, por ejemplo F-001.');
  const fila = estado.filas.find((f) => f.id === id.trim());
  return fila ?? falla('NO_ENCONTRADA', `No existe la factura ${id.slice(0, 40)} en la demo. Usa listar_facturas_demo para ver los ids.`);
}

const soloId = (args: unknown): unknown => {
  if (!esObjeto(args)) return undefined;
  for (const k of Object.keys(args)) if (k !== 'id') return undefined;
  return args['id'];
};

async function listarFacturasDemo(args: unknown, deps: DepsHerramientas): Promise<RespuestaHerramienta> {
  if (args !== undefined && (!esObjeto(args) || Object.keys(args).length > 0)) return falla('ENTRADA_INVALIDA', 'Esta herramienta no recibe argumentos.');
  const estado = await (deps.estado ?? obtenerEstado)();
  const r = resumen(estado);
  return bien({
    aviso: 'Datos ficticios de la empresa Aurora Cloud. Decisiones de la demo (modo replay); no hay pagos.',
    resumen: { total: r.total, PAGAR: r.PAGAR, FRENAR: r.FRENAR, ESCALAR: r.ESCALAR, pendientes_de_persona: r.pendientes, decididas_sin_persona: r.sinPersona, pct_sin_persona: r.pctSinPersona },
    facturas: estado.filas.map((f) => ({
      id: f.id,
      numero_factura: f.factura.numero_factura,
      beneficiario: f.factura.beneficiario,
      monto_centavos: f.factura.monto_centavos,
      moneda: f.factura.moneda,
      decision: f.resultado.decision,
      aprobacion: estadoAprobacion(estado, f),
    })),
  });
}

async function verDecision(args: unknown, deps: DepsHerramientas): Promise<RespuestaHerramienta> {
  const estado = await (deps.estado ?? obtenerEstado)();
  const fila = filaPorId(estado, soloId(args));
  if (!('resultado' in fila)) return fila;
  const r = fila.resultado;
  const f = fila.factura;
  return bien({
    aviso: AVISO_SIN_DINERO,
    id: fila.id,
    decision: r.decision,
    aprobacion: estadoAprobacion(estado, fila),
    razones: razonesEnFrases(r),
    explicacion: r.explicacion,
    hechos: r.hechos,
    traza: construirTraza(r, estado.config, f),
    factura: { numero_factura: f.numero_factura, beneficiario: f.beneficiario, id_fiscal: f.id_fiscal, cuenta: f.cuenta, monto_centavos: f.monto_centavos, moneda: f.moneda, categoria: f.categoria, alertas: f.alertas ?? [] },
    version_reglas: r.version_reglas,
    hash_registro: fila.entrada.hash,
    decidido_en: r.decidido_en,
  });
}

async function ordenParaBlinka(args: unknown, deps: DepsHerramientas): Promise<RespuestaHerramienta> {
  const estado = await (deps.estado ?? obtenerEstado)();
  const fila = filaPorId(estado, soloId(args));
  if (!('resultado' in fila)) return fila;
  const orden = ordenDe(estado, fila);
  if (!orden) {
    return bien({
      id: fila.id,
      decision: fila.resultado.decision,
      orden: null,
      motivo: 'Esta factura no tiene orden de pago: solo la tienen las decididas PAGAR por las reglas o las ESCALAR aprobadas por una persona. Una factura frenada no tiene aprobación posible.',
      aviso: AVISO_ORDEN,
    });
  }
  return bien({
    formato: FORMATO_ORDEN,
    aviso: `${AVISO_ORDEN} Blinka no publica API: estos campos son nuestra propuesta, no un contrato de Blinka.`,
    orden,
  });
}

const MANEJADORES: Record<string, (args: unknown, deps: DepsHerramientas) => Promise<RespuestaHerramienta>> = {
  leer_y_decidir_factura: leerYDecidirFactura,
  decidir_factura_estructurada: decidirFacturaEstructurada,
  listar_facturas_demo: listarFacturasDemo,
  ver_decision: verDecision,
  orden_para_blinka: ordenParaBlinka,
};

/** Punto de entrada: nunca lanza. Un fallo interno es un error claro, no una decision. */
export async function ejecutarHerramienta(nombre: string, args: unknown, deps: DepsHerramientas = {}): Promise<RespuestaHerramienta> {
  const m = Object.prototype.hasOwnProperty.call(MANEJADORES, nombre) ? MANEJADORES[nombre] : undefined;
  if (!m) return falla('HERRAMIENTA_DESCONOCIDA', `No existe la herramienta ${nombre.slice(0, 60)}.`);
  try {
    return await m(args, deps);
  } catch {
    return falla('INTERNO', 'Error interno. No se tomó ninguna decisión.');
  }
}
