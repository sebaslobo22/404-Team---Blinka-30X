'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Veredicto, VerMas, Vacio } from '../ui/Sistema';
import type { VistaFactura } from '../ListaFacturas';
import Acciones from './Acciones';
export default function Lista({ filas }: { filas: VistaFactura[] ;}) {
  const [resueltas, setResueltas] = useState<string[]>([]); const [saliendo, setSaliendo] = useState<string | null>(null); const [mensaje, setMensaje] = useState(''); const aviso = useRef<HTMLDivElement>(null); const router = useRouter();
  const visibles = filas.filter(f => !resueltas.includes(f.id));
  useEffect(() => { if (mensaje) aviso.current?.focus(); }, [mensaje]);
  function resolver(id: string, texto: string) { setSaliendo(id); const quitar = () => { setResueltas(prev => [...prev, id]); setSaliendo(null); setMensaje(texto); router.refresh(); }; if (matchMedia('(prefers-reduced-motion: reduce)').matches) quitar(); else setTimeout(quitar, 240); }
  return <section data-tour="pendientes">
    <div ref={aviso} tabIndex={-1} role="status" aria-live="polite">{mensaje ? <p className="aviso aviso-ok">{mensaje}</p> : null}</div>
    {visibles.length ? <div className="filas"><VerMas total={visibles.length}>{visibles.map(f => <div key={f.id} className={saliendo === f.id ? 'resolucion-salida' : undefined}><Veredicto id={f.id} decision={f.decision} texto={f.texto} proveedor={f.proveedor} monto={f.monto} razones={f.razones}><Acciones facturaId={f.id} monto={f.monto} onResuelta={texto => resolver(f.id, texto)} /></Veredicto></div>)}</VerMas></div> : <Vacio>No hay nada que espere tu respuesta. <a href="/">Vuelve a tus facturas.</a></Vacio>}</section>;
}
