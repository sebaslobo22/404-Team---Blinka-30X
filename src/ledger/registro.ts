import type { ResultadoDecision } from '../engine/types';
import { canonico, sha256 } from './canonico';

/**
 * Registro de decisiones solo de anadir, con hash encadenado.
 * Es evidencia de manipulacion, no inmutabilidad: quien controle el almacen puede
 * reescribir toda la cadena, y eso solo se detecta contra un ancla publicada aparte.
 */

export interface EntradaRegistro<T extends object = ResultadoDecision> {
  indice: number;
  /** Hash de la entrada anterior; null en la primera. */
  hash_previo: string | null;
  hash: string;
  registrado_en: string;
  resultado: T;
}

/** Punto de control guardado fuera del almacen (numero de entradas y hash de la ultima). */
export interface Ancla {
  n: number;
  cabeza: string | null;
}

export type MotivoFallo =
  | 'FORMATO'
  | 'INDICE_INVALIDO'
  | 'ENCADENADO_ROTO'
  | 'HASH_NO_COINCIDE'
  | 'ANCLA_NO_COINCIDE';

export type Verificacion = { ok: true; n: number; cabeza: string | null } | { ok: false; indice: number; motivo: MotivoFallo };

/** Contrato del almacen. En produccion lo respalda una tabla con triggers que bloquean UPDATE y DELETE. */
export interface Almacen<T extends object = ResultadoDecision> {
  leerTodo(): Promise<EntradaRegistro<T>[]>;
  /** Debe fallar (rechazar) si no puede escribir. Nunca debe modificar entradas existentes. */
  anadir(entrada: EntradaRegistro<T>): Promise<void>;
}

const PREFIJO = 'blinka-registro-v1\n';

export function calcularHash<T extends object>(e: Pick<EntradaRegistro<T>, 'indice' | 'hash_previo' | 'registrado_en' | 'resultado'>): string {
  return sha256(
    PREFIJO + canonico({ indice: e.indice, hash_previo: e.hash_previo, registrado_en: e.registrado_en, resultado: e.resultado }),
  );
}

const esHash = (x: unknown): x is string => typeof x === 'string' && /^[0-9a-f]{64}$/.test(x);

/** Verifica la cadena completa. Devuelve el primer fallo encontrado. */
export function verificarCadena<T extends object>(entradas: EntradaRegistro<T>[], ancla?: Ancla): Verificacion {
  if (!Array.isArray(entradas)) return { ok: false, indice: 0, motivo: 'FORMATO' };
  let previo: string | null = null;
  for (let i = 0; i < entradas.length; i++) {
    const e = entradas[i];
    if (!e || typeof e !== 'object' || !esHash(e.hash) || typeof e.registrado_en !== 'string' || typeof e.resultado !== 'object' || e.resultado === null) {
      return { ok: false, indice: i, motivo: 'FORMATO' };
    }
    if (e.indice !== i) return { ok: false, indice: i, motivo: 'INDICE_INVALIDO' };
    if (e.hash_previo !== previo) return { ok: false, indice: i, motivo: 'ENCADENADO_ROTO' };
    let esperado: string;
    try {
      esperado = calcularHash(e);
    } catch {
      return { ok: false, indice: i, motivo: 'FORMATO' };
    }
    if (esperado !== e.hash) return { ok: false, indice: i, motivo: 'HASH_NO_COINCIDE' };
    previo = e.hash;
  }
  if (ancla && (ancla.n !== entradas.length || ancla.cabeza !== previo)) {
    return { ok: false, indice: Math.min(ancla.n, entradas.length), motivo: 'ANCLA_NO_COINCIDE' };
  }
  return { ok: true, n: entradas.length, cabeza: previo };
}

export class Registro<T extends object = ResultadoDecision> {
  private cola: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly almacen: Almacen<T>,
    private readonly reloj: () => string = () => new Date().toISOString(),
  ) {}

  /**
   * Anade una decision. Las escrituras se serializan: dos llamadas simultaneas nunca
   * calculan su hash sobre la misma entrada previa. Si el almacen falla, rechaza y no
   * queda entrada: quien llama no debe publicar la decision.
   */
  anadir(resultado: T): Promise<EntradaRegistro<T>> {
    const tarea = this.cola.then(() => this.anadirSerializado(resultado));
    this.cola = tarea.catch(() => undefined);
    return tarea;
  }

  private async anadirSerializado(resultado: T): Promise<EntradaRegistro<T>> {
    const todas = await this.almacen.leerTodo();
    const estado = verificarCadena(todas);
    if (!estado.ok) throw new Error(`El registro no verifica (${estado.motivo} en ${estado.indice}); no se anade nada.`);
    const base = {
      indice: todas.length,
      hash_previo: estado.cabeza,
      registrado_en: this.reloj(),
      resultado: structuredClone(resultado),
    };
    const entrada: EntradaRegistro<T> = { ...base, hash: calcularHash(base) };
    await this.almacen.anadir(entrada);
    return entrada;
  }

  async verificar(ancla?: Ancla): Promise<Verificacion> {
    return verificarCadena(await this.almacen.leerTodo(), ancla);
  }

  async ancla(): Promise<Ancla> {
    const v = verificarCadena(await this.almacen.leerTodo());
    if (!v.ok) throw new Error('El registro no verifica; no se puede tomar un ancla.');
    return { n: v.n, cabeza: v.cabeza };
  }
}

/** Almacen en memoria para pruebas y para el modo demo sin base de datos. Solo permite anadir. */
export class AlmacenEnMemoria<T extends object = ResultadoDecision> implements Almacen<T> {
  protected readonly entradas: EntradaRegistro<T>[] = [];
  async leerTodo(): Promise<EntradaRegistro<T>[]> {
    return structuredClone(this.entradas);
  }
  async anadir(entrada: EntradaRegistro<T>): Promise<void> {
    this.entradas.push(structuredClone(entrada));
  }
}
