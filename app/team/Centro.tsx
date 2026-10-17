'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  DUENOS, ESTADOS, ETIQUETA_ESTADO, PERSONAS, agruparPorDueno, cuentaRegresiva, formatearCaracas, haceCuanto,
  type Contexto, type Dueno, type EstadoTarea,
} from './lib';

type Puerta = 'tareas' | 'zonas' | 'bitacora' | 'acuerdo';
const ARTEFACTO = 'https://claude.ai/artifact/GgSwHjL7xEiWPkx7h5VUgX';
const TABLAS = ['equipo_tareas', 'equipo_zonas', 'equipo_bitacora', 'equipo_estado'] as const;

const sinAcentos = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const clasePill: Record<EstadoTarea, string> = { pendiente: 'eq-p-acc', en_curso: 'eq-p-warn', bloqueada: 'eq-p-bad', hecha: 'eq-p-ok' };

function Icono({ agente }: { agente: boolean }) {
  return agente ? (
    <svg className="eq-ico" viewBox="0 0 24 24" width="18" height="18" aria-label="Agente" role="img" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="8" width="14" height="11" rx="2" /><path d="M12 4v4M9 13h.01M15 13h.01" />
    </svg>
  ) : (
    <svg className="eq-ico" viewBox="0 0 24 24" width="18" height="18" aria-label="Persona" role="img" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="4" /><path d="M4 20c1-4 4-6 8-6s7 2 8 6" />
    </svg>
  );
}

export default function Centro({ inicial, supabaseUrl, supabaseAnon }: { inicial: Contexto; supabaseUrl: string | null; supabaseAnon: string | null }) {
  const [ctx, setCtx] = useState<Contexto>(inicial);
  const [puerta, setPuerta] = useState<Puerta | null>(null);
  const [ahora, setAhora] = useState<number | null>(null);
  const [entrado, setEntrado] = useState(false);
  const [quien, setQuien] = useState<string>('Sebastián');
  const [pin, setPin] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [vivo, setVivo] = useState(false);
  const [nueva, setNueva] = useState({ titulo: '', dueno: 'Sebastián' as Dueno, bloque: 1 });
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refrescar = useCallback(async () => {
    try {
      const r = await fetch('/api/team/contexto', { cache: 'no-store' });
      if (!r.ok) return;
      const j = await r.json();
      const aplanadas = Object.values(j.tareas as Record<string, Contexto['tareas']>).flat();
      setCtx({ ...j, tareas: aplanadas });
    } catch { /* se queda con lo último que había */ }
  }, []);

  useEffect(() => {
    setAhora(Date.now());
    const t = setInterval(() => setAhora(Date.now()), 1000);
    try { setQuien(localStorage.getItem('equipo_quien') ?? 'Sebastián'); } catch { /* sin almacenamiento */ }
    fetch('/api/team/entrar').then((r) => r.json()).then((j) => setEntrado(Boolean(j.entrado))).catch(() => {});
    return () => clearInterval(t);
  }, []);

  // Tiempo real: cualquier cambio en las 4 tablas vuelve a pedir el contexto.
  useEffect(() => {
    if (!supabaseUrl || !supabaseAnon) return;
    const db = createClient(supabaseUrl, supabaseAnon);
    const pedir = () => {
      if (temporizador.current) clearTimeout(temporizador.current);
      temporizador.current = setTimeout(refrescar, 150);
    };
    let canal = db.channel('equipo-en-vivo');
    for (const tabla of TABLAS) canal = canal.on('postgres_changes', { event: '*', schema: 'public', table: tabla }, pedir);
    canal.subscribe((estado) => setVivo(estado === 'SUBSCRIBED'));
    return () => { void db.removeChannel(canal); };
  }, [supabaseUrl, supabaseAnon, refrescar]);

  async function escribir(ruta: string, cuerpo: Record<string, unknown>) {
    setMsg(null);
    const r = await fetch(`/api/team/${ruta}`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...cuerpo, quien }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) setMsg(r.status === 401 ? 'Necesitas el PIN para cambiar cosas.' : (j.error ?? 'No se pudo guardar.'));
    else await refrescar();
    return r.ok;
  }

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch('/api/team/entrar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pin, quien }) });
    if (r.ok) {
      setEntrado(true); setPin(''); setMsg(null);
      try { localStorage.setItem('equipo_quien', quien); } catch { /* ok */ }
    } else {
      const j: { error?: string } = await r.json().catch(() => ({}));
      setMsg(r.status === 429 || r.status === 503 ? String(j.error ?? 'No se pudo entrar.') : 'PIN incorrecto.');
    }
  }

  const grupos = useMemo(() => agruparPorDueno(ctx.tareas), [ctx.tareas]);
  const a = ctx.estado.ahora;
  const puedeEscribir = entrado && ctx.conectado;

  function tareaDe(p: string) {
    const mias = grupos[p as Dueno] ?? [];
    return mias.find((t) => t.estado === 'en_curso') ?? mias.find((t) => t.estado === 'bloqueada') ?? mias.find((t) => t.estado === 'pendiente');
  }
  function zonaDe(p: string) {
    const n = sinAcentos(p);
    return ctx.zonas.find((z) => z.agente && sinAcentos(z.agente).includes(n));
  }
  const puertas: { id: Puerta; titulo: string; sub: string }[] = [
    { id: 'tareas', titulo: 'Tareas', sub: `${ctx.tareas.filter((t) => t.estado !== 'hecha').length} abiertas` },
    { id: 'zonas', titulo: 'Zonas', sub: `${ctx.zonas.filter((z) => z.agente).length} tomadas` },
    { id: 'bitacora', titulo: 'Bitácora', sub: 'últimos movimientos' },
    { id: 'acuerdo', titulo: 'Acuerdo', sub: 'para agentes y personas' },
  ];

  return (
    <div className="eq">
      <div className="eq-wrap">
        <header className="eq-top">
          <div>
            <h1>Centro de mando 404</h1>
            <p className="eq-sub">Quién hace qué, qué zona está tomada y qué pasó. {vivo ? <span className="eq-pill eq-p-ok">en vivo</span> : null}</p>
          </div>
          <div className="eq-lado">
            {a ? (
              <div className="eq-clock">cierre {formatearCaracas(a.cierre_iso)}<b>{ahora === null ? '--' : cuentaRegresiva(a.cierre_iso, ahora)}</b></div>
            ) : null}
            {entrado ? (
              <span className="eq-pill eq-p-ok">Entraste como {quien}</span>
            ) : (
              <form className="eq-pin" onSubmit={entrar}>
                <label className="eq-oculto" htmlFor="eq-quien">Quién eres</label>
                <select id="eq-quien" value={quien} onChange={(e) => setQuien(e.target.value)}>
                  {PERSONAS.map((p) => <option key={p}>{p}</option>)}
                </select>
                <label className="eq-oculto" htmlFor="eq-pin">PIN</label>
                <input id="eq-pin" type="password" autoComplete="off" placeholder="PIN" value={pin} onChange={(e) => setPin(e.target.value)} />
                <button type="submit">Entrar</button>
              </form>
            )}
          </div>
        </header>

        {!ctx.conectado ? (
          <div className="eq-aviso" role="status">Sin conexión a Supabase: mostrando la semilla. Solo lectura.</div>
        ) : null}
        {msg ? <div className="eq-aviso eq-aviso-mal" role="alert">{msg}</div> : null}

        <section aria-label="Resumen">
          <div className="eq-facts">
            <div className="eq-fact eq-ok"><b>Ahora</b><span>{a?.frase ?? 'Sin estado cargado.'}</span></div>
            <div className="eq-fact eq-warn"><b>Siguiente hito</b><span>{a?.hito ?? '--'}</span></div>
            <div className="eq-fact eq-bad"><b>Nos frena</b><span>{a?.bloqueantes?.length ? a.bloqueantes.map((x, i) => <span key={i}>{x}</span>) : 'Nada por ahora.'}</span></div>
          </div>
        </section>

        <section aria-label="Personas">
          <div className="eq-personas">
            {PERSONAS.map((p) => {
              const t = tareaDe(p);
              const z = zonaDe(p);
              return (
                <article className="eq-persona" key={p}>
                  <h3>{p}</h3>
                  {t ? <p><span className={`eq-pill ${clasePill[t.estado]}`}>{ETIQUETA_ESTADO[t.estado]}</span> {t.titulo}</p> : <p className="eq-tenue">Sin tarea abierta.</p>}
                  <p className="eq-tenue">{z ? <>Zona tomada: <code>{z.ruta}</code> {haceCuanto(z.tomada_en, ahora ?? undefined)}</> : 'No tiene ninguna zona tomada.'}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section aria-label="Puertas">
          <h2>¿Qué quieres ver?</h2>
          <div className="eq-doors">
            {puertas.map((p) => (
              <button key={p.id} className="eq-door" aria-expanded={puerta === p.id} aria-controls={`eq-p-${p.id}`} onClick={() => setPuerta(puerta === p.id ? null : p.id)}>
                {p.titulo}<small>{p.sub}</small>
              </button>
            ))}
          </div>
        </section>

        {puerta === 'tareas' ? (
          <section className="eq-panel" id="eq-p-tareas">
            <h3>Tareas</h3>
            <div className="eq-cols">
              {DUENOS.map((d) => (
                <div className="eq-col" key={d}>
                  <h4>{d}</h4>
                  {grupos[d].length === 0 ? <p className="eq-tenue">Sin tareas.</p> : null}
                  {grupos[d].map((t) => (
                    <div className={`eq-tarea${t.estado === 'hecha' ? ' eq-hecha' : ''}`} key={t.id}>
                      <div className="eq-tarea-cab"><span className="eq-bloque">Bloque {t.bloque}</span><span className={`eq-pill ${clasePill[t.estado]}`}>{ETIQUETA_ESTADO[t.estado]}</span></div>
                      <p>{t.titulo}</p>
                      {puedeEscribir ? (
                        <div className="eq-botones" role="group" aria-label="Cambiar estado">
                          {ESTADOS.map((e) => (
                            <button key={e} disabled={e === t.estado} onClick={() => escribir('tareas', { id: t.id, estado: e })}>{ETIQUETA_ESTADO[e]}</button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {puedeEscribir ? (
              <form className="eq-nueva" onSubmit={async (e) => { e.preventDefault(); if (await escribir('tareas', nueva)) setNueva({ ...nueva, titulo: '' }); }}>
                <h4>Nueva tarea</h4>
                <input aria-label="Título" required placeholder="Título" value={nueva.titulo} onChange={(e) => setNueva({ ...nueva, titulo: e.target.value })} />
                <select aria-label="Dueño" value={nueva.dueno} onChange={(e) => setNueva({ ...nueva, dueno: e.target.value as Dueno })}>{DUENOS.map((d) => <option key={d}>{d}</option>)}</select>
                <input aria-label="Bloque" type="number" min={0} max={9} value={nueva.bloque} onChange={(e) => setNueva({ ...nueva, bloque: Number(e.target.value) })} />
                <button type="submit">Agregar</button>
              </form>
            ) : <p className="eq-tenue">{ctx.conectado ? 'Entra con el PIN para cambiar estados o crear tareas.' : 'Solo lectura.'}</p>}
          </section>
        ) : null}

        {puerta === 'zonas' ? (
          <section className="eq-panel" id="eq-p-zonas">
            <h3>Zonas</h3>
            <ul className="eq-zonas">
              {ctx.zonas.map((z) => (
                <li key={z.ruta}>
                  <span className={`eq-sem ${z.agente ? 'eq-sem-warn' : 'eq-sem-ok'}`} aria-hidden="true" />
                  <div className="eq-zona-txt">
                    <code>{z.ruta}</code>
                    <span className="eq-tenue">Dueño: {z.dueno}. {z.agente ? `Tomada por ${z.agente} ${haceCuanto(z.tomada_en, ahora ?? undefined)}.` : 'Libre.'}</span>
                  </div>
                  {puedeEscribir ? (
                    z.agente ? <button onClick={() => escribir('zonas', { ruta: z.ruta, accion: 'soltar' })}>Soltar</button>
                      : <button onClick={() => escribir('zonas', { ruta: z.ruta, accion: 'tomar', agente: quien })}>Tomar</button>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {puerta === 'bitacora' ? (
          <section className="eq-panel" id="eq-p-bitacora">
            <h3>Bitácora</h3>
            {ctx.bitacora.length === 0 ? <p className="eq-tenue">Sin movimientos todavía.</p> : null}
            <ul className="eq-bit">
              {ctx.bitacora.map((b) => (
                <li key={b.id}>
                  <Icono agente={b.es_agente} />
                  <div>
                    <b>{b.quien}</b>: {b.accion}{b.detalle ? ` — ${b.detalle}` : ''}
                    <span className="eq-tenue">{formatearCaracas(b.cuando)}{b.commit ? ` · ${b.commit}` : ''}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {puerta === 'acuerdo' ? (
          <section className="eq-panel" id="eq-p-acuerdo">
            <h3>Acuerdo</h3>
            <p>Un agente de IA debe leer el contexto antes de tocar nada, tomar su zona y soltarla al terminar.</p>
            <ul>
              <li><a href="/team/contexto.md">Contexto en Markdown para agentes</a></li>
              <li><a href={ARTEFACTO} target="_blank" rel="noreferrer">Marco Blinka 404 (artefacto)</a></li>
              <li>Comandos: <code>node scripts/equipo.mjs contexto | tomar &lt;ruta&gt; | soltar &lt;ruta&gt; | tarea &lt;texto&gt; &lt;estado&gt; | nota &quot;...&quot;</code></li>
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
