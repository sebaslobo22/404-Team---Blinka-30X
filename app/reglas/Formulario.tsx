'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';

interface Valores {
  limite_pago_usd: number;
  tope_mensual_usd: number;
  ventana_duplicado_dias: number;
  tolerancia_pct: number;
  ventana_cuenta_dias: number;
  presupuestos_usd: Record<string, number>;
}

type Simple = Exclude<keyof Valores, 'presupuestos_usd'>;

const CAMPOS: { clave: Simple; etiqueta: string; paso: string }[] = [
  { clave: 'limite_pago_usd', etiqueta: 'Límite por pago (USD)', paso: '1' },
  { clave: 'tope_mensual_usd', etiqueta: 'Tope mensual por beneficiario (USD)', paso: '1' },
  { clave: 'ventana_duplicado_dias', etiqueta: 'Ventana de duplicados (días)', paso: '1' },
  { clave: 'tolerancia_pct', etiqueta: 'Tolerancia sobre lo acordado (porcentaje)', paso: '0.01' },
  { clave: 'ventana_cuenta_dias', etiqueta: 'Ventana de cambio de cuenta (días)', paso: '1' },
];

interface Respuesta {
  ok?: boolean;
  error?: string;
  version?: string;
}

export default function Formulario({ inicial }: { inicial: Valores }) {
  const router = useRouter();
  const [simples, setSimples] = useState<Record<Simple, string>>({
    limite_pago_usd: String(inicial.limite_pago_usd),
    tope_mensual_usd: String(inicial.tope_mensual_usd),
    ventana_duplicado_dias: String(inicial.ventana_duplicado_dias),
    tolerancia_pct: String(inicial.tolerancia_pct),
    ventana_cuenta_dias: String(inicial.ventana_cuenta_dias),
  });
  const [presup, setPresup] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(inicial.presupuestos_usd).map(([c, v]) => [c, String(v)])),
  );
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  /** Un campo vacío se envía como null para que el servidor lo rechace con su propio mensaje. */
  const num = (t: string): number | null => (t.trim() === '' ? null : Number(t));

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setOcupado(true);
    setMensaje(null);
    const cuerpo = {
      limite_pago_usd: num(simples.limite_pago_usd),
      tope_mensual_usd: num(simples.tope_mensual_usd),
      ventana_duplicado_dias: num(simples.ventana_duplicado_dias),
      tolerancia_pct: num(simples.tolerancia_pct),
      ventana_cuenta_dias: num(simples.ventana_cuenta_dias),
      presupuestos_usd: Object.fromEntries(Object.entries(presup).map(([c, t]) => [c, num(t)])),
    };
    try {
      const r = await fetch('/api/reglas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
      const d: Respuesta = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) setMensaje({ tipo: 'error', texto: d.error ?? 'No se pudieron guardar las reglas.' });
      else {
        setMensaje({ tipo: 'ok', texto: `Reglas guardadas. Versión vigente: ${d.version}.` });
        router.refresh();
      }
    } catch {
      setMensaje({ tipo: 'error', texto: 'No se pudo contactar con el servidor.' });
    }
    setOcupado(false);
  }

  async function restablecer() {
    setOcupado(true);
    setMensaje(null);
    try {
      const r = await fetch('/api/reglas', { method: 'DELETE' });
      const d: Respuesta = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) setMensaje({ tipo: 'error', texto: d.error ?? 'No se pudieron restablecer las reglas.' });
      else {
        // Recarga completa para que el formulario vuelva a leer los valores por defecto del servidor.
        window.location.reload();
        return;
      }
    } catch {
      setMensaje({ tipo: 'error', texto: 'No se pudo contactar con el servidor.' });
    }
    setOcupado(false);
  }

  return (
    <form onSubmit={guardar} noValidate>
      <div className="rejilla-2">
        {CAMPOS.map((c) => (
          <div className="campo" key={c.clave}>
            <label htmlFor={`campo-${c.clave}`}>{c.etiqueta}</label>
            <input
              id={`campo-${c.clave}`}
              name={c.clave}
              type="number"
              inputMode="decimal"
              step={c.paso}
              value={simples[c.clave]}
              onChange={(e) => setSimples({ ...simples, [c.clave]: e.target.value })}
            />
          </div>
        ))}
      </div>
      <h2>Presupuesto mensual por categoría (USD)</h2>
      <div className="rejilla-2">
        {Object.keys(presup).map((cat) => (
          <div className="campo" key={cat}>
            <label htmlFor={`presupuesto-${cat}`}>Presupuesto de {cat}</label>
            <input
              id={`presupuesto-${cat}`}
              name={`presupuesto-${cat}`}
              type="number"
              inputMode="numeric"
              step="1"
              value={presup[cat] ?? ''}
              onChange={(e) => setPresup({ ...presup, [cat]: e.target.value })}
            />
          </div>
        ))}
      </div>
      <div className="acciones" style={{ marginTop: 14 }}>
        <button type="submit" className="btn btn-primario" disabled={ocupado}>
          {ocupado ? 'Procesando…' : 'Guardar y volver a evaluar'}
        </button>
        <button type="button" className="btn" disabled={ocupado} onClick={restablecer}>
          Restablecer valores
        </button>
      </div>
      <div aria-live="polite" style={{ marginTop: 10 }}>
        {mensaje ? (
          <p className={mensaje.tipo === 'ok' ? 'aviso aviso-ok' : 'aviso aviso-error'} role={mensaje.tipo === 'error' ? 'alert' : 'status'}>
            {mensaje.texto}
          </p>
        ) : null}
      </div>
    </form>
  );
}
