'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Accion = 'APROBAR' | 'RECHAZAR';

export default function Acciones({ facturaId }: { facturaId: string }) {
  const router = useRouter();
  const [enCurso, setEnCurso] = useState<Accion | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function enviar(accion: Accion) {
    setEnCurso(accion);
    setError(null);
    try {
      const r = await fetch('/api/aprobaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factura_id: facturaId, accion }),
      });
      const datos: { ok?: boolean; error?: string } = await r.json().catch(() => ({}));
      if (!r.ok || !datos.ok) {
        setError(datos.error ?? 'No se pudo registrar la resolución.');
        setEnCurso(null);
        return;
      }
      router.refresh();
    } catch {
      setError('No se pudo contactar con el servidor.');
    }
    setEnCurso(null);
  }

  const ocupado = enCurso !== null;
  return (
    <div>
      <div className="acciones">
        <button type="button" className="btn btn-primario" disabled={ocupado} onClick={() => enviar('APROBAR')}>
          {enCurso === 'APROBAR' ? 'Aprobando…' : 'Aprobar'}
        </button>
        <button type="button" className="btn btn-peligro" disabled={ocupado} onClick={() => enviar('RECHAZAR')}>
          {enCurso === 'RECHAZAR' ? 'Rechazando…' : 'Rechazar'}
        </button>
      </div>
      <div aria-live="polite">
        {error ? (
          <p className="aviso aviso-error" role="alert" style={{ marginTop: 8 }}>
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
