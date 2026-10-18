'use client';
import { useEffect, useState } from 'react';
import { Ic } from '../ui/iconos';

/** Aparición sutil al hacer scroll: solo opacidad y 8 px. Si algo falla o el sistema pide menos movimiento, todo ya se ve. */
export function Revelar() {
  useEffect(() => {
    let reducido = false;
    try { reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { reducido = true; }
    if (reducido || typeof IntersectionObserver === 'undefined') return;
    const alto = window.innerHeight;
    const pendientes = Array.from(document.querySelectorAll<HTMLElement>('[data-revela]')).filter((el) => el.getBoundingClientRect().top > alto);
    const io = new IntersectionObserver((entradas) => {
      for (const e of entradas) if (e.isIntersecting) { (e.target as HTMLElement).removeAttribute('data-oculto'); io.unobserve(e.target); }
    }, { rootMargin: '0px 0px -8% 0px' });
    for (const el of pendientes) { el.setAttribute('data-oculto', ''); io.observe(el); }
    return () => { io.disconnect(); for (const el of pendientes) el.removeAttribute('data-oculto'); };
  }, []);
  return null;
}

/** Cambia entre tema del sistema, claro y oscuro. Misma clave que la app (404-tema). */
export function BotonTema() {
  const [tema, setTema] = useState('sistema');
  useEffect(() => { try { setTema(localStorage.getItem('404-tema') ?? 'sistema'); } catch { /* sin almacenamiento */ } }, []);
  const siguiente = () => {
    const t = tema === 'light' ? 'dark' : tema === 'dark' ? 'sistema' : 'light';
    setTema(t);
    if (t === 'sistema') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
    try { localStorage.setItem('404-tema', t); } catch { /* sin almacenamiento */ }
  };
  return <button type="button" className="btn" onClick={siguiente}><Ic nombre="tema" size={20} />Tema {tema === 'light' ? 'claro' : tema === 'dark' ? 'oscuro' : 'del sistema'}</button>;
}
