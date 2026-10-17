'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BotonTour } from './tour/BotonTour';
import { TamanoLetra } from './ui/Sistema';
import { IconoDecisiones, IconoCola, IconoReglas, IconoRegistro, IconoEquipo, IconoTema, Ic } from './ui/iconos';
const enlaces = [['/', 'Inicio', IconoDecisiones], ['/cola', 'Tu ayuda', IconoCola], ['/reglas', 'Reglas', IconoReglas], ['/registro', 'Registro', IconoRegistro]] as const;
export function Cabecera({equipoDisponible=true}:{equipoDisponible?:boolean}) {
  const [tema, setTema] = useState('sistema');
  useEffect(() => { const leer = () => { try { const t = localStorage.getItem('404-tema') ?? 'sistema'; setTema(t); if (t !== 'sistema') document.documentElement.dataset.theme = t; } catch { } }; leer(); window.addEventListener('tema:cambio', leer); return () => window.removeEventListener('tema:cambio', leer); }, []);
  function cambiar() { const t = tema === 'light' ? 'dark' : tema === 'dark' ? 'sistema' : 'light'; setTema(t); if (t === 'sistema') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t; try { localStorage.setItem('404-tema', t); } catch { } window.dispatchEvent(new Event('tema:cambio')); }
  return <header className="cabecera">
    <div className="contenedor cabecera-interior">
      <div className="cabecera-fila"><Link className="marca" href="/">Pulso<span className="tenue"> · Equipo 404</span></Link>
        <details className="menu-movil">
          <summary><Ic nombre="colapsar" size={20} className="en-linea" />Más</summary>
          <div className="cabecera-utiles">{equipoDisponible?<Link className="btn btn-texto" href="/team"><IconoEquipo />Equipo</Link>:null}<BotonTour /><button className="btn" onClick={cambiar}><IconoTema />Tema {tema === 'light' ? 'claro' : tema === 'dark' ? 'oscuro' : 'del sistema'}</button></div>
        </details>
      </div>
      <TamanoLetra /></div>
  </header>;
}
export function NavegacionMovil() { const ruta = usePathname(); return <nav className="nav-inferior" aria-label="Principal en móvil">{enlaces.map(([href, texto, Icono]) => <Link key={href} href={href} aria-current={(href === '/' ? ruta === '/' || ruta.startsWith('/facturas/') : ruta === href) ? 'page' : undefined}><Icono /><span>{texto}</span></Link>)}</nav>; }
export function AvisoReplay() {
const [visible, setVisible] = useState(true); const ruta = usePathname(); if (!visible || ruta.startsWith('/team')) return null; return <aside className="aviso-demo">
    <div className="contenedor">
      <p className="con-ic"><Ic nombre="info" size={24} /><span><strong>Demostración.</strong> Los datos son ficticios. Las lecturas son reales: se grabaron y se reproducen sin llamar a ningún modelo ni usar claves. El sistema nunca mueve dinero.</span></p>
      <button className="btn btn-texto" onClick={() => setVisible(false)}><Ic nombre="x" size={20} />Cerrar</button></div>
  </aside>;
}
// El nuevo sistema no incluye entradas ni contadores que se muevan solos.
export function Movimiento() { return null; }
export function Contador({ valor }: { valor: number ;}) { return <span>{valor.toLocaleString('es-ES')} %</span>; }
