'use client';
import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { estados, type DecisionUI } from './lenguaje';
import type { FilaTraza } from '../../src/demo/traza';
import { nombres, detalleRazon } from './lenguaje';
export function IconoEstado({ decision }: { decision: DecisionUI ;}) {
  return <svg className="estado-icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {decision === 'PAGAR' ? <><circle cx="12" cy="12" r="9" /><path d="m7 12 3 3 7-7" /></> : decision === 'FRENAR' ? <><path d="M7 12V5a1.5 1.5 0 0 1 3 0v5-7a1.5 1.5 0 0 1 3 0v7-5a1.5 1.5 0 0 1 3 0v6-2a1.5 1.5 0 0 1 3 0v6c0 4-3 6-6 6-4 0-5-2-7-5L3 12c-1-2 1-3 2-2l2 2Z" /></> : <><circle cx="12" cy="7" r="4" /><path d="M4 21v-2a8 8 0 0 1 16 0v2" /></>}
  </svg>;
}
export function Estado({ decision }: { decision: DecisionUI ;}) {
  return <span className={`pill pill-${estados[decision].clase}`}><IconoEstado decision={decision} />{estados[decision].etiqueta}</span>;
}
export function Razones({ filas }: { filas: FilaTraza[] ;}) {
  const ordenadas = [...filas].sort((a, b) => Number(['FRENAR', 'ESCALAR'].includes(b.estado)) - Number(['FRENAR', 'ESCALAR'].includes(a.estado)));
  const [todas, setTodas] = useState(false);
  return <>
    <ul className="razones">{(todas ? ordenadas : ordenadas.slice(0, 7)).map(t => <li key={t.id} className="razon"><span className="razon-senal" aria-hidden="true">{t.estado === 'CUMPLE' ? '✓' : ['FRENAR', 'ESCALAR'].includes(t.estado) ? '✕' : '—'}</span>
      <div>
        <p><strong>{nombres[t.id] ?? 'Revisión de datos'}</strong> · {t.estado === 'CUMPLE' ? 'Cumple' : ['FRENAR', 'ESCALAR'].includes(t.estado) ? 'Revisar' : t.estado === 'NO_APLICA' ? 'No aplica' : 'Sin revisar'}</p>
        <small>{detalleRazon(t)}</small></div>
    </li>)}</ul>
    {ordenadas.length > 7 ? <button className="btn btn-texto" onClick={() => setTodas(!todas)}>{todas ? 'Ver menos' : 'Ver más comprobaciones'}</button> : null}</>;
}
export function Veredicto({ id, decision, texto, monto, proveedor, razones, children, ancla }: { id: string; decision: DecisionUI; texto: string; monto?: string; proveedor?: string; razones?: FilaTraza[]; children?: ReactNode; ancla?: string ;}) {
  return <article className="veredicto" aria-label={`Factura ${id}`} data-tour={ancla}>

    <div className="veredicto-cab"><Estado decision={decision} /><Link className="btn btn-texto mono" href={`/facturas/${id}`}>{id}</Link></div>

    <p className="veredicto-frase">{texto}</p>
    {proveedor || monto ? <p className="veredicto-meta">{proveedor} {monto ? <>· <span className="mono">{monto}</span></> : null}</p> : null}
    {razones ? <details>
      <summary>¿Por qué?</summary>
      <Razones filas={razones} /><Link className="btn btn-texto" href={`/facturas/${id}`}>Ver evidencia de {id}</Link></details> : null}
    {children}
  </article>;
}
export function Vacio({ children }: { children: ReactNode ;}) { return <div className="aviso" role="status">{children}</div>; }
export function Evidencia({ children }: { children: ReactNode ;}) {
  const dialogo = useRef<HTMLDialogElement>(null); const boton = useRef<HTMLButtonElement>(null); const titulo = useId();
  return <><button ref={boton} className="btn" onClick={() => dialogo.current?.showModal()}>Ver evidencia</button><dialog ref={dialogo} className="evidencia-dialogo" aria-labelledby={titulo} onClose={() => boton.current?.focus()} onClick={e => { if (e.target === dialogo.current && e.clientX < dialogo.current.getBoundingClientRect().left) dialogo.current.close(); }}>
    <div className="cerrar-panel"><button className="btn" onClick={() => dialogo.current?.close()}>Cerrar evidencia</button></div>
    <h2 id={titulo}>Lo que respalda esta decisión</h2>
    {children}</dialog></>;
}
export function TamanoLetra() {
  const [tamano, setTamano] = useState('normal');
  useEffect(() => { const leer = () => { try { setTamano(localStorage.getItem('404-letra') ?? 'normal'); } catch { } }; leer(); window.addEventListener('letra:cambio', leer); return () => window.removeEventListener('letra:cambio', leer); }, []);
  function aplicar(t: string) { setTamano(t); document.documentElement.dataset.letra = t; try { localStorage.setItem('404-letra', t); } catch { } window.dispatchEvent(new Event('letra:cambio')); }
  return <div className="letra-control" role="group" aria-label="Tamaño de letra"><span>Tamaño de letra</span>{[['normal', 'A'], ['grande', 'A+'], ['muy-grande', 'A++']].map(([valor, texto]) => <button key={valor} type="button" aria-pressed={tamano === valor} aria-label={`Tamaño de letra ${texto}`} onClick={() => aplicar(valor!)}>{texto}</button>)}</div>;
}
export function VerMas({ children, total, inicial = 7 }: { children: ReactNode[]; total: number; inicial?: number ;}) {
  const [todos, setTodos] = useState(false);
  return <>{todos ? children : children.slice(0, inicial)}{total > inicial ? <button className="btn btn-texto" onClick={() => setTodos(!todos)}>{todos ? 'Ver menos' : `Ver más (${total - inicial})`}</button> : null}</>;
}
