'use client';
import { useEffect, useState } from 'react';
import { Ic } from './ui/iconos';
import { ICONO_DECISION, RIESGO } from './ui/mapa-iconos';
import { Veredicto, VerMas, Vacio } from './ui/Sistema';
import { estados, type DecisionUI } from './ui/lenguaje';
import type { VistaLectura } from './ui/Lectura';
import type { FilaTraza } from '../src/demo/traza';
export interface VistaFactura { id: string; decision: DecisionUI; texto: string; proveedor: string; monto: string; razones: FilaTraza[]; reglas?: string[]; aprobacion: string; lectura: VistaLectura; }
export default function ListaFacturas({ filas }: { filas: VistaFactura[] ;}) {
  const [busqueda, setBusqueda] = useState(''); const [decision, setDecision] = useState(''); const [tabla, setTabla] = useState(false); const [regla, setRegla] = useState('');
  useEffect(() => { const oir = (e: Event) => { const d = (e as CustomEvent<{ decision?: string; regla?: string }>).detail ?? {}; setDecision(d.decision ?? ''); setRegla(d.regla ?? ''); setBusqueda(''); }; window.addEventListener('lista:filtrar', oir); return () => window.removeEventListener('lista:filtrar', oir); }, []);
  const visibles = filas.filter(f => (!decision || f.decision === decision) && (!regla || (f.reglas ?? []).includes(regla)) && `${f.id} ${f.proveedor}`.toLocaleLowerCase('es').includes(busqueda.toLocaleLowerCase('es')));
  const activos = Number(Boolean(busqueda)) + Number(Boolean(decision)) + Number(Boolean(regla));
  return <section id="lista" aria-label="Tus facturas">

    <details>
      <summary><Ic nombre="tabla" size={20} className="en-linea" />Buscar facturas {activos ? `· ${activos} filtros en uso` : ''}</summary>
      <div className="rejilla-2">
        <div className="campo"><label htmlFor="buscar">Nombre o número de factura</label><input id="buscar" type="search" value={busqueda} onChange={e => setBusqueda(e.target.value)} /></div>
        <div className="campo"><label htmlFor="decision">Qué decidió Pulso</label><select id="decision" value={decision} onChange={e => setDecision(e.target.value)}><option value="">Todas</option>{Object.entries(estados).map(([d, e]) => <option key={d} value={d}>{e.etiqueta}</option>)}</select></div>
      </div>
      <button className="btn btn-texto" onClick={() => { setBusqueda(''); setDecision(''); setRegla(''); }}><Ic nombre="x" size={20} />Quitar filtros</button></details>
    {decision || regla ? <p className="filtro-activo" role="status"><Ic nombre="reglas" size={20} /><strong>Mostrando:</strong> {[decision ? estados[decision as DecisionUI].etiqueta : '', regla ? (RIESGO[regla]?.etiqueta ?? regla) : ''].filter(Boolean).join(' · ')} ({visibles.length}) <button className="btn btn-texto" onClick={() => { setDecision(''); setRegla(''); }}>Quitar filtro</button></p> : null}

    <div className="acciones"><button className="btn btn-texto" aria-pressed={tabla} onClick={() => setTabla(!tabla)}><Ic nombre={tabla ? 'cola' : 'tabla'} size={20} />{tabla ? 'Ver como frases' : 'Ver como tabla'}</button></div>
    {visibles.length === 0 ? <Vacio>No hay facturas con esos datos. Quita los filtros para ver todas.</Vacio> : tabla ? <div className="tabla-envoltura"><table className="tabla"><caption>Tus facturas</caption><thead><tr><th>Factura</th><th>Estado</th><th>Proveedor</th><th>Monto</th><th>Documento</th><th>Confianza</th><th>Para cuándo</th></tr></thead><tbody>{visibles.map(f => <tr key={f.id}><td><a href={`/facturas/${f.id}`}>{f.id}</a></td><td><span className="con-ic"><Ic nombre={ICONO_DECISION[f.decision]} size={20} />{estados[f.decision].etiqueta}</span></td><td>{f.proveedor}</td><td>{f.monto}</td><td>{f.lectura.formato}</td><td>{f.lectura.confianza}</td><td>{f.lectura.vence.texto}</td></tr>)}</tbody></table></div> : <>{(['ESCALAR', 'FRENAR', 'PAGAR'] as const).map(d => {
      const delCarril = visibles.filter(f => f.decision === d).sort((a, b) => Number(b.id === 'F-016') - Number(a.id === 'F-016'));
      return <details className={`carril carril-${estados[d].clase}`} key={`${d}-${decision}-${regla}`} open={d === 'ESCALAR' || Boolean(decision || regla)} data-tour="tarjeta-decision">
        <summary><Ic nombre={ICONO_DECISION[d]} size={28} className="en-linea" />{d === 'ESCALAR' ? 'Te necesita' : d === 'FRENAR' ? 'Frenadas' : 'Listas para pagar'} · {delCarril.length}</summary>
        <div className="filas">{delCarril.length ? <VerMas total={delCarril.length}>{delCarril.map(f => <Veredicto key={f.id} id={f.id} decision={f.decision} texto={f.texto} proveedor={f.proveedor} monto={f.monto} razones={f.razones} lectura={f.lectura} ancla={f.id === 'F-016' ? 'factura-trampa' : undefined}>{f.aprobacion === 'APROBADA' ? <p>Ya aprobaste este pago.</p> : f.aprobacion === 'RECHAZADA' ? <p>Ya rechazaste este pago.</p> : null}</Veredicto>)}</VerMas> : <Vacio>No hay facturas en este grupo.</Vacio>}</div>
      </details>;
    })}</>}
  </section>;
}
