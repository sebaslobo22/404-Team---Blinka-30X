'use client';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Ic } from '../ui/iconos';
type Accion = 'APROBAR' | 'RECHAZAR';
export default function Acciones({ facturaId, monto = 'este cobro', onResuelta }: { facturaId: string; monto?: string; onResuelta?: (texto: string) => void ;}) {
  const router = useRouter(); const candado = useRef(false);
  const [accion, setAccion] = useState<Accion>('APROBAR'); const [nota, setNota] = useState(''); const [pendiente, setPendiente] = useState(false); const [error, setError] = useState(''); const [exito, setExito] = useState('');
  const detalles = useRef<HTMLDetailsElement>(null);
  async function enviar() {
    if (candado.current || !nota.trim()) return; candado.current = true; setPendiente(true); setError('');
    try {
      const r = await fetch('/api/aprobaciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ factura_id: facturaId, accion }) });
      const d = await r.json().catch(() => ({})); if (!r.ok || !d.ok) throw new Error(d.error ?? 'No se pudo guardar tu respuesta.');
      const texto = accion === 'APROBAR' ? `Aprobaste ${facturaId}. No se movió dinero.` : `Rechazaste ${facturaId}. No se autoriza el pago.`;
      setExito(texto); if (onResuelta) onResuelta(texto);
    } catch (e) { setError(`${e instanceof TypeError ? 'No hay conexión.' : e instanceof Error ? e.message : 'No se pudo guardar.'} Revisa el estado del cobro antes de intentar de nuevo.`); }
    finally { candado.current = false; setPendiente(false); }
  }
  if (exito) return <div className="aviso aviso-ok" role="status">
    <p>{exito}</p>
    <button className="btn btn-texto" onClick={() => router.refresh()}><Ic nombre="deshacer" size={20} />Volver a ver el estado</button></div>;
  return <details ref={detalles} name="resolver-factura" className="resolucion">
    <summary><Ic nombre="decisiones" size={24} className="en-linea" />Revisar este pago</summary>
    <form onSubmit={e => { e.preventDefault(); void enviar(); }} aria-busy={pendiente}>
      <p>Revisa las razones antes de dar tu respuesta.</p>
      <fieldset disabled={pendiente}>
        <legend>¿Qué quieres hacer?</legend>
        <div className="acciones"><label className="opcion"><input type="radio" name={`accion-${facturaId}`} checked={accion === 'APROBAR'} onChange={() => setAccion('APROBAR')} /> <Ic nombre="check" size={24} />Aprobar</label><label className="opcion"><input type="radio" name={`accion-${facturaId}`} checked={accion === 'RECHAZAR'} onChange={() => setAccion('RECHAZAR')} /> <Ic nombre="x" size={24} />Rechazar</label></div>
        <div className="campo"><label htmlFor={`nota-${facturaId}`}>Deja una nota (obligatoria)</label><textarea id={`nota-${facturaId}`} required value={nota} onChange={e => setNota(e.target.value)} aria-describedby={`ayuda-${facturaId}`} /><small id={`ayuda-${facturaId}`}>Tu nota se ve aquí. Esta demo no la guarda.</small></div>
      </fieldset>
      <p>Vas a {accion === 'APROBAR' ? 'aprobar' : 'rechazar'} {monto}. El agente no mueve dinero.</p>
      <div className="acciones"><button className="btn btn-primario" disabled={pendiente || !nota.trim()}><Ic nombre={accion === 'APROBAR' ? 'check' : 'x'} size={24} />{pendiente ? 'Guardando…' : `Sí, ${accion === 'APROBAR' ? 'aprobar' : 'rechazar'} ${monto}`}</button><button className="btn btn-texto" type="button" disabled={pendiente} onClick={() => { if (detalles.current) detalles.current.open = false; detalles.current?.querySelector('summary')?.focus(); }}><Ic nombre="deshacer" size={20} />Cancelar</button></div>
      {error ? <p className="aviso aviso-error" role="alert">{error}</p> : null}</form>
  </details>;
}
