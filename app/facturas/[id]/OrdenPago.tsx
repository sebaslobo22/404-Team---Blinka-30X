'use client';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import type { OrdenBlinka } from '../../../src/demo/orden';
import { Ic } from '../../ui/iconos';

const MAX_REFERENCIA = 64;

/** Bloque de la orden de pago: riel sugerido, copiar para pagar a mano y marcar como pagada. No mueve dinero. */
export default function OrdenPago({ orden, texto }: { orden: OrdenBlinka; texto: string ;}) {
  const router = useRouter(); const candado = useRef(false);
  const [copia, setCopia] = useState<{ ok: boolean; texto: string ;} | null>(null);
  const [referencia, setReferencia] = useState(''); const [pendiente, setPendiente] = useState(false); const [error, setError] = useState(''); const [exito, setExito] = useState('');
  const pagada = orden.estado === 'MARCADA_PAGADA';
  const refLimpia = referencia.trim(); const refValida = refLimpia.length > 0 && refLimpia.length <= MAX_REFERENCIA;
  const ayuda = `ayuda-ref-${orden.factura_id}`;

  async function copiar() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error();
      await navigator.clipboard.writeText(texto);
      setCopia({ ok: true, texto: 'Datos copiados. Pégalos en tu banco y revísalos antes de pagar.' });
    } catch {
      setCopia({ ok: false, texto: 'No se pudo copiar. Abre "Ver los datos en texto" y cópialos a mano.' });
    }
  }

  async function marcar() {
    if (candado.current || !refValida) return; candado.current = true; setPendiente(true); setError('');
    try {
      const r = await fetch('/api/pagos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ factura_id: orden.factura_id, referencia_banco: refLimpia }) });
      const d = await r.json().catch(() => ({})); if (!r.ok || !d.ok) throw new Error(d.error ?? 'No se pudo guardar.');
      setExito(`Marcaste ${orden.factura_id} como pagada. Pulso no movió dinero.`); router.refresh();
    } catch (e) { setError(`${e instanceof TypeError ? 'No hay conexión.' : e instanceof Error ? e.message : 'No se pudo guardar.'} Revisa el estado de la orden antes de intentar de nuevo.`); }
    finally { candado.current = false; setPendiente(false); }
  }

  const datos = [
    ['Proveedor', orden.beneficiario, 'edificio'], ['Número fiscal', orden.id_fiscal, 'tarjeta'], ['Cuenta bancaria', orden.cuenta, 'banco'],
    ['Monto', `${orden.moneda} ${orden.monto}`, 'monedas'], ['Referencia', orden.referencia ?? 'Sin número de factura', 'documento'],
    ['Concepto', orden.concepto ?? 'Sin tipo de gasto', 'etiqueta'], ['Fecha sugerida', orden.fecha_sugerida ?? 'Sin fecha de vencimiento en la factura', 'calendario'],
    ['Quién lo autorizó', orden.origen_aprobacion === 'PERSONA' ? `Una persona (${orden.aprobado_por ?? 'sin nombre'})` : 'Tus reglas, sin persona', 'persona'],
  ] as const;

  return <section className="tarjeta" aria-labelledby={`titulo-orden-${orden.factura_id}`} data-orden-pago>
    <h2 id={`titulo-orden-${orden.factura_id}`} className="titulo-ic"><Ic nombre="flecha-salida" size={28} />Orden de pago</h2>
    <p className="aviso con-ic"><Ic nombre="info" size={24} /><strong>Formato propuesto para Blinka. Pulso no ejecuta pagos.</strong></p>
    <p className="acciones">{pagada
      ? <span className="pill pill-pagar"><Ic nombre="check-circulo" className="estado-icono" />Marcada como pagada</span>
      : <span className="pill pill-neutra"><Ic nombre="reloj" className="estado-icono" />Emitida, falta pagarla</span>}</p>

    <div className="aviso">
      <p className="con-ic"><Ic nombre="banco" size={24} /><strong>Riel sugerido: {orden.riel.nombre}</strong></p>
      <p className="tenue">{orden.riel.motivo} Blinka no publica cómo recibir órdenes, así que confirma el riel antes de pagar.</p>
    </div>

    <dl className="datos">{datos.map(([k, v, ic]) => <div key={k}>
      <dt><Ic nombre={ic} size={20} />{k}</dt>
      <dd>{v}</dd>
    </div>)}</dl>

    <div className="acciones">
      <button type="button" className="btn" onClick={() => void copiar()}><Ic nombre="copiar" size={24} />Copiar datos para pagar a mano</button>
      <a className="btn btn-texto" href="/api/ordenes/csv" download><Ic nombre="descargar" size={20} />Descargar lote de órdenes (CSV)</a>
    </div>
    <p className="tenue">El lote trae solo las órdenes que faltan por pagar.</p>
    {copia ? <p className={`aviso ${copia.ok ? 'aviso-ok' : 'aviso-error'}`} role={copia.ok ? 'status' : 'alert'}>{copia.texto}</p> : null}
    <details>
      <summary><Ic nombre="documento" size={20} className="en-linea" />Ver los datos en texto</summary>
      <pre className="codigo">{texto}</pre>
    </details>

    {pagada && orden.pago ? <p className="aviso aviso-ok con-ic" role="status"><Ic nombre="check-circulo" size={24} />Una persona la marcó como pagada. Referencia del banco: <span className="mono corto">{orden.pago.referencia_banco}</span></p>
      : exito ? <p className="aviso aviso-ok" role="status">{exito}</p>
      : <form className="resolucion" onSubmit={e => { e.preventDefault(); void marcar(); }} aria-busy={pendiente}>
        <h3 className="titulo-ic"><Ic nombre="check-circulo" size={24} />Marcar como pagada</h3>
        <p>Cuando hagas el pago en tu banco, anota aquí la referencia que te dio. Así se cierra la conciliación.</p>
        <div className="campo"><label htmlFor={`ref-${orden.factura_id}`}>Referencia del banco</label>
          <input id={`ref-${orden.factura_id}`} type="text" required maxLength={MAX_REFERENCIA} autoComplete="off" value={referencia} disabled={pendiente} onChange={e => setReferencia(e.target.value)} aria-describedby={ayuda} />
          <small id={ayuda}>Hasta {MAX_REFERENCIA} caracteres. Pulso no la comprueba con el banco.</small></div>
        <div className="acciones"><button className="btn btn-primario" disabled={pendiente || !refValida}><Ic nombre="check" size={24} />{pendiente ? 'Guardando…' : 'Marcar como pagada'}</button></div>
        {error ? <p className="aviso aviso-error" role="alert">{error}</p> : null}
      </form>}

    <details>
      <summary><Ic nombre="codigo" size={20} className="en-linea" />Orden en JSON</summary>
      <p>JSON es el formato técnico de estos datos. Es una propuesta: Blinka no publica una API.</p>
      <pre className="codigo">{JSON.stringify(orden, null, 2)}</pre>
    </details>
  </section>;
}
