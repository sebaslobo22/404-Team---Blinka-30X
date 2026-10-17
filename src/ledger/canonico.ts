import { createHash } from 'node:crypto';

/**
 * JSON canonico: claves ordenadas, sin espacios. Rechaza lo que no se puede
 * representar de forma unica (undefined, NaN, infinito, funciones, ciclos).
 */
export function canonico(valor: unknown): string {
  return serializar(valor, new Set());
}

function serializar(v: unknown, vistos: Set<object>): string {
  if (v === null) return 'null';
  switch (typeof v) {
    case 'string':
    case 'boolean':
      return JSON.stringify(v);
    case 'number':
      if (!Number.isFinite(v)) throw new Error('numero no finito en el registro');
      return JSON.stringify(v);
    case 'object': {
      if (vistos.has(v)) throw new Error('referencia circular en el registro');
      vistos.add(v);
      let salida: string;
      if (Array.isArray(v)) {
        salida = `[${v.map((x) => serializar(x, vistos)).join(',')}]`;
      } else {
        const o = v as Record<string, unknown>;
        const partes = Object.keys(o)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${serializar(o[k], vistos)}`);
        salida = `{${partes.join(',')}}`;
      }
      vistos.delete(v);
      return salida;
    }
    default:
      throw new Error(`valor no serializable en el registro: ${typeof v}`);
  }
}

export function sha256(texto: string): string {
  return createHash('sha256').update(texto, 'utf8').digest('hex');
}
