import { randomInt } from 'node:crypto';
import type { Config, Contexto } from '../engine/types';

/**
 * Empresas del bot: cada chat pertenece a una empresa; las facturas se deciden con los proveedores y el
 * limite de SU empresa y solo las aprueba quien devuelve aprobadorDe(). La demo (Aurora Cloud) es una
 * fila real con id fijo (migracion 0004) y la aprueba TELEGRAM_DUENO_ID.
 */

export const ID_DEMO = '00000000-0000-4000-8000-00000000a0a0';

export type Rol = 'DUENO' | 'EQUIPO';

export interface Empresa {
  id: string;
  nombre: string;
  codigo: string;
  es_demo: boolean;
  dueno_chat_id: number | null;
  dueno_usuario_id: number | null;
  limite_pago_usd_centavos: number;
}

export interface Miembro {
  chat_id: number;
  usuario_id: number | null;
  empresa_id: string;
  rol: Rol;
}

export interface Proveedor {
  id_fiscal: string;
  cuenta: string;
  nombre: string;
  /** AAAA-MM-DD desde la que la cuenta esta registrada (el dia en que el dueno la agrego). */
  desde: string;
}

/** Quien aprueba en Telegram y a que chat se le avisa. null = nadie (falla cerrada). */
export interface Aprobador {
  usuarioId: number;
  chatId: number;
}

/**
 * UNICA regla de aprobacion. Demo: TELEGRAM_DUENO_ID (su chat privado tiene el mismo id). Otra empresa:
 * su dueno registrado. Sin empresa o sin dueno: nadie.
 */
export function aprobadorDe(empresa: Empresa | null, duenoDemo: number | null): Aprobador | null {
  if (!empresa) return null;
  if (empresa.es_demo) return duenoDemo === null ? null : { usuarioId: duenoDemo, chatId: duenoDemo };
  if (empresa.dueno_usuario_id === null || empresa.dueno_chat_id === null) return null;
  return { usuarioId: empresa.dueno_usuario_id, chatId: empresa.dueno_chat_id };
}

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Codigo para compartir con el equipo: PULSO- y 6 caracteres sin ambiguos (sin 0, O, 1, I). */
export function nuevoCodigo(): string {
  let s = 'PULSO-';
  for (let i = 0; i < 6; i++) s += ALFABETO[randomInt(ALFABETO.length)];
  return s;
}

export function normalizarCodigo(t: string): string | null {
  const c = t.trim().toUpperCase().replace(/\s+/g, '');
  const conPrefijo = c.startsWith('PULSO-') ? c : `PULSO-${c}`;
  return /^PULSO-[A-Z2-9]{6}$/.test(conPrefijo) ? conPrefijo : null;
}

/** Nombre de empresa limpio: sin caracteres de control, 2 a 60 caracteres. null si no sirve. */
export function nombreValido(t: string): string | null {
  // eslint-disable-next-line no-control-regex
  const n = t.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return n.length >= 2 && n.length <= 60 ? n : null;
}

/** Limites por pago que el dueno puede fijar con /limite, en USD. */
export const LIMITES_USD = [1_000, 5_000, 10_000, 25_000] as const;

/**
 * Contexto de una empresa creada en el bot: solo sus proveedores (con la fecha en que se agregaron), sin
 * acuerdos ni presupuestos ni historial. El motor no lo inventa: sin acuerdo escala (R6), sin presupuesto
 * escala (R4). El reloj es el real (las cuentas se agregan hoy). Reglas: las de la demo con SU limite.
 */
export function contextoDeEmpresa(proveedores: Proveedor[], ahora: Date): Contexto {
  const porId = new Map<string, { id_fiscal: string; nombre: string; cuentas: { cuenta: string; desde: string }[] }>();
  for (const p of proveedores) {
    const b = porId.get(p.id_fiscal) ?? { id_fiscal: p.id_fiscal, nombre: p.nombre, cuentas: [] };
    b.cuentas.push({ cuenta: p.cuenta, desde: p.desde });
    porId.set(p.id_fiscal, b);
  }
  return { ahora: ahora.toISOString(), beneficiarios: [...porId.values()], acuerdos: [], presupuestos: {}, historial: [] };
}

export function reglasDeEmpresa(base: Config, empresa: Empresa): Config {
  return { ...base, limite_pago_usd_centavos: empresa.limite_pago_usd_centavos };
}
