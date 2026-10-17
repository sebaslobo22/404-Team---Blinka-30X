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

const CAMPOS: { clave: Simple; etiqueta: string; paso: string; detalle: string; }[] = [
  { clave: 'limite_pago_usd', etiqueta: 'Límite por pago (USD)', paso: '1', detalle: 'Importe máximo permitido para un pago automático.' },
  { clave: 'tope_mensual_usd', etiqueta: 'Tope mensual por beneficiario (USD)', paso: '1', detalle: 'Acumulado máximo por beneficiario en el mes.' },
  { clave: 'ventana_duplicado_dias', etiqueta: 'Ventana de duplicados (días)', paso: '1', detalle: 'Periodo en el que se busca una factura repetida.' },
  { clave: 'tolerancia_pct', etiqueta: 'Tolerancia sobre lo acordado (porcentaje)', paso: '0.01', detalle: 'Margen permitido frente al importe acordado.' },
  { clave: 'ventana_cuenta_dias', etiqueta: 'Ventana de cambio de cuenta (días)', paso: '1', detalle: 'Tiempo de revisión tras registrar una cuenta.' },
];

interface Respuesta {
  ok?: boolean;
  error?: string;
  version?: string;
}

export default function Formulario({ inicial }: { inicial: Valores; }) {
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
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string; } | null>(null);

  /** Un campo vacío se envía como null para que el servidor lo rechace con su propio mensaje. */
  const num = (t: string): number | null => (t.trim() === '' ? null : Number(t));

  async function guardar(e: FormEvent) {
    e.preventDefault();
    if (ocupado) return;
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
    if (ocupado) return;
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
    <form onSubmit={guardar} aria-busy={ocupado}>

      <fieldset disabled={ocupado}>
        <legend>Límites y comprobaciones</legend>

        <div className="rejilla-2">
          {CAMPOS.map((c) => (
            <div className="campo" key={c.clave}>
              <label htmlFor={`campo-${c.clave}`}>{c.etiqueta}</label>
              <input
                id={`campo-${c.clave}`}
                name={c.clave}
                required
                min="0"
                type="number"
                inputMode="decimal"
                step={c.paso}
                aria-describedby={`ayuda-${c.clave}`}
                value={simples[c.clave]}
                onChange={(e) => setSimples({ ...simples, [c.clave]: e.target.value })}
              /><small className="tenue" id={`ayuda-${c.clave}`}>{c.detalle}</small>
            </div>
          ))}
        </div>
      </fieldset>
      <fieldset disabled={ocupado}>
        <legend>Presupuesto mensual por categoría (USD)</legend>
        <p className="tenue">Tope de gasto disponible para cada categoría.</p>

        <div className="rejilla-2">
          {Object.keys(presup).map((cat) => (
            <div className="campo" key={cat}>
              <label htmlFor={`presupuesto-${cat}`}>Presupuesto de {cat}</label>
              <input
                id={`presupuesto-${cat}`}
                name={`presupuesto-${cat}`}
                required
                min="0"
                type="number"
                inputMode="numeric"
                step="1"
                value={presup[cat] ?? ''}
                onChange={(e) => setPresup({ ...presup, [cat]: e.target.value })}
              />
            </div>
          ))}
        </div>
      </fieldset>

      <details>
        <summary>Resumen de cambios propuestos</summary>
        <p className="tenue">Compara parámetros; no simula decisiones. Guardar vuelve a evaluar el set de demostración y borra sus aprobaciones.</p>
        <ul>{CAMPOS.filter(c => Number(simples[c.clave]) !== inicial[c.clave]).map(c => <li key={c.clave}>{c.etiqueta}: {inicial[c.clave]} → {simples[c.clave] || "Vacío"}</li>)}{Object.keys(presup).filter(c => Number(presup[c]) !== inicial.presupuestos_usd[c]).map(c => <li key={c}>Presupuesto de {c}: {inicial.presupuestos_usd[c]} → {presup[c] || "Vacío"}</li>)}</ul>
        {CAMPOS.every(c => Number(simples[c.clave]) === inicial[c.clave]) && Object.keys(presup).every(c => Number(presup[c]) === inicial.presupuestos_usd[c]) ? <p>No hay cambios propuestos.</p> : null}</details>

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
