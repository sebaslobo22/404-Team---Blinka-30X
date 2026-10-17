'use client';
import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { estados, reglaPrincipal, type DecisionUI } from './lenguaje';
import type { FilaTraza } from '../../src/demo/traza';
import { nombres, detalleRazon } from './lenguaje';
import { Ic } from './iconos';
import { ICONO_DECISION, ICONO_ESTADO_TRAZA, iconoDeRegla } from './mapa-iconos';
export function IconoEstado({ decision }: { decision: DecisionUI ;}) { return <Ic nombre={ICONO_DECISION[decision]} className="estado-icono" />; }
export function Estado({ decision }: { decision: DecisionUI ;}) {
  return <span className={`pill pill-${estados[decision].clase}`}><IconoEstado decision={decision} />{estados[decision].etiqueta}</span>;
}
const claseTraza = (e: FilaTraza['estado']) => e === 'CUMPLE' ? 'ok' : e === 'FRENAR' ? 'frenar' : e === 'ESCALAR' ? 'escalar' : 'neutra';
export function Razones({ filas }: { filas: FilaTraza[] ;}) {
  const ordenadas = [...filas].sort((a, b) => Number(['FRENAR', 'ESCALAR'].includes(b.estado)) - Number(['FRENAR', 'ESCALAR'].includes(a.estado)));
  const [todas, setTodas] = useState(false);
  return <>
    <ul className="razones">{(todas ? ordenadas : ordenadas.slice(0, 7)).map(t => <li key={t.id} className={`razon razon-${claseTraza(t.estado)}`}><span className="ic-col"><Ic nombre={iconoDeRegla(t.id)} size={28} /></span>
      <div>
        <p className="razon-titulo"><strong>{nombres[t.id] ?? 'Revisión de datos'}</strong><span className="razon-estado"><Ic nombre={ICONO_ESTADO_TRAZA[t.estado] ?? 'guion'} size={20} />{t.estado === 'CUMPLE' ? 'Cumple' : ['FRENAR', 'ESCALAR'].includes(t.estado) ? 'Revisar' : t.estado === 'NO_APLICA' ? 'No aplica' : 'Sin revisar'}</span></p>
        <small>{detalleRazon(t)}</small></div>
    </li>)}</ul>
    {ordenadas.length > 7 ? <button className="btn btn-texto" onClick={() => setTodas(!todas)}>{todas ? 'Ver menos' : 'Ver más comprobaciones'}</button> : null}</>;
}
export function Veredicto({ id, decision, texto, monto, proveedor, razones, children, ancla, regla }: { id: string; decision: DecisionUI; texto: string; monto?: string; proveedor?: string; razones?: FilaTraza[]; children?: ReactNode; ancla?: string; regla?: string ;}) {
  const codigo = regla ?? reglaPrincipal(razones, decision);
  const [clave, ...resto] = texto.split(/(?<=[.!?])\s+/);
  return <article className="veredicto" aria-label={`Factura ${id}`} data-tour={ancla}>

    <div className="veredicto-cab"><Estado decision={decision} /><Link className="btn btn-texto mono" href={`/facturas/${id}`}>{id}</Link></div>

    <div className="fila-ic">
      <span className={`ic-col ic-${estados[decision].clase}`}><Ic nombre={codigo ? iconoDeRegla(codigo) : ICONO_DECISION[decision]} size={28} /></span>
      <div>
        <p className="veredicto-frase"><strong>{clave}</strong>{resto.length ? <span className="veredicto-detalle"> {resto.join(' ')}</span> : null}</p>
        {proveedor || monto ? <p className="veredicto-meta">{proveedor ? <span className="con-ic"><Ic nombre="edificio" size={20} />{proveedor}</span> : null}{monto ? <span className="con-ic"><Ic nombre="monedas" size={20} /><span className="mono">{monto}</span></span> : null}</p> : null}
      </div>
    </div>
    {razones ? <details>
      <summary><Ic nombre="pregunta" size={20} className="en-linea" />¿Por qué?</summary>
      <Razones filas={razones} /><Link className="btn btn-texto" href={`/facturas/${id}`}><Ic nombre="carpeta" size={20} />Ver evidencia de {id}</Link></details> : null}
    {children}
  </article>;
}
export function Vacio({ children }: { children: ReactNode ;}) { return <div className="aviso aviso-vacio" role="status"><Ic nombre="vacio" size={48} /><div>{children}</div></div>; }
export function Evidencia({ children }: { children: ReactNode ;}) {
  const dialogo = useRef<HTMLDialogElement>(null); const boton = useRef<HTMLButtonElement>(null); const titulo = useId();
  return <><button ref={boton} className="btn" onClick={() => dialogo.current?.showModal()}><Ic nombre="carpeta" size={24} />Ver evidencia</button><dialog ref={dialogo} className="evidencia-dialogo" aria-labelledby={titulo} onClose={() => boton.current?.focus()} onClick={e => { if (e.target === dialogo.current && e.clientX < dialogo.current.getBoundingClientRect().left) dialogo.current.close(); }}>
    <div className="cerrar-panel"><button className="btn" onClick={() => dialogo.current?.close()}><Ic nombre="x" size={20} />Cerrar evidencia</button></div>
    <h2 id={titulo} className="titulo-ic"><Ic nombre="carpeta" size={28} />Lo que respalda esta decisión</h2>
    {children}</dialog></>;
}
export function TamanoLetra() {
  const [tamano, setTamano] = useState('normal');
  useEffect(() => { const leer = () => { try { setTamano(localStorage.getItem('404-letra') ?? 'normal'); } catch { } }; leer(); window.addEventListener('letra:cambio', leer); return () => window.removeEventListener('letra:cambio', leer); }, []);
  function aplicar(t: string) { setTamano(t); document.documentElement.dataset.letra = t; try { localStorage.setItem('404-letra', t); } catch { } window.dispatchEvent(new Event('letra:cambio')); }
  return <div className="letra-control" role="group" aria-label="Tamaño de letra"><span className="con-ic"><Ic nombre="tamano-letra" size={20} />Tamaño de letra</span>{[['normal', 'A'], ['grande', 'A+'], ['muy-grande', 'A++']].map(([valor, texto]) => <button key={valor} type="button" aria-pressed={tamano === valor} aria-label={`Tamaño de letra ${texto}`} onClick={() => aplicar(valor!)}>{texto}</button>)}</div>;
}
export function VerMas({children,total,inicial=7,enLista=false}:{children:ReactNode[];total:number;inicial?:number;enLista?:boolean}) {
  const [todos,setTodos]=useState(false);
  const control=total>inicial?<button className="btn btn-texto" onClick={()=>setTodos(!todos)}>{todos?'Ver menos':`Ver más (${total-inicial})`}</button>:null;
  return <>{todos?children:children.slice(0,inicial)}{control?(enLista?<li>{control}</li>:control):null}</>;
}
