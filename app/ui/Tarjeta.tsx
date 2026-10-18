'use client';
import { useEffect, useId, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { AYUDAS } from './ayudas';
import { Ic } from './iconos';
import type { NombreIcono } from './mapa-iconos';

/**
 * La única tarjeta de la portada. Estructura fija: ícono, título (reserva dos líneas), cifra y texto de apoyo.
 * Aquí viven el relleno, el borde, el radio, el botón "i" y el realce al pasar el cursor (ver globals.css).
 */
export type VarianteTarjeta = 'indicador' | 'riesgo' | 'etapa' | 'base';
export type Tono = 'pagar' | 'frenar' | 'escalar';

const ANCLA = '[data-ayuda-ancla]';

/** Botón "i" y su panel. Abre con cursor, con foco de teclado y con toque; Esc o un clic fuera lo cierran. */
export function AyudaBoton({ clave, modo = 'tarjeta' }: { clave: string; modo?: 'tarjeta' | 'fila' }) {
  const a = AYUDAS[clave];
  const id = useId();
  const bt = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLSpanElement>(null);
  const [cursor, setCursor] = useState(false);
  const [foco, setFoco] = useState(false);
  const [fijo, setFijo] = useState(false);
  const abierta = cursor || foco || fijo;
  const cerrar = () => { setCursor(false); setFoco(false); setFijo(false); };

  // Marca las tarjetas que contienen el panel para subirlas de capa mientras está abierto.
  useEffect(() => {
    const anclas: Element[] = [];
    for (let el = bt.current?.closest(ANCLA) ?? null; el; el = el.parentElement?.closest(ANCLA) ?? null) anclas.push(el);
    for (const el of anclas) { if (abierta) el.setAttribute('data-abierta', ''); else el.removeAttribute('data-abierta'); }
    return () => { for (const el of anclas) el.removeAttribute('data-abierta'); };
  }, [abierta]);

  useEffect(() => {
    if (!abierta) return;
    const tecla = (e: KeyboardEvent) => { if (e.key === 'Escape') cerrar(); };
    const fuera = (e: Event) => { const t = e.target as Node; if (!bt.current?.contains(t) && !panel.current?.contains(t)) cerrar(); };
    document.addEventListener('keydown', tecla);
    document.addEventListener('pointerdown', fuera);
    return () => { document.removeEventListener('keydown', tecla); document.removeEventListener('pointerdown', fuera); };
  }, [abierta]);

  if (!a) return null;
  const conCursor = (e: PointerEvent) => { if (e.pointerType === 'mouse') setCursor(true); };
  const sinCursor = (e: PointerEvent) => { if (e.pointerType === 'mouse') setCursor(false); };
  return <>
    <button ref={bt} type="button" className={`ayuda-bt ayuda-${modo}`} data-ayuda={clave} aria-label="Qué es esto" aria-describedby={id}
      onPointerEnter={conCursor} onPointerLeave={sinCursor}
      onFocus={e => { if (e.currentTarget.matches(':focus-visible')) setFoco(true); }} onBlur={() => setFoco(false)}
      onClick={() => { if (fijo) cerrar(); else setFijo(true); }}><Ic nombre="info" size={20} /></button>
    <span ref={panel} id={id} role="tooltip" className={`ayuda-panel ayuda-panel-${modo}`} hidden={!abierta} onPointerEnter={conCursor} onPointerLeave={sinCursor}>
      <span className="ayuda-que">{a.que}</span>
      <span className="ayuda-porque">{a.porque}</span>
    </span>
  </>;
}

export interface PropsTarjeta {
  variante?: VarianteTarjeta;
  icono?: NombreIcono;
  tono?: Tono;
  titulo: ReactNode;
  /** El título es un encabezado (h3) en vez de un párrafo. */
  encabezado?: boolean;
  cifra?: ReactNode;
  /** Cifra grande, para las tarjetas de portada. Misma fuente y peso que las demás. */
  grande?: boolean;
  apoyo?: ReactNode;
  /** Clave en app/ui/ayudas.ts; si la lleva, aparece el botón "i". */
  ayuda?: string;
  /** Si la tarjeta entera lleva a algún lado (filtrar, abrir): se vuelve un botón. */
  alPulsar?: () => void;
  className?: string;
  /** Atributos de datos para el recorrido y las pruebas (data-*). */
  datos?: Record<`data-${string}`, string | true>;
  children?: ReactNode;
}

export default function Tarjeta({ variante = 'base', icono, tono, titulo, encabezado, cifra, grande, apoyo, ayuda, alPulsar, className, datos, children }: PropsTarjeta) {
  // Un solo manejador por tarjeta: escribe la posición del cursor en dos variables CSS. Sin estado de React.
  const mover = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--x', `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty('--y', `${e.clientY - r.top}px`);
  };
  const Titulo = encabezado ? 'h3' : 'p';
  const contenido = <>
    <div className="tarjeta-cab">
      {icono ? <Ic nombre={icono} size={variante === 'riesgo' ? 28 : 24} className={tono ? `ic-${tono}` : undefined} /> : null}
      <Titulo className="tarjeta-titulo">{titulo}</Titulo>
    </div>
    {cifra != null ? <p className={`tarjeta-cifra${grande ? ' tarjeta-cifra-grande' : ''}`}>{cifra}</p> : null}
    {apoyo ? <p className="tarjeta-apoyo">{apoyo}</p> : null}
    {children}
  </>;
  return <div className={`tarjeta tarjeta-${variante}${className ? ` ${className}` : ''}`} data-tarjeta={variante} data-ayuda-ancla="" onPointerMove={mover} {...datos}>
    {alPulsar
      ? <button type="button" className="tarjeta-cuerpo tarjeta-boton" onClick={alPulsar}>{contenido}</button>
      : <div className="tarjeta-cuerpo">{contenido}</div>}
    {ayuda ? <AyudaBoton clave={ayuda} /> : null}
  </div>;
}
