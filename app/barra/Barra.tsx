'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { CLAVE_BARRA, alternarBarra, esActivo, esAtajoBarra, hayBarra, leerEstadoBarra, nombreTema, siguienteTema, textoContador } from './estado';
import type { EstadoBarra } from './estado';
import { IconoCola, IconoColapsar, IconoDecisiones, IconoEquipo, IconoMarca, IconoRecorrido, IconoRegistro, IconoReglas, IconoTema } from './iconos';

const PRINCIPALES: { href: string; texto: string; icono: ReactNode }[] = [
  { href: '/', texto: 'Decisiones', icono: <IconoDecisiones /> },
  { href: '/cola', texto: 'Cola de aprobación', icono: <IconoCola /> },
  { href: '/reglas', texto: 'Reglas', icono: <IconoReglas /> },
  { href: '/registro', texto: 'Registro', icono: <IconoRegistro /> },
];

function aplicar(e: EstadoBarra) {
  if (e === 'colapsada') document.documentElement.dataset.barra = 'colapsada';
  else delete document.documentElement.dataset.barra;
}

export function BarraLateral({ pendientes }: { pendientes: number | null }) {
  const ruta = usePathname();
  const [estado, setEstado] = useState<EstadoBarra>('ampliada');
  const [tema, setTema] = useState('sistema');
  const [pildora, setPildora] = useState<{ top: number; alto: number } | null>(null);
  const [anima, setAnima] = useState(false);
  const lista = useRef<HTMLUListElement>(null);

  // Estado guardado: el script del <head> ya pintó el ancho correcto; aquí solo se sincroniza React.
  useEffect(() => {
    try { setEstado(leerEstadoBarra(localStorage.getItem(CLAVE_BARRA))); } catch { /* ampliada */ }
    const leerTema = () => { try { setTema(localStorage.getItem('404-tema') ?? 'sistema'); } catch { /* sistema */ } };
    leerTema();
    window.addEventListener('tema:cambio', leerTema);
    return () => window.removeEventListener('tema:cambio', leerTema);
  }, []);

  const cambiar = useCallback((nuevo: EstadoBarra) => {
    setEstado(nuevo);
    aplicar(nuevo);
    try { localStorage.setItem(CLAVE_BARRA, nuevo); } catch { /* solo en memoria */ }
    window.dispatchEvent(new Event('barra:cambio'));
  }, []);

  const estadoRef = useRef(estado);
  estadoRef.current = estado;
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (!esAtajoBarra(e) || !hayBarra(window.innerWidth)) return;
      e.preventDefault();
      cambiar(alternarBarra(estadoRef.current));
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [cambiar]);

  // La píldora activa se desliza hasta el ítem de la ruta actual.
  useLayoutEffect(() => {
    const medir = () => {
      const activo = lista.current?.querySelector<HTMLElement>('[aria-current="page"]')?.closest('li');
      setPildora(activo ? { top: activo.offsetTop, alto: activo.offsetHeight } : null);
    };
    medir();
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [ruta]);
  useEffect(() => { const id = requestAnimationFrame(() => setAnima(true)); return () => cancelAnimationFrame(id); }, []);

  function ciclarTema() {
    const t = siguienteTema(tema);
    setTema(t);
    if (t === 'sistema') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t;
    try { localStorage.setItem('404-tema', t); } catch { /* tema en memoria */ }
    window.dispatchEvent(new Event('tema:cambio'));
  }

  const ampliada = estado === 'ampliada';
  const enEquipo = ruta.startsWith('/team');
  const contador = textoContador(pendientes);
  const item = (href: string, texto: string, icono: ReactNode, extra?: ReactNode) => (
    <li key={href}>
      <Link className="barra-item" href={href} data-tip={texto} aria-current={esActivo(href, ruta) ? 'page' : undefined}>
        {icono}<span className="barra-texto">{texto}</span>{extra}
      </Link>
    </li>
  );

  return (
    <aside id="barra-lateral" className="barra" data-tour="barra" data-estado={estado}>
      <Link className="barra-marca" href="/" data-tip="Agente pagador · Equipo 404">
        <span className="barra-marca-icono"><IconoMarca /></span>
        <span className="barra-texto barra-marca-texto"><strong>Agente pagador</strong><small>Equipo 404</small></span>
      </Link>
      <nav className="barra-nav" aria-label="Principal">
        <ul className="barra-lista" ref={lista}>
          {pildora ? <li className={`barra-pildora${anima ? ' barra-pildora-anima' : ''}`} aria-hidden="true" style={{ transform: `translateY(${pildora.top}px)`, height: pildora.alto }} /> : null}
          {PRINCIPALES.map((p) => item(p.href, p.texto, p.icono, p.href === '/cola' && contador ? <span className="barra-contador"><span aria-hidden="true">{contador}</span><span className="sr-only">{contador} pendientes</span></span> : null))}
          <li className="barra-separador" role="separator" />
          {item('/team', 'Equipo', <IconoEquipo />)}
        </ul>
      </nav>
      <div className="barra-pie">
        {enEquipo ? null : (
          <button type="button" className="barra-item" data-tip="Ver recorrido" data-tour-boton onClick={() => window.dispatchEvent(new Event('tour:abrir'))}>
            <IconoRecorrido /><span className="barra-texto">Ver recorrido</span>
          </button>
        )}
        <button type="button" className="barra-item" data-tip={`Tema ${nombreTema(tema)}`} onClick={ciclarTema} aria-label={`Tema ${nombreTema(tema)}. Cambiar tema`}>
          <IconoTema /><span className="barra-texto">Tema {nombreTema(tema)}</span>
        </button>
        <button type="button" className="barra-item barra-colapsar" data-tip={ampliada ? 'Contraer barra (Ctrl+B)' : 'Ampliar barra (Ctrl+B)'} aria-label="Barra lateral" aria-expanded={ampliada} aria-controls="barra-lateral" onClick={() => cambiar(alternarBarra(estado))}>
          <IconoColapsar /><span className="barra-texto">{ampliada ? 'Contraer' : 'Ampliar'}</span>
        </button>
      </div>
    </aside>
  );
}
