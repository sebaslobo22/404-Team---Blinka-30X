'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

export default function Controles({ n }: { n: number }) {
  const router = useRouter();
  const [verificando, iniciarVerificacion] = useTransition();
  const [indice, setIndice] = useState('0');
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  async function llamar(url: string, cuerpo: unknown, exito: string) {
    setOcupado(true);
    setMensaje(null);
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
      const d: { ok?: boolean; error?: string } = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) setMensaje({ tipo: 'error', texto: d.error ?? 'La operación falló.' });
      else {
        setMensaje({ tipo: 'ok', texto: exito });
        router.refresh();
      }
    } catch {
      setMensaje({ tipo: 'error', texto: 'No se pudo contactar con el servidor.' });
    }
    setOcupado(false);
  }

  return (
    <div className="tarjeta" data-tour="registro-verificar">
      <div className="acciones">
        <button type="button" className="btn btn-primario" disabled={ocupado || verificando} onClick={() => iniciarVerificacion(() => router.refresh())}>
          {verificando ? 'Verificando…' : 'Verificar cadena'}
        </button>
      </div><details><summary>Controles de la demo</summary><div className="acciones"><button
          type="button"
          className="btn"
          disabled={ocupado}
          onClick={() => llamar('/api/demo/restaurar', {}, 'Demo restaurada: el registro se reconstruyó con los parámetros por defecto.')}
        >
          Restaurar demo
        </button>
      </div>
      <div className="acciones" style={{ marginTop: 12, alignItems: 'flex-end' }}>
        <div className="campo" style={{ maxWidth: 220 }}>
          <label htmlFor="indice-manipular">Entrada a alterar</label>
          <select id="indice-manipular" value={indice} onChange={(e) => setIndice(e.target.value)} disabled={ocupado}>
            {Array.from({ length: n }, (_, i) => (
              <option key={i} value={String(i)}>
                Entrada {i}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="btn btn-peligro"
          disabled={ocupado}
          onClick={() => llamar('/api/demo/manipular', { indice: Number(indice) }, `Se alteró la entrada ${indice}. La verificación debería fallar.`)}
        >
          Simular una manipulación
        </button>
      </div>
      <p className="tenue" style={{ fontSize: 'var(--t2)', marginTop: 10 }}>
        La simulación cambia la decisión guardada en la entrada elegida, sin recalcular su hash. Sirve solo para ver que la alteración se detecta.
      </p>
      </details><div aria-live="polite">
        {mensaje ? (
          <p className={mensaje.tipo === 'ok' ? 'aviso aviso-ok' : 'aviso aviso-error'} role={mensaje.tipo === 'error' ? 'alert' : 'status'} style={{ marginTop: 8 }}>
            {mensaje.texto}
          </p>
        ) : null}
      </div>
    </div>
  );
}
