'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MARGEN_PANTALLA, posicionarBurbuja, scrollNecesario, union } from './posicion';
import type { Caja, Posicion } from './posicion';
import { createPortal } from 'react-dom';
import { pasosPara } from './pasos';
import './tour.css';

const CLAVE_VISTO = '404-tour-visto';
const CLAVE_PASO = '404-tour-paso';
const ESPERA_MAX = 3000;

const leer = (s: Storage | undefined, k: string): string | null => { try { return s?.getItem(k) ?? null; } catch { return null; } };
const guardar = (s: Storage | undefined, k: string, v: string | null) => { try { if (v === null) s?.removeItem(k); else s?.setItem(k, v); } catch { /* sin almacenamiento */ } };
const sinMovimiento = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const caja = (e: Element): Caja => { const r = e.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; };
const visible = (e: Element) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };

interface Geom { pos: Posicion; vw: number; vh: number }

export function Tour() {
  const ruta = usePathname();
  const router = useRouter();
  const [pasoId, setPasoId] = useState<string | null>(null);
  const [escritorio, setEscritorio] = useState(false);
  const [estable, setEstable] = useState(false);
  const [anima, setAnima] = useState(false);
  const [contenedor, setContenedor] = useState<HTMLElement | null>(null);
  const [geom, setGeom] = useState<Geom | null>(null);

  const elsRef = useRef<Element[]>([]);
  const burbuja = useRef<HTMLDivElement>(null);
  const primario = useRef<HTMLButtonElement>(null);
  const animarHasta = useRef(0);
  const rutaRef = useRef(ruta);
  rutaRef.current = ruta;
  const empujado = useRef<string | null>(null);

  const pasos = pasosPara(escritorio);
  const idx = pasoId ? pasos.findIndex((p) => p.id === pasoId) : -1;
  const paso = idx >= 0 ? pasos[idx] : undefined;
  const enEquipo = ruta.startsWith('/team');

  useEffect(() => {
    const m = matchMedia('(min-width: 1024px)');
    const f = () => setEscritorio(m.matches);
    f();
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);

  const ir = useCallback((id: string | null) => {
    setPasoId(id);
    guardar(typeof sessionStorage === 'undefined' ? undefined : sessionStorage, CLAVE_PASO, id);
    setAnima(true);
    animarHasta.current = performance.now() + 700;
  }, []);

  const cerrar = useCallback(() => {
    ir(null);
    elsRef.current = [];
    setGeom(null);
    setEstable(false);
    guardar(localStorage, CLAVE_VISTO, '1');
    requestAnimationFrame(() => {
      const botones = Array.from(document.querySelectorAll<HTMLElement>('[data-tour-boton]'));
      (botones.find((b) => b.offsetParent !== null) ?? botones[0])?.focus();
    });
  }, [ir]);

  const empezar = useCallback(() => { guardar(localStorage, CLAVE_VISTO, '1'); ir('bienvenida'); }, [ir]);

  // Arranque: continuar un recorrido en curso, o abrirlo la primera vez en la portada.
  useEffect(() => {
    if (rutaRef.current.startsWith('/team')) return;
    const guardado = leer(typeof sessionStorage === 'undefined' ? undefined : sessionStorage, CLAVE_PASO);
    if (guardado) { setPasoId(guardado); return; }
    // El recorrido se abre a petición. Nunca interrumpe la lectura por sí solo.
  }, [empezar]);

  useEffect(() => {
    window.addEventListener('tour:abrir', empezar);
    return () => window.removeEventListener('tour:abrir', empezar);
  }, [empezar]);

  // Un paso que ya no existe (p. ej. el de la barra al achicar la ventana) cae al primero; en /team el tour no corre.
  useEffect(() => {
    if (pasoId && idx < 0) ir(pasos[0]?.id ?? null);
    if (pasoId && enEquipo) { ir(null); }
  }, [pasoId, idx, pasos, enEquipo, ir]);

  const recalcular = useCallback(() => {
    const el = document.documentElement;
    const vw = el.clientWidth, vh = el.clientHeight;
    const cajas = elsRef.current.filter((e) => e.isConnected && visible(e)).map(caja);
    const alto = burbuja.current?.offsetHeight ?? 220;
    setGeom({ pos: posicionarBurbuja({ objetivo: union(cajas), viewport: { ancho: vw, alto: vh }, burbuja: { alto } }), vw, vh });
  }, []);

  // Buscar el elemento del paso (esperando a la página si hace falta), llevarlo a la vista y fijar la burbuja.
  useEffect(() => {
    if (!paso) return;
    setEstable(false);
    if (paso.id !== 'texto-fuente') { document.querySelector<HTMLDialogElement>('.evidencia-dialogo[open]')?.close(); setContenedor(null); }
    let vivo = true;
    const timers: number[] = [];
    let observador: MutationObserver | undefined;
    let intervalo: number | undefined;
    let alScroll: (() => void) | undefined;
    const limpiarScroll = () => { if (alScroll) window.removeEventListener('scroll', alScroll); alScroll = undefined; };

    const fijar = () => {
      limpiarScroll();
      if (!vivo) return;
      setEstable(true);
      animarHasta.current = performance.now() + 300;
      recalcular();
      window.setTimeout(() => setAnima(false), 450);
    };
    const esperarScroll = () => {
      limpiarScroll();
      let fin = window.setTimeout(fijar, 160);
      timers.push(fin);
      timers.push(window.setTimeout(fijar, 1300));
      alScroll = () => { window.clearTimeout(fin); fin = window.setTimeout(fijar, 160); timers.push(fin); };
      window.addEventListener('scroll', alScroll, { passive: true });
    };
    const sinObjetivo = () => { elsRef.current = []; recalcular(); fijar(); };

    if (!paso.selector) { sinObjetivo(); return () => { vivo = false; limpiarScroll(); timers.forEach(clearTimeout); }; }

    if (rutaRef.current !== paso.ruta && empujado.current !== paso.id) { empujado.current = paso.id; router.push(paso.ruta); }

    let encontrado = false;
    const buscar = () => {
      if (!vivo || encontrado || rutaRef.current !== paso.ruta) return;
      if (paso.id === 'texto-fuente') { const panel = document.querySelector<HTMLDialogElement>('.evidencia-dialogo'); if (panel && !panel.open) panel.showModal(); if(panel) setContenedor(panel); }
      if (paso.abrir) document.querySelectorAll<HTMLDetailsElement>(paso.abrir).forEach((d) => { if (d instanceof HTMLDetailsElement && !d.open) d.open = true; });
      const els = Array.from(document.querySelectorAll(paso.selector!)).filter(visible);
      if (els.length === 0) return;
      encontrado = true;
      observador?.disconnect();
      if (intervalo) window.clearInterval(intervalo);
      elsRef.current = els;
      // La evidencia tiene su propio scroll: mover la página no acerca ese texto.
      if (els[0]?.closest('dialog[open]')) els[0].scrollIntoView({ block: 'start', behavior: 'instant' });
      const fija = els.some((e) => getComputedStyle(e).position === 'fixed');
      const cab = document.querySelector('.cabecera');
      const cabecera = cab && cab.getBoundingClientRect().height > 0 ? Math.max(0, cab.getBoundingClientRect().bottom) : 0; // la cabecera no es fija: con la página desplazada su borde queda arriba de la pantalla
      const doc = document.documentElement;
      const movil = doc.clientWidth <= 600;
      const reserva = movil ? (burbuja.current?.offsetHeight ?? 240) + MARGEN_PANTALLA + 12 : 0;
      const o = union(els.map(caja));
      const destino = !fija && o ? scrollNecesario({ objetivo: o, scrollY: window.scrollY, alto: doc.clientHeight, cabecera, reservaInferior: reserva, scrollMax: Math.max(0, doc.scrollHeight - doc.clientHeight) }) : null;
      recalcular();
      if (destino !== null) { window.scrollTo({ top: destino, behavior: sinMovimiento() ? 'auto' : 'smooth' }); esperarScroll(); } else { fijar(); }
    };
    buscar();
    if (!encontrado) {
      observador = new MutationObserver(buscar);
      observador.observe(document.body, { childList: true, subtree: true });
      intervalo = window.setInterval(buscar, 100);
      // Si en 3 s no aparece, se muestra centrado sin foco; sigue buscando por si llega tarde.
      timers.push(window.setTimeout(() => { if (!encontrado) sinObjetivo(); }, ESPERA_MAX));
    }
    return () => { vivo = false; observador?.disconnect(); if (intervalo) window.clearInterval(intervalo); limpiarScroll(); timers.forEach(clearTimeout); };
  }, [paso, ruta, recalcular, router]);

  // Mantener el foco pegado al elemento: scroll, tamaño de ventana, cambios de tamaño y movimiento de la barra.
  useEffect(() => {
    if (!paso) return;
    let raf = 0;
    const pedir = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(recalcular); };
    const barra = () => { animarHasta.current = performance.now() + 700; };
    window.addEventListener('scroll', pedir, { passive: true });
    window.addEventListener('resize', pedir);
    window.addEventListener('barra:cambio', barra);
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(pedir) : undefined;
    ro?.observe(document.body);
    const main = document.querySelector('main');
    if (main) ro?.observe(main);
    elsRef.current.forEach((e) => ro?.observe(e));
    let vivo = true;
    const bucle = () => { if (!vivo) return; if (performance.now() < animarHasta.current) recalcular(); raf = requestAnimationFrame(bucle); };
    raf = requestAnimationFrame(bucle);
    return () => { vivo = false; cancelAnimationFrame(raf); window.removeEventListener('scroll', pedir); window.removeEventListener('resize', pedir); window.removeEventListener('barra:cambio', barra); ro?.disconnect(); };
  }, [paso, estable, recalcular]);

  useLayoutEffect(() => { if (paso) recalcular(); }, [paso, recalcular]);

  useEffect(() => { if (paso && estable) primario.current?.focus({ preventScroll: true }); }, [paso, estable]);

  const siguiente = useCallback(() => { if (idx >= 0 && idx < pasos.length - 1) ir(pasos[idx + 1]!.id); else cerrar(); }, [idx, pasos, ir, cerrar]);
  const atras = useCallback(() => { if (idx > 0) ir(pasos[idx - 1]!.id); }, [idx, pasos, ir]);

  useEffect(() => {
    if (!paso) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        const f = Array.from(burbuja.current?.querySelectorAll<HTMLElement>('button:not(:disabled)') ?? []);
        if (f.length === 0) return;
        const activo = document.activeElement;
        if (!burbuja.current?.contains(activo)) { e.preventDefault(); f[0]!.focus(); }
        else if (e.shiftKey && activo === f[0]) { e.preventDefault(); f[f.length - 1]!.focus(); }
        else if (!e.shiftKey && activo === f[f.length - 1]) { e.preventDefault(); f[0]!.focus(); }
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'Escape') { e.preventDefault(); cerrar(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); siguiente(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); atras(); }
      else if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); siguiente(); }
    };
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [paso, cerrar, siguiente, atras]);

  if (!paso || enEquipo) return null;

  const pos = geom?.pos;
  const foco = pos?.foco;
  const focoEstilo = foco
    ? { left: foco.left, top: foco.top, width: foco.width, height: foco.height }
    : { left: (geom?.vw ?? 0) / 2, top: (geom?.vh ?? 0) / 2, width: 0, height: 0 };
  const inicio = paso.tipo === 'inicio';
  const fin = paso.tipo === 'fin';

  return createPortal(
    <div className="tour-capa">
      <div className={`tour-foco${anima ? ' tour-foco-anima' : ''}${foco ? ' tour-foco-activo' : ''}`} style={focoEstilo} aria-hidden="true" />
      <div
        ref={burbuja}
        className={`tour-burbuja${estable && pos ? ' tour-visible' : ''}${pos?.lado === 'hoja' ? ' tour-hoja' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-titulo"
        aria-describedby="tour-texto"
        data-lado={pos?.lado ?? 'centro'}
        style={pos ? { left: pos.left, top: pos.top, width: pos.ancho } : { left: 0, top: 0 }}
      >
        {pos?.flecha ? <span className="tour-flecha" data-borde={pos.flecha.borde} style={pos.flecha.borde === 'arriba' || pos.flecha.borde === 'abajo' ? { left: pos.flecha.desplazamiento } : { top: pos.flecha.desplazamiento }} aria-hidden="true" /> : null}
        <p className="tour-contador">{idx + 1} de {pasos.length}</p>
        <h2 id="tour-titulo" className="tour-titulo">{paso.titulo}</h2>
        <p id="tour-texto" className="tour-texto">{paso.texto}</p>
        <div className="tour-botones">
          {inicio ? (
            <>
              <button type="button" className="btn" onClick={cerrar}>Ahora no</button>
              <button type="button" className="btn btn-primario" ref={primario} onClick={siguiente}>Empezar</button>
            </>
          ) : (
            <>
              {fin ? null : <button type="button" className="btn tour-saltar" onClick={cerrar}>Saltar</button>}
              <button type="button" className="btn" onClick={atras} disabled={idx <= 0}>Atrás</button>
              <button type="button" className="btn btn-primario" ref={primario} onClick={siguiente}>{fin ? 'Terminar' : 'Siguiente'}</button>
            </>
          )}
        </div>
      </div>
    </div>, contenedor?.isConnected ? contenedor : document.body
  );
}
