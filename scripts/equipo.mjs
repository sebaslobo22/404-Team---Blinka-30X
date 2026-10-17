#!/usr/bin/env node
// Centro de mando 404 desde la terminal (Node 22+, sin dependencias).
//
// USO
//   node scripts/equipo.mjs contexto                         imprime el contexto en Markdown
//   node scripts/equipo.mjs tomar <ruta> [--agente nombre]   toma una zona (409 si la tiene otro)
//   node scripts/equipo.mjs soltar <ruta>                    suelta una zona
//   node scripts/equipo.mjs tarea <id|texto parcial> <estado>  estado: pendiente | en_curso | bloqueada | hecha
//   node scripts/equipo.mjs nota "<texto>"                   agrega una nota a la bitácora
//   node scripts/equipo.mjs sembrar                          carga data/equipo-semilla.json en Supabase
//                                                            (directo, con la service key; solo si las tablas están vacías, o con --forzar)
//
// CONFIGURACION (archivo .env en la raíz o variables de entorno; nunca subas el .env)
//   EQUIPO_URL                    app del centro de mando (default http://localhost:3000)
//   EQUIPO_PIN                    PIN del equipo (el mismo que usa el servidor)
//   EQUIPO_QUIEN                  tu nombre en la bitácora (default "agente")
//   NEXT_PUBLIC_SUPABASE_URL      solo para "sembrar"
//   SUPABASE_SERVICE_ROLE_KEY     solo para "sembrar"
// Lo que escribe este script queda marcado como agente en la bitácora.

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function leerEnv() {
  const out = {};
  const ruta = resolve(raiz, '.env');
  if (!existsSync(ruta)) return out;
  for (const linea of readFileSync(ruta, 'utf8').split(/\r?\n/)) {
    const m = linea.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || linea.trim().startsWith('#')) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[m[1]] = v;
  }
  return out;
}

const env = { ...leerEnv(), ...process.env };
const BASE = (env.EQUIPO_URL || 'http://localhost:3000').replace(/\/$/, '');
const QUIEN = env.EQUIPO_QUIEN || 'agente';

function fallar(msg) {
  console.error(`Error: ${msg}`);
  process.exit(1);
}

async function api(ruta, cuerpo) {
  if (!env.EQUIPO_PIN) fallar('falta EQUIPO_PIN en .env o en el entorno.');
  let r;
  try {
    r = await fetch(`${BASE}/api/team/${ruta}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-equipo-pin': env.EQUIPO_PIN, 'x-equipo-agente': '1', 'x-equipo-quien': QUIEN },
      body: JSON.stringify({ ...cuerpo, quien: QUIEN, es_agente: true }),
    });
  } catch (e) {
    fallar(`no pude conectar con ${BASE} (${e.message}). ¿Está corriendo la app?`);
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) fallar(`${r.status} ${j.error ?? r.statusText}`);
  return j;
}

async function leerContexto() {
  const r = await fetch(`${BASE}/api/team/contexto`).catch((e) => fallar(`no pude conectar con ${BASE} (${e.message}).`));
  if (!r.ok) fallar(`contexto respondió ${r.status}`);
  return r.json();
}

function opcion(args, nombre) {
  const i = args.indexOf(nombre);
  if (i === -1) return undefined;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
}

const quitar = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

async function sembrar(args) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) fallar('sembrar necesita NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.');
  const semilla = JSON.parse(readFileSync(resolve(raiz, 'data/equipo-semilla.json'), 'utf8'));
  const cab = { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' };
  const rest = (t, q = '') => `${url.replace(/\/$/, '')}/rest/v1/${t}${q}`;
  const forzar = args.includes('--forzar');

  const hay = await fetch(rest('equipo_tareas', '?select=id&limit=1'), { headers: cab });
  if (!hay.ok) fallar(`no pude leer equipo_tareas (${hay.status}). ¿Corriste la migración 0002?`);
  if ((await hay.json()).length > 0 && !forzar) fallar('equipo_tareas ya tiene datos. Usa --forzar para sembrar de todos modos (duplica tareas).');

  const subir = async (t, filas, extra = {}) => {
    const r = await fetch(rest(t), { method: 'POST', headers: { ...cab, prefer: 'resolution=merge-duplicates,return=minimal', ...extra }, body: JSON.stringify(filas) });
    if (!r.ok) fallar(`${t}: ${r.status} ${await r.text()}`);
    console.log(`${t}: ${filas.length} filas`);
  };
  await subir('equipo_estado', Object.entries(semilla.estado).map(([clave, valor]) => ({ clave, valor })));
  await subir('equipo_zonas', semilla.zonas);
  await subir('equipo_tareas', semilla.tareas.map(({ id, ...t }) => ({ ...t, actualizado_por: QUIEN })));
  await subir('equipo_bitacora', [{ quien: QUIEN, es_agente: true, accion: 'semilla cargada', detalle: `${semilla.tareas.length} tareas, ${semilla.zonas.length} zonas` }]);
}

const [, , cmd, ...args] = process.argv;
switch (cmd) {
  case 'contexto': {
    const r = await fetch(`${BASE}/team/contexto.md`).catch((e) => fallar(`no pude conectar con ${BASE} (${e.message}).`));
    if (!r.ok) fallar(`contexto respondió ${r.status}`);
    process.stdout.write(await r.text());
    break;
  }
  case 'tomar': {
    const agente = opcion(args, '--agente') ?? QUIEN;
    const ruta = args[0];
    if (!ruta) fallar('uso: tomar <ruta> [--agente nombre]');
    const j = await api('zonas', { ruta, agente, accion: 'tomar' });
    console.log(`Zona ${j.zona.ruta} tomada por ${j.zona.agente}.`);
    break;
  }
  case 'soltar': {
    if (!args[0]) fallar('uso: soltar <ruta>');
    const j = await api('zonas', { ruta: args[0], accion: 'soltar' });
    console.log(`Zona ${j.zona.ruta} libre.`);
    break;
  }
  case 'tarea': {
    const [buscar, estado] = args;
    if (!buscar || !estado) fallar('uso: tarea <id|texto parcial> <estado>');
    const ctx = await leerContexto();
    const todas = Object.values(ctx.tareas).flat();
    const exacta = todas.filter((t) => t.id === buscar);
    const hallazgos = exacta.length ? exacta : todas.filter((t) => quitar(t.titulo).includes(quitar(buscar)));
    if (hallazgos.length === 0) fallar(`ninguna tarea coincide con "${buscar}".`);
    if (hallazgos.length > 1) fallar(`"${buscar}" coincide con ${hallazgos.length} tareas; sé más específico:\n- ${hallazgos.map((t) => t.titulo).join('\n- ')}`);
    const j = await api('tareas', { id: hallazgos[0].id, estado });
    console.log(`"${j.tarea.titulo}" → ${j.tarea.estado}`);
    break;
  }
  case 'nota': {
    if (!args[0]) fallar('uso: nota "<texto>"');
    await api('bitacora', { accion: args.join(' ') });
    console.log('Nota agregada a la bitácora.');
    break;
  }
  case 'sembrar':
    await sembrar(args);
    break;
  default:
    console.log('Comandos: contexto | tomar <ruta> [--agente n] | soltar <ruta> | tarea <id|texto> <estado> | nota "<texto>" | sembrar\nVer la cabecera de scripts/equipo.mjs.');
    process.exit(cmd ? 1 : 0);
}
