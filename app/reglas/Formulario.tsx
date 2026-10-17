'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ParametrosReglas } from '../../src/demo/parametros';
import { previsualizar } from './vista-previa';
import { estados } from '../ui/lenguaje';
import { Ic } from '../ui/iconos';
import { ICONO_DECISION, iconoDeRegla } from '../ui/mapa-iconos';
type Simple = Exclude<keyof ParametrosReglas, 'presupuestos_usd'>;
const REGLA_DE: Record<Simple, string> = { limite_pago_usd: 'R1', tope_mensual_usd: 'R3', ventana_duplicado_dias: 'R5', tolerancia_pct: 'R6', ventana_cuenta_dias: 'R8' };
const CAMPOS: { clave: Simple; frase: string; unidad: string; ayuda: string; min: number; max: number; step: number ;}[] = [
  { clave: 'limite_pago_usd', frase: 'Pídeme permiso si un pago supera', unidad: 'USD.', ayuda: 'Límite por pago: lo máximo que decide solo. Como un tope al comprar sin pedir permiso.', min: 1, max: 1000000, step: 1 },
  { clave: 'tope_mensual_usd', frase: 'Pídeme permiso si un proveedor supera en el mes', unidad: 'USD.', ayuda: 'Tope del mes: suma los pagos al mismo proveedor. Como sumar sus cobros en una libreta.', min: 1, max: 10000000, step: 1 },
  { clave: 'ventana_duplicado_dias', frase: 'Frena un cobro igual que ya llegó en los últimos', unidad: 'días.', ayuda: 'Cobro repetido: revisa si ya estaba. Como ver si ya pagaste los limones.', min: 0, max: 365, step: 1 },
  { clave: 'tolerancia_pct', frase: 'Pídeme permiso si el monto supera lo acordado en más de', unidad: '%.', ayuda: 'Margen permitido: cuánto puede variar el cobro. Si acordaste USD 100, 2 % permite USD 2 más.', min: 0, max: 50, step: .01 },
  { clave: 'ventana_cuenta_dias', frase: 'Pídeme permiso si la cuenta cambió en los últimos', unidad: 'días.', ayuda: 'Cuenta nueva: espera antes de usarla. Como confirmar un número antes de enviar dinero.', min: 0, max: 60, step: 1 },
];
export default function Formulario({ inicial }: { inicial: ParametrosReglas ;}) {
  const router = useRouter(); const candado = useRef(false);
  const [valores, setValores] = useState(() => Object.fromEntries(CAMPOS.map(c => [c.clave, String(inicial[c.clave])])) as Record<Simple, string>);
  const [presup, setPresup] = useState(() => Object.fromEntries(Object.entries(inicial.presupuestos_usd).map(([k, v]) => [k, String(v)])));
  const [ocupado, setOcupado] = useState(false); const [confirmar, setConfirmar] = useState(false); const [restaurar, setRestaurar] = useState(false); const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string ;} | null>(null);
  const [vista, setVista] = useState<Awaited<ReturnType<typeof previsualizar>> | null>(null);
  const num = (s: string) => s.trim() === '' ? null : Number(s);
  const cuerpo = { ...Object.fromEntries(CAMPOS.map(c => [c.clave, num(valores[c.clave])])), presupuestos_usd: Object.fromEntries(Object.entries(presup).map(([k, v]) => [k, num(v)])) };
  const firma = JSON.stringify(cuerpo);
  const cambios = CAMPOS.some(c => Number(valores[c.clave]) !== inicial[c.clave]) || Object.keys(presup).some(c => Number(presup[c]) !== inicial.presupuestos_usd[c]);
  useEffect(() => { setConfirmar(false); setVista(null); if (!cambios) return; let vigente = true; const t = setTimeout(() => { previsualizar(JSON.parse(firma)).then(r => { if (vigente) setVista(r); }).catch(() => { if (vigente) setVista({ ok: false, error: 'No se pudo revisar el cambio. Prueba de nuevo.' }); }); }, 300); return () => { vigente = false; clearTimeout(t); }; }, [firma, cambios]);
  async function guardar() { if (candado.current) return; candado.current = true; setOcupado(true); setMensaje(null); try { const r = await fetch('/api/reglas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: firma }); const d = await r.json(); if (!r.ok || !d.ok) throw new Error(d.error); setMensaje({ ok: true, texto: `Cambios guardados. Nueva versión: ${d.version}.` }); setConfirmar(false); router.refresh(); } catch { setMensaje({ ok: false, texto: 'No se guardaron los cambios. Revisa los campos y prueba de nuevo.' }); } finally { candado.current = false; setOcupado(false); } }
  async function restablecer() { if (candado.current) return; candado.current = true; setOcupado(true); try { const r = await fetch('/api/reglas', { method: 'DELETE' }); const d = await r.json(); if (!r.ok || !d.ok) throw new Error(); window.location.reload(); } catch { setMensaje({ ok: false, texto: 'No se pudo volver a las reglas iniciales. Prueba de nuevo.' }); candado.current = false; setOcupado(false); } }
  function campo(c: typeof CAMPOS[number]) { return <div className="regla-frase" key={c.clave}><span className="ic-col"><Ic nombre={iconoDeRegla(REGLA_DE[c.clave])} size={28} /></span><div><label htmlFor={`campo-${c.clave}`}>{c.frase} <input id={`campo-${c.clave}`} name={c.clave} type="number" required min={c.min} max={c.max} step={c.step} value={valores[c.clave]} onChange={e => setValores(prev => ({ ...prev, [c.clave]: e.target.value }))} aria-describedby={`ayuda-${c.clave}`} disabled={ocupado} /> {c.unidad}</label><small id={`ayuda-${c.clave}`}>{c.ayuda}</small></div></div>; }
  return <form aria-busy={ocupado} onSubmit={e => { e.preventDefault(); if (confirmar) void guardar(); else setConfirmar(true); }}>

    <fieldset disabled={ocupado}>
      <legend className="titulo-ic"><Ic nombre="monedas" size={28} />Cuánto puedo pagar</legend>
      {CAMPOS.slice(0, 2).map(campo)}
      <details>
        <summary><Ic nombre="billetera" size={20} className="en-linea" />Ver más límites de gasto</summary>
        <p>Dinero por tipo de gasto: cuánto puedes usar cada mes. Como separar sobres para cada compra.</p>
        {Object.keys(presup).map(cat => <div className="regla-frase" key={cat}><span className="ic-col"><Ic nombre="billetera" size={28} /></span><div><label htmlFor={`presupuesto-${cat}`}>Frena si gasto más de <input id={`presupuesto-${cat}`} name={`presupuesto-${cat}`} type="number" min={0} max={10000000} step={1} required value={presup[cat]} onChange={e => setPresup(prev => ({ ...prev, [cat]: e.target.value }))} /> USD en {cat}.</label></div></div>)}</details>
    </fieldset>

    <fieldset>
      <legend className="titulo-ic"><Ic nombre="edificio" size={28} />A quién le pago</legend>
      <p>Solo a proveedores de tu lista. Deben coincidir su número fiscal y su cuenta bancaria.</p>
      <p className="tenue">Proveedor: quien te vende algo. Como la persona que te trae los limones.</p>
      <details>
        <summary>Cómo se cambia esta lista</summary>
        <p>Esta pantalla aún no permite cambiar la lista. Conserva los proveedores que ya definió la empresa.</p>
      </details>
    </fieldset>

    <fieldset disabled={ocupado}>
      <legend className="titulo-ic"><Ic nombre="lista-check" size={28} />Qué reviso de cada factura</legend>
      {CAMPOS.slice(2).map(campo)}</fieldset>
    {cambios ? <section className="tarjeta" aria-live="polite" data-preview>
      <h2 className="titulo-ic"><Ic nombre="ojo" size={28} />Así cambiarían tus facturas</h2>
      {!vista ? <p>Revisando el cambio, sin guardar…</p> : !vista.ok ? <p role="alert">{vista.error}</p> : vista.cambios.length ? <>
        <p>{vista.cambios.length} facturas cambian de estado en esta prueba.</p>
        <ul className="lista-simple">{vista.cambios.slice(0, 7).map(c => <li key={c.id} className="con-ic"><Ic nombre={ICONO_DECISION[c.antes]} size={20} />{c.id}: {estados[c.antes].etiqueta} → <Ic nombre={ICONO_DECISION[c.despues]} size={20} />{estados[c.despues].etiqueta}</li>)}</ul>
        {vista.cambios.length > 7 ? <details>
          <summary>Ver más cambios</summary>
          <ul>{vista.cambios.slice(7).map(c => <li key={c.id}>{c.id}: {estados[c.antes].etiqueta} → {estados[c.despues].etiqueta}</li>)}</ul>
        </details> : null}</> : <p>No cambia ninguna decisión de esta prueba.</p>}
      <p className="tenue">Se usan las mismas reglas del agente. No se ha guardado nada.</p>
    </section> : <p>No hay cambios por guardar.</p>}
    {confirmar ? <div className="aviso">
      <p>Guardar vuelve a revisar todas las facturas. Borra las respuestas dadas en esta sesión.</p>
      <div className="acciones"><button className="btn btn-primario" disabled={ocupado}>{ocupado ? 'Guardando…' : 'Sí, guardar estas reglas'}</button><button className="btn btn-texto" type="button" disabled={ocupado} onClick={() => setConfirmar(false)}>Seguir revisando</button></div>
    </div> : <button className="btn btn-primario" disabled={ocupado || !cambios || !vista?.ok}><Ic nombre="check" size={24} />Guardar cambios</button>}

    <details>
      <summary><Ic nombre="deshacer" size={20} className="en-linea" />Volver a las reglas iniciales</summary>
      <p>Esto borra tus cambios y las respuestas de la sesión.</p>
      {restaurar ? <button type="button" className="btn" disabled={ocupado} onClick={restablecer}>Sí, volver a las reglas iniciales</button> : <button type="button" className="btn btn-texto" onClick={() => setRestaurar(true)}>Quiero volver a las reglas iniciales</button>}</details>

    <div aria-live="polite">{mensaje ? <p className={`aviso ${mensaje.ok ? 'aviso-ok' : 'aviso-error'}`} role={mensaje.ok ? 'status' : 'alert'}>{mensaje.texto}</p> : null}</div>
  </form>;
}
