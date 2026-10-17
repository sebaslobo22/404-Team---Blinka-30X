'use client';
import Link from 'next/link';
import { useState } from 'react';
type Fila = { id: string; proveedor: string; monto: string; decision: string; motivo: string; aprobacion: string ;};
export default function ListaFacturas({ filas }: { filas: Fila[] ;}) {
  const [decision, setDecision] = useState(''); const [busqueda, setBusqueda] = useState('');
  const visibles = filas.filter(f => (!decision || f.decision === decision) && `${f.id} ${f.proveedor}`.toLocaleLowerCase('es').includes(busqueda.toLocaleLowerCase('es')));
  const activos = Number(Boolean(decision)) + Number(Boolean(busqueda));
  return <section aria-label="Facturas">
    <details className="tarjeta">
      <summary>Filtros {activos ? `· ${activos} activos` : ''}</summary>
      <div className="rejilla-2">
        <div className="campo"><label htmlFor="buscar">Factura o proveedor</label><input id="buscar" type="search" value={busqueda} onChange={e => setBusqueda(e.target.value)} /></div>
        <div className="campo"><label htmlFor="decision">Decisión</label><select id="decision" value={decision} onChange={e => setDecision(e.target.value)}><option value="">Todas</option>{['PAGAR', 'FRENAR', 'ESCALAR'].map(d => <option key={d}>{d}</option>)}</select></div>
      </div>
      <button className="btn" onClick={() => { setDecision(''); setBusqueda(''); }}>Limpiar filtros</button></details>

    <h2>Facturas · {visibles.length}</h2>
    <div className="filas">{visibles.length ? visibles.map(f => <article className="tarjeta factura-fila" key={f.id}><Link className="mono" href={`/facturas/${f.id}`} aria-label={`Ver factura ${f.id}`}>{f.id} ↗</Link>
      <div className="proveedor"><strong>{f.proveedor}</strong>
        <p className="mono">{f.monto}</p>
      </div>
      <div><span className={`pill pill-${f.decision.toLowerCase()}`}>{f.decision}</span>
        <p className="tenue">{f.aprobacion}</p>
      </div>
      <p className="motivo">{f.motivo}</p>
    </article>) : <p className="aviso">No hay facturas con estos filtros. Prueba otra búsqueda o limpia los filtros.</p>}</div>
  </section>;
}
