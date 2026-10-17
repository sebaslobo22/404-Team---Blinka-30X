'use client';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
type Accion = 'APROBAR' | 'RECHAZAR';
export default function Acciones({ facturaId }: { facturaId: string ;}) {
  const router = useRouter(); const candado = useRef(false);
  const [accion, setAccion] = useState<Accion | null>(null); const [nota, setNota] = useState('');
  const [pendiente, setPendiente] = useState(false); const [error, setError] = useState<string | null>(null); const [exito, setExito] = useState<string | null>(null);
  async function enviar() {
    if (candado.current || !accion || !nota.trim()) return;
    candado.current = true; setPendiente(true); setError(null);
    try {
      const r = await fetch('/api/aprobaciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ factura_id: facturaId, accion }) });
      const d = await r.json(); if (!r.ok || !d.ok) throw new Error(d.error ?? 'No se pudo registrar la resolución.');
      setExito(accion === 'APROBAR' ? 'Aprobación registrada. No se ejecutó ningún pago.' : 'Rechazo registrado.'); setAccion(null);
    } catch (e) { setError(`${e instanceof Error ? e.message : 'No se pudo contactar con el servidor.'} Revisa el estado de la factura antes de reintentar.`); }
    finally { candado.current = false; setPendiente(false); }
  }
  return <div>{!accion && !exito ? <div className="acciones"><button className="btn btn-primario" onClick={() => setAccion('APROBAR')}>Aprobar</button><button className="btn btn-peligro" onClick={() => setAccion('RECHAZAR')}>Rechazar</button></div> : null}
    {accion ? <form onSubmit={e => { e.preventDefault(); void enviar(); }} aria-busy={pendiente}>
      <p><strong>{accion === 'APROBAR' ? 'Confirmar aprobación' : 'Confirmar rechazo'} de {facturaId}</strong></p>
      <div className="campo"><label htmlFor={`nota-${facturaId}`}>Motivo de la revisión (obligatorio)</label><textarea id={`nota-${facturaId}`} required value={nota} disabled={pendiente} onChange={e => setNota(e.target.value)} aria-describedby={`nota-ayuda-${facturaId}`} /><small className="tenue" id={`nota-ayuda-${facturaId}`}>La nota solo acompaña esta revisión en pantalla. La API actual no la guarda.</small></div>
      <div className="acciones"><button className="btn btn-primario" disabled={pendiente || !nota.trim()}>{pendiente ? 'Registrando…' : 'Confirmar resolución'}</button><button className="btn" type="button" disabled={pendiente} onClick={() => setAccion(null)}>Cancelar</button></div>
    </form> : null}

    <div aria-live="polite">{exito ? <div className="aviso aviso-ok">
      <p>{exito}</p>
      <button className="btn" onClick={() => router.refresh()}>Actualizar cola</button></div> : null}{error ? <p className="aviso aviso-error" role="alert">{error}</p> : null}</div>
  </div>;
}
