import type { Metadata } from 'next';
import Centro from './Centro';
import { cargarContexto } from './datos';
import './equipo.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Centro de mando 404', description: 'Tareas, zonas y bitácora del equipo 404, en tiempo real.' };

export default async function PaginaEquipo() {
  const inicial = await cargarContexto();
  // Las variables públicas se leen en el servidor y se pasan al cliente: así funciona aunque cambien tras el build.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? null;
  return (
    <>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=JetBrains+Mono:wght@400;500&display=swap" />
      <Centro inicial={inicial} supabaseUrl={inicial.conectado ? url : null} supabaseAnon={inicial.conectado ? anon : null} />
    </>
  );
}
