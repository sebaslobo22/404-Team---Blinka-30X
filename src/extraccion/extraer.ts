import { createHash } from 'node:crypto';
import type { FacturaExtraida } from '../engine/types';
import esquema from './esquema.json';
import { apareceLiteral, fechaValida, montoAparece, montoACentavos, normalizarLiteral } from './monto';
import { ErrorLLM, llamarOpenRouter, type PeticionLLM, type RespuestaLLM } from './openrouter';
import { guardarLectura, leerLectura, modoReplay } from './replay';

export const MODELOS_POR_DEFECTO: [string, string] = ['anthropic/claude-haiku-5.5', 'openai/gpt-6-luna'];

export interface EntradaFactura {
  texto?: string;
  imagenBase64?: string;
  mime?: string;
}

/** Lo que dice un modelo, ya validado contra el esquema. */
export interface Lectura {
  beneficiario: string | null;
  id_fiscal: string | null;
  cuenta: string | null;
  monto: string | null;
  moneda: string | null;
  moneda_explicita: boolean;
  fecha: string | null;
  fecha_vencimiento: string | null;
  numero_factura: string | null;
  categoria: string | null;
  confianza: number;
  instrucciones_detectadas: boolean;
}

export interface DetalleLectura {
  modelo: string;
  modelo_servido: string | null;
  ok: boolean;
  /** Motivo corto del fallo si ok es false. */
  error?: string;
  datos?: Lectura;
  tokens_entrada: number;
  tokens_salida: number;
  costo_usd: number | null;
  ms: number;
}

export interface ResultadoExtraccion {
  factura: FacturaExtraida;
  lecturas: DetalleLectura[];
  modelo_versiones: { pedido: string; servido: string | null }[];
  ms: number;
  costo_usd: number;
}

export interface OpcionesExtraer {
  modelos?: [string, string];
  /** Id de la factura: nombre del archivo de replay. Si falta se usa un hash de la entrada. */
  id?: string;
  /** Si es true, guarda el resultado en data/facturas/lecturas/<id>.json. */
  guardar?: boolean;
  /** Fuerza el modo; por defecto lo decide EXTRACTION_MODE. */
  replay?: boolean;
  /** Para pruebas: reemplaza la llamada a OpenRouter. */
  llamar?: (p: PeticionLLM) => Promise<RespuestaLLM>;
  dirLecturas?: string;
}

const CAMPOS_TEXTO = ['beneficiario', 'id_fiscal', 'cuenta', 'monto', 'moneda', 'fecha', 'fecha_vencimiento', 'numero_factura'] as const;

/** Valida el objeto del modelo contra el esquema estricto. Devuelve la lectura o el motivo. */
export function validarLectura(x: unknown): { ok: true; datos: Lectura } | { ok: false; motivo: string } {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return { ok: false, motivo: 'esquema_no_objeto' };
  const o = x as Record<string, unknown>;
  for (const c of CAMPOS_TEXTO) {
    if (!(c in o) || (o[c] !== null && typeof o[c] !== 'string')) return { ok: false, motivo: `esquema_campo_${c}` };
  }
  if (!('categoria' in o) || (o['categoria'] !== null && !esquema.categorias.includes(o['categoria'] as string))) return { ok: false, motivo: 'esquema_campo_categoria' };
  if (typeof o['moneda_explicita'] !== 'boolean') return { ok: false, motivo: 'esquema_campo_moneda_explicita' };
  if (typeof o['instrucciones_detectadas'] !== 'boolean') return { ok: false, motivo: 'esquema_campo_instrucciones_detectadas' };
  const c = o['confianza'];
  if (typeof c !== 'number' || !Number.isFinite(c) || c < 0 || c > 1) return { ok: false, motivo: 'esquema_campo_confianza' };
  return { ok: true, datos: o as unknown as Lectura };
}

/** Saca el objeto JSON de la respuesta (tolera vallas ```json y texto alrededor). */
export function parsearJson(contenido: string): unknown {
  const t = contenido.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(t);
  } catch {
    const a = t.indexOf('{');
    const b = t.lastIndexOf('}');
    if (a >= 0 && b > a) return JSON.parse(t.slice(a, b + 1));
    throw new Error('json');
  }
}

async function leerConModelo(modelo: string, entrada: EntradaFactura, llamar: NonNullable<OpcionesExtraer['llamar']>): Promise<DetalleLectura> {
  const base = { modelo, modelo_servido: null, tokens_entrada: 0, tokens_salida: 0, costo_usd: null, ms: 0 };
  const t0 = Date.now();
  const peticion: PeticionLLM = entrada.texto !== undefined
    ? { modelo, sistema: esquema.sistema, texto: esquema.usuario_texto.replace('{{DOCUMENTO}}', () => entrada.texto as string), esquema: { name: 'lectura_factura', schema: esquema.lectura } }
    : { modelo, sistema: esquema.sistema, texto: esquema.usuario_imagen, imagenDataUrl: `data:${entrada.mime ?? 'image/png'};base64,${entrada.imagenBase64}`, esquema: { name: 'lectura_factura', schema: esquema.lectura } };
  let r: RespuestaLLM;
  try {
    r = await llamar(peticion);
  } catch (e) {
    return { ...base, ok: false, error: e instanceof ErrorLLM ? e.motivo : 'red', ms: Date.now() - t0 };
  }
  const meta = { modelo, modelo_servido: r.modelo_servido, tokens_entrada: r.tokens_entrada, tokens_salida: r.tokens_salida, costo_usd: r.costo_usd, ms: r.ms };
  let v: ReturnType<typeof validarLectura>;
  try {
    v = validarLectura(parsearJson(r.contenido));
  } catch {
    return { ...meta, ok: false, error: 'json_invalido' };
  }
  return v.ok ? { ...meta, ok: true, datos: v.datos } : { ...meta, ok: false, error: v.motivo };
}

const VACIA = (alertas: string[]): FacturaExtraida => ({
  numero_factura: null, beneficiario: null, id_fiscal: null, cuenta: null, monto_centavos: null,
  moneda: null, fecha_emision: null, categoria: null, alertas, confianza: null, instrucciones_detectadas: false,
});

function hashEntrada(e: EntradaFactura): string {
  return createHash('sha256').update(e.texto ?? e.imagenBase64 ?? '').digest('hex').slice(0, 12);
}

/**
 * Doble lectura con dos modelos de empresas distintas + validaciones deterministas fuera del LLM.
 * Nunca lanza: cualquier fallo vuelve como FacturaExtraida con campos null y alerta `lector_fallo:<motivo>`.
 * Cada alerta fuerza ESCALAR en el motor.
 */
export async function extraerFactura(entrada: EntradaFactura, opciones: OpcionesExtraer = {}): Promise<ResultadoExtraccion> {
  const t0 = Date.now();
  const modelos = opciones.modelos ?? MODELOS_POR_DEFECTO;
  const id = opciones.id ?? hashEntrada(entrada);
  const fallo = (motivo: string, lecturas: DetalleLectura[] = []): ResultadoExtraccion => ({
    factura: VACIA([`lector_fallo:${motivo}`]), lecturas, modelo_versiones: modelos.map((m) => ({ pedido: m, servido: null })),
    ms: Date.now() - t0, costo_usd: 0,
  });
  try {
    // Modo replay: jamas toca la red.
    if (opciones.replay ?? modoReplay()) {
      const g = await leerLectura(id, opciones.dirLecturas);
      return g ? g.resultado : fallo('replay_sin_lectura');
    }
    const texto = entrada.texto;
    if (texto !== undefined ? texto.trim() === '' : !entrada.imagenBase64) return fallo('entrada_vacia');
    const llamar = opciones.llamar ?? ((p: PeticionLLM) => llamarOpenRouter(p));
    const lecturas = await Promise.all(modelos.map((m) => leerConModelo(m, entrada, llamar)));
    const resultado = combinar(entrada, lecturas, modelos, t0);
    if (opciones.guardar) await guardarLectura(id, resultado, [...modelos], opciones.dirLecturas);
    return resultado;
  } catch (e) {
    return fallo(`interno_${(e as Error)?.name ?? 'error'}`);
  }
}

/** Parte determinista: compara las dos lecturas, revisa lo literal y arma la FacturaExtraida. */
export function combinar(entrada: EntradaFactura, lecturas: DetalleLectura[], modelos: readonly string[], t0 = Date.now()): ResultadoExtraccion {
  const costo = lecturas.reduce((s, l) => s + (l.costo_usd ?? 0), 0);
  const versiones = lecturas.map((l) => ({ pedido: l.modelo, servido: l.modelo_servido }));
  const sinUnoOk = lecturas.length < 2 || lecturas.some((l) => !l.ok || !l.datos);
  if (sinUnoOk) {
    const motivos = lecturas.filter((l) => !l.ok).map((l) => `${l.modelo}=${l.error ?? 'sin_lectura'}`);
    return {
      factura: VACIA(motivos.length ? motivos.map((m) => `lector_fallo:${m}`) : ['lector_fallo:sin_lecturas']),
      lecturas, modelo_versiones: versiones, ms: Date.now() - t0, costo_usd: costo,
    };
  }
  const a = (lecturas[0] as DetalleLectura).datos as Lectura;
  const b = (lecturas[1] as DetalleLectura).datos as Lectura;
  const alertas: string[] = [];

  // (b) Las dos lecturas deben coincidir.
  const difiere = (campo: string, x: unknown, y: unknown, norm: (v: unknown) => string) => {
    if (norm(x) !== norm(y)) alertas.push(`lecturas_difieren:${campo}`);
  };
  const id = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim());
  const nombre = (v: unknown) => normalizarLiteral(v);
  difiere('monto', a.monto, b.monto, (v) => String(montoACentavos(v) ?? id(v)));
  difiere('moneda', a.moneda, b.moneda, (v) => id(v).toUpperCase());
  difiere('beneficiario', a.beneficiario, b.beneficiario, nombre);
  difiere('cuenta', a.cuenta, b.cuenta, nombre);
  difiere('id_fiscal', a.id_fiscal, b.id_fiscal, nombre);
  difiere('numero_factura', a.numero_factura, b.numero_factura, nombre);
  difiere('fecha', a.fecha, b.fecha, id);
  difiere('categoria', a.categoria, b.categoria, id);

  // (c) Moneda ambigua en cualquiera de las dos.
  if (!a.moneda_explicita || !b.moneda_explicita) alertas.push('moneda_ambigua');

  // Formato de los valores que usa el motor.
  const monto_centavos = montoACentavos(a.monto);
  if (a.monto !== null && monto_centavos === null) alertas.push('monto_formato_invalido');
  const moneda = a.moneda !== null && /^[A-Z]{3}$/.test(a.moneda) ? a.moneda : null;
  if (a.moneda !== null && moneda === null) alertas.push('moneda_formato_invalido');
  const fecha_emision = fechaValida(a.fecha) ? a.fecha : null;
  if (a.fecha !== null && fecha_emision === null) alertas.push('fecha_formato_invalido');

  // (a) Cada dato critico debe aparecer literal en el texto fuente.
  const texto = entrada.texto;
  if (texto === undefined) {
    alertas.push('sin_texto_fuente');
  } else {
    for (const l of [a, b]) {
      if (l.id_fiscal !== null && !apareceLiteral(texto, l.id_fiscal)) alertas.push('no_literal:id_fiscal');
      if (l.numero_factura !== null && !apareceLiteral(texto, l.numero_factura)) alertas.push('no_literal:numero_factura');
      if (l.beneficiario !== null && !apareceLiteral(texto, l.beneficiario)) alertas.push('no_literal:beneficiario');
      if (l.monto !== null && !montoAparece(texto, l.monto)) alertas.push('no_literal:monto');
    }
  }

  const factura: FacturaExtraida = {
    numero_factura: a.numero_factura,
    beneficiario: a.beneficiario,
    id_fiscal: a.id_fiscal,
    cuenta: a.cuenta,
    monto_centavos,
    moneda,
    fecha_emision,
    categoria: a.categoria,
    alertas: [...new Set(alertas)],
    // (e) confianza final = minimo de las dos lecturas
    confianza: Math.min(a.confianza, b.confianza),
    instrucciones_detectadas: a.instrucciones_detectadas || b.instrucciones_detectadas,
  };
  if (texto !== undefined) factura.texto_fuente = texto;
  void modelos;
  return { factura, lecturas, modelo_versiones: versiones, ms: Date.now() - t0, costo_usd: costo };
}
