'use client';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { Ic } from '../ui/iconos';
export default function Controles({ n }: { n: number ;}) {
  const router = useRouter(); const [verificando, iniciar] = useTransition(); const [ocupado, setOcupado] = useState(false); const [indice, setIndice] = useState('0'); const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string ;} | null>(null); const [confirmar, setConfirmar] = useState<'restaurar' | 'manipular' | null>(null); const candado = useRef(false);
  async function llamar(url: string, cuerpo: unknown, texto: string) { if (candado.current) return; candado.current = true; setOcupado(true); setMensaje(null); try { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) }); const d = await r.json(); if (!r.ok || !d.ok) throw new Error(); setMensaje({ ok: true, texto }); setConfirmar(null); router.refresh(); } catch { setMensaje({ ok: false, texto: 'No se pudo hacer la prueba. Revisa la conexión e intenta de nuevo.' }); } finally { setOcupado(false); candado.current = false; } }
  return <>
    <div className="acciones"><button className="btn btn-primario" disabled={ocupado || verificando} onClick={() => iniciar(() => router.refresh())}><Ic nombre="escudo-check" size={24} />{verificando ? 'Comprobando…' : 'Comprobar ahora'}</button></div>
    <details>
      <summary><Ic nombre="tarea" size={20} className="en-linea" />Pruebas de integridad</summary>
      <p>Estas acciones cambian solo la sesión de prueba.</p>
      <div className="campo"><label htmlFor="indice-manipular">Qué entrada quieres probar</label><select id="indice-manipular" value={indice} onChange={e => setIndice(e.target.value)} disabled={ocupado}>{Array.from({ length: n }, (_, i) => <option key={i} value={i}>Entrada {i + 1}</option>)}</select></div>
      <div className="acciones"><button className="btn btn-texto" disabled={ocupado} onClick={() => setConfirmar('manipular')}><Ic nombre="triangulo-alerta" size={20} />Probar un cambio no autorizado</button><button className="btn btn-texto" disabled={ocupado} onClick={() => setConfirmar('restaurar')}><Ic nombre="deshacer" size={20} />Volver al estado inicial</button></div>
      {confirmar ? <div className="aviso">
        <p>{confirmar === 'restaurar' ? 'Se borran los cambios y respuestas de esta sesión.' : 'Se cambia un dato para comprobar si el registro lo detecta.'}</p>
        <button className="btn" disabled={ocupado} onClick={() => confirmar === 'restaurar' ? llamar('/api/demo/restaurar', {}, 'Todo volvió al estado inicial.') : llamar('/api/demo/manipular', { indice: Number(indice) }, 'Se cambió la entrada. Comprueba el registro para ver el fallo.')}>{ocupado ? 'Guardando…' : 'Sí, hacer esta prueba'}</button><button className="btn btn-texto" disabled={ocupado} onClick={() => setConfirmar(null)}>Cancelar</button></div> : null}{mensaje ? <p className={`aviso ${mensaje.ok ? 'aviso-ok' : 'aviso-error'}`} role={mensaje.ok ? 'status' : 'alert'}>{mensaje.texto}</p> : null}</details>
  </>;
}
