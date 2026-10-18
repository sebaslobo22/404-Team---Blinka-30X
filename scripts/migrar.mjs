#!/usr/bin/env node
// Aplica las migraciones de supabase/migrations/ en orden contra la base del equipo.
// Uso: node scripts/migrar.mjs            (todas las que falten)
//      node scripts/migrar.mjs --solo 0002 (una sola)
// Lee SUPABASE_DB_URL del entorno, de .env.local o de .env (Supabase → Project Settings → Database → Connection string, URI,
// con la contraseña). Nunca imprime la cadena. Lleva registro en la tabla public._migraciones.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let pg;
try { pg = require('pg'); } catch { console.error('Falta la dependencia pg: npm i -D pg'); process.exit(1); }

// .env.local manda sobre .env, como en Next.js. Un archivo que no existe se salta.
const leer = (f) => (existsSync(f) ? readFileSync(f, 'utf8').split('\n').filter((l) => l.includes('=') && !l.startsWith('#'))
  .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }) : []);
const env = Object.fromEntries([...leer('.env'), ...leer('.env.local')].filter(([, v]) => v));
const url = process.env.SUPABASE_DB_URL || env.SUPABASE_DB_URL;
if (!url) { console.error('Falta SUPABASE_DB_URL en .env.local o en .env'); process.exit(1); }

const solo = process.argv.includes('--solo') ? process.argv[process.argv.indexOf('--solo') + 1] : null;
const dir = 'supabase/migrations';
const archivos = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort().filter((f) => !solo || f.startsWith(solo));

const cliente = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await cliente.connect();
await cliente.query('create table if not exists public._migraciones (nombre text primary key, aplicada_en timestamptz default now())');
for (const f of archivos) {
  const ya = await cliente.query('select 1 from public._migraciones where nombre = $1', [f]);
  if (ya.rowCount) { console.log(`= ${f} (ya aplicada)`); continue; }
  const sql = readFileSync(join(dir, f), 'utf8');
  try {
    await cliente.query('begin');
    await cliente.query(sql);
    await cliente.query('insert into public._migraciones (nombre) values ($1)', [f]);
    await cliente.query('commit');
    console.log(`+ ${f} aplicada`);
  } catch (e) {
    await cliente.query('rollback');
    console.error(`x ${f} falló: ${e.message}`);
    await cliente.end();
    process.exit(1);
  }
}
await cliente.end();
