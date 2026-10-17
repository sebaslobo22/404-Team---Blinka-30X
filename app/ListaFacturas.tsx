'use client';
import { useState } from 'react';
import { Veredicto, VerMas, Vacio } from './ui/Sistema';
import { estados, type DecisionUI } from './ui/lenguaje';
import type { FilaTraza } from '../src/demo/traza';
export interface VistaFactura { id: string; decision: DecisionUI; texto: string; proveedor: string; monto: string; razones: FilaTraza[]; aprobacion: string; }
export default function ListaFacturas({ filas }: { filas: VistaFactura[] ;}) {
  const [busqueda, setBusqueda] = useState(''); const [decision, setDecision] = useState(''); const [tabla, setTabla] = useState(false);
  const visibles = filas.filter(f => (!decision || f.decision === decision) && `${f.id} ${f.proveedor}`.toLocaleLowerCase('es').includes(busqueda.toLocaleLowerCase('es')));
  const activos = Number(Boolean(busqueda)) + Number(Boolean(decision));
  return <section aria-label="Tus facturas">

    <details>
      <summary>Buscar facturas {activos ? `· ${activos} filtros en uso` : ''}</summary>
      <div className="rejilla-2">
        <div className="campo"><label htmlFor="buscar">Nombre o número de factura</label><input id="buscar" type="search" value={busqueda} onChange={e => setBusqueda(e.target.value)} /></div>
        <div className="campo"><label htmlFor="decision">Qué decidió el agente</label><select id="decision" value={decision} onChange={e => setDecision(e.target.value)}><option value="">Todas</option>{Object.entries(estados).map(([d, e]) => <option key={d} value={d}>{e.etiqueta}</option>)}</select></div>
      </div>
      <button className="btn btn-texto" onClick={() => { setBusqueda(''); setDecision(''); }}>Quitar filtros</button></details>

    <div className="acciones"><button className="btn btn-texto" aria-pressed={tabla} onClick={() => setTabla(!tabla)}>{tabla ? 'Ver como frases' : 'Ver como tabla'}</button></div>
    {visibles.length === 0 ? <Vacio>No hay facturas con esos datos. Quita los filtros para ver todas.</Vacio> : tabla ? <div className="tabla-envoltura"><table className="tabla"><caption>Tus facturas</caption><thead><tr><th>Factura</th><th>Estado</th><th>Proveedor</th><th>Monto</th></tr></thead><tbody>{visibles.map(f => <tr key={f.id}><td><a href={`/facturas/${f.id}`}>{f.id}</a></td><td>{estados[f.decision].etiqueta}</td><td>{f.proveedor}</td><td>{f.monto}</td></tr>)}</tbody></table></div> : <>{(['ESCALAR', 'FRENAR', 'PAGAR'] as const).map(d => {
      const delCarril = visibles.filter(f => f.decision === d).sort((a, b) => Number(b.id === 'F-016') - Number(a.id === 'F-016'));
      return <details className="carril" key={d} open={d === 'ESCALAR'} data-tour="tarjeta-decision">
        <summary>{d === 'ESCALAR' ? 'Te necesita' : d === 'FRENAR' ? 'Frenadas' : 'Pagadas'} · {delCarril.length}</summary>
        <div className="filas">{delCarril.length ? <VerMas total={delCarril.length}>{delCarril.map(f => <Veredicto key={f.id} id={f.id} decision={f.decision} texto={f.texto} proveedor={f.proveedor} monto={f.monto} razones={f.razones} ancla={f.id === 'F-016' ? 'factura-trampa' : undefined}>{f.aprobacion === 'APROBADA' ? <p>Ya aprobaste este pago.</p> : f.aprobacion === 'RECHAZADA' ? <p>Ya rechazaste este pago.</p> : null}</Veredicto>)}</VerMas> : <Vacio>No hay facturas en este grupo.</Vacio>}</div>
      </details>;
    })}</>}
  </section>;
}
