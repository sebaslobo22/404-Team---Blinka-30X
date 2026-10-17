'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CLAVE_BARRA, alternarBarra, esActivo, esAtajoBarra, hayBarra, leerEstadoBarra, nombreTema, siguienteTema, textoContador } from './estado';
import type { EstadoBarra } from './estado';
import { IconoCola, IconoColapsar, IconoDecisiones, IconoEquipo, IconoMarca, IconoRecorrido, IconoRegistro, IconoReglas, IconoTema } from './iconos';
import { TamanoLetra } from '../ui/Sistema';
const enlaces = [['/', 'Decisiones', IconoDecisiones], ['/cola', 'Tu aprobación', IconoCola], ['/reglas', 'Tus reglas', IconoReglas], ['/registro', 'Registro', IconoRegistro]] as const;
export function BarraLateral({pendientes,equipoDisponible=true}:{pendientes:number|null;equipoDisponible?:boolean}) {
  const ruta = usePathname(); const [estado, setEstado] = useState<EstadoBarra>('ampliada'); const [tema, setTema] = useState('sistema');
  const actual = useRef(estado); actual.current = estado;
  useEffect(() => { try { setEstado(leerEstadoBarra(localStorage.getItem(CLAVE_BARRA))); } catch { } const leer = () => { try { setTema(localStorage.getItem('404-tema') ?? 'sistema'); } catch { } }; leer(); window.addEventListener('tema:cambio', leer); return () => window.removeEventListener('tema:cambio', leer); }, []);
  const cambiar = useCallback((nuevo: EstadoBarra) => { setEstado(nuevo); if (nuevo === 'colapsada') document.documentElement.dataset.barra = 'colapsada'; else delete document.documentElement.dataset.barra; try { localStorage.setItem(CLAVE_BARRA, nuevo); } catch { } window.dispatchEvent(new Event('barra:cambio')); }, []);
  useEffect(() => { const tecla = (e: KeyboardEvent) => { if (esAtajoBarra(e) && hayBarra(innerWidth)) { e.preventDefault(); cambiar(alternarBarra(actual.current)); } }; window.addEventListener('keydown', tecla); return () => window.removeEventListener('keydown', tecla); }, [cambiar]);
  function temaSiguiente() { const t = siguienteTema(tema); setTema(t); if (t === 'sistema') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t; try { localStorage.setItem('404-tema', t); } catch { } window.dispatchEvent(new Event('tema:cambio')); }
  return <aside id="barra-lateral" className="barra" data-tour="barra" data-estado={estado}><Link className="barra-marca" href="/"><IconoMarca /><span>Agente pagador<small>Equipo 404</small></span></Link>
    <nav aria-label="Principal">
      <ul className="barra-lista">{enlaces.map(([href, texto, Icono]) => <li key={href}><Link className="barra-item" href={href} aria-current={esActivo(href, ruta) ? 'page' : undefined}><Icono /><span>{texto}</span>{href === '/cola' && textoContador(pendientes) ? <span className="barra-contador">{textoContador(pendientes)}<span className="sr-only"> pendientes</span></span> : null}</Link></li>)}</ul>
    </nav>
    <div className="barra-pie"><TamanoLetra />{equipoDisponible?<Link className="barra-item" href="/team" aria-current={ruta.startsWith('/team') ? 'page' : undefined}><IconoEquipo /><span>Equipo</span></Link>:null}{!ruta.startsWith('/team') ? <button className="barra-item" data-tour-boton onClick={() => window.dispatchEvent(new Event('tour:abrir'))}><IconoRecorrido /><span>Ver recorrido</span></button> : null}<button className="barra-item" onClick={temaSiguiente}><IconoTema /><span>Tema {nombreTema(tema)}</span></button><button className="barra-item" aria-label="Barra lateral" aria-expanded={estado === 'ampliada'} aria-controls="barra-lateral" onClick={() => cambiar(alternarBarra(estado))}><IconoColapsar /><span>{estado === 'ampliada' ? 'Contraer barra' : 'Ampliar barra'}</span></button></div>
  </aside>;
}
