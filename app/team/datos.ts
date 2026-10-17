// Carga de datos del centro de mando (solo servidor). Sin variables de Supabase: usa la semilla.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import semilla from '../../data/equipo-semilla.json';
import { modoPublico } from '../../src/publico';
import type { Bitacora, Contexto, Tarea, Zona } from './lib';

export function hayServidorSupabase(): boolean {
  if (modoPublico(process.env)) return false;
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function clienteServidor(): SupabaseClient | null {
  // Defensa en profundidad: el despliegue publico nunca crea un cliente, aunque haya variables.
  if (modoPublico(process.env)) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function contextoDeSemilla(): Contexto {
  const s = semilla as unknown as { estado: Contexto['estado']; tareas: Omit<Tarea, 'id'>[]; zonas: Zona[] };
  return {
    estado: s.estado,
    tareas: s.tareas.map((t, i) => ({ ...t, id: `semilla-${i}` })),
    zonas: s.zonas,
    bitacora: [],
    conectado: false,
  };
}

export async function cargarContexto(): Promise<Contexto> {
  const db = clienteServidor();
  if (!db) return contextoDeSemilla();
  try {
    const [est, tar, zon, bit] = await Promise.all([
      db.from('equipo_estado').select('*'),
      db.from('equipo_tareas').select('*').order('bloque').order('orden'),
      db.from('equipo_zonas').select('*').order('ruta'),
      db.from('equipo_bitacora').select('*').order('id', { ascending: false }).limit(20),
    ]);
    const err = est.error ?? tar.error ?? zon.error ?? bit.error;
    if (err) throw new Error(err.message);
    const estado: Contexto['estado'] = {};
    for (const f of est.data ?? []) estado[f.clave as string] = f.valor;
    return {
      estado,
      tareas: (tar.data ?? []) as Tarea[],
      zonas: (zon.data ?? []) as Zona[],
      bitacora: (bit.data ?? []) as Bitacora[],
      conectado: true,
    };
  } catch {
    // Falla visible: se muestra la semilla, marcada como no conectada.
    return contextoDeSemilla();
  }
}
