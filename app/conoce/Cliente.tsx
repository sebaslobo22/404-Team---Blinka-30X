'use client';
import { useEffect, useState } from 'react';
import { Ic } from '../ui/iconos';
import { initMotion } from './motion';

/** Arranca el movimiento de la landing (ver motion.ts). Con "reducir movimiento" no hace nada. */
export function Movimiento() {
  useEffect(() => initMotion(), []);
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
