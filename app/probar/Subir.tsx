'use client';
import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { FilaTraza } from '../../src/demo/traza';
import { Estado, Razones } from '../ui/Sistema';
import { dinero } from '../ui/lenguaje';
import { Ic } from '../ui/iconos';
import { etiquetaDeAlerta } from '../ui/mapa-iconos';

interface Respuesta {
  ok: boolean;
  error?: string;
  id?: string;
  restantes?: number;
  factura?: { numero_factura: string | null; beneficiario: string | null; id_fiscal: string | null; cuenta: string | null; monto_centavos: number | null; moneda: string | null; fecha_emision: string | null; alertas?: string[] };
  resultado?: { decision: 'PAGAR' | 'FRENAR' | 'ESCALAR'; explicacion: string; hechos: Record<string, unknown> };
  traza?: FilaTraza[];
  modelos?: { pedido: string; servido: string | null; ok: boolean }[];
  ms?: number;
}

const FILA_VIVO: FilaTraza = { id: 'EN_VIVO', estado: 'ESCALAR', cifra: 'Entrada en vivo' };
const nombreModelo = (m: string) => (m.startsWith('anthropic/') ? 'Claude' : m.startsWith('google/') ? 'Gemini' : m);

export default function Subir() {
  const entrada = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [r, setR] = useState<Respuesta | null>(null);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const archivo = entrada.current?.files?.[0];
    if (!archivo) { setR({ ok: false, error: 'Elige una foto o un PDF de la factura.' }); return; }
    setEnviando(true); setR(null);
    try {
      const form = new FormData(); form.append('factura', archivo);
      const res = await fetch('/api/vivo', { method: 'POST', body: form });
      const j = (await res.json().catch(() => ({ ok: false, error: 'Respuesta inválida del servidor.' }))) as Respuesta;
      setR(j);
    } catch {
      setR({ ok: false, error: 'No hubo conexión con el servidor. No se tomó ninguna decisión.' });
    } finally { setEnviando(false); }
  }

  const f = r?.factura; const d = r?.resultado;
  const sinLectura = (r?.modelos ?? []).length > 0 && (r?.modelos ?? []).every((m) => !m.ok);
  return <>
    <form className="tarjeta" onSubmit={enviar} aria-busy={enviando}>
      <h2 className="titulo-ic"><Ic nombre="imagen" size={28} />Tu factura</h2>
      <p>Toma una foto con el teléfono o elige un PDF. Máximo 4 MB.</p>
      <input ref={entrada} type="file" name="factura" accept="image/jpeg,image/png,application/pdf" aria-label="Foto o PDF de la factura" />
      <p><button className="btn btn-primario" type="submit" disabled={enviando}><Ic nombre="ojos" size={20} />{enviando ? 'Leyendo con dos modelos…' : 'Leer y decidir'}</button></p>
      <p className="tenue pequeno">Usa una factura de prueba, sin datos personales. Para leerla, se envía a dos modelos de IA (Claude y Gemini, por OpenRouter). Pulso no guarda el archivo y esta factura no entra al registro de la demo.</p>
    </form>

    {r && !r.ok ? <p className="tarjeta" role="alert"><Ic nombre="triangulo-alerta" size={24} className="en-linea" />{r.error ?? 'No se pudo leer la factura.'}</p> : null}

    {r?.ok && d && f ? <section aria-live="polite">
      <section className="panel-decision"><Estado decision={d.decision} />
        <p className="veredicto-frase">{d.decision === 'FRENAR' ? 'Pulso no la pagaría.' : sinLectura ? 'No pudimos leerla. Sin datos, Pulso no decide solo: iría a tu aprobación.' : 'Iría a tu aprobación.'}</p>
        <p>{d.hechos['techo_en_vivo'] === true ? 'Cumple las reglas de la empresa.' : d.explicacion.replace(/^(PAGAR|FRENAR|ESCALAR):\s*/, '')}</p>
        {d.hechos['techo_en_vivo'] === true ? <p className="tenue">Con tus reglas habría salido PAGAR. Como entró en vivo, la revisa una persona.</p> : null}
        <p className="tenue pequeno">En esta demo, lo que entra en vivo no genera orden de pago.</p>
      </section>

      <section className="tarjeta">
        <h2 className="titulo-ic"><Ic nombre="tabla" size={28} />Lo que leyó</h2>
        <dl className="datos-leidos">
          <dt>Proveedor</dt><dd>{f.beneficiario ?? 'Sin leer'}</dd>
          <dt>Número fiscal</dt><dd className="mono">{f.id_fiscal ?? 'Sin leer'}</dd>
          <dt>Cuenta bancaria</dt><dd className="mono">{f.cuenta ?? 'Sin leer'}</dd>
          <dt>Monto</dt><dd className="mono">{dinero(f.monto_centavos, f.moneda)}</dd>
          <dt>Fecha</dt><dd>{f.fecha_emision ?? 'Sin leer'}</dd>
          <dt>Factura</dt><dd className="mono">{f.numero_factura ?? 'Sin leer'}</dd>
        </dl>
        <p className="tenue pequeno">{(r.modelos ?? []).map((m) => `${nombreModelo(m.pedido)}: ${m.ok ? 'leyó' : 'no pudo leer'}`).join(' · ')}{typeof r.ms === 'number' ? ` · ${(r.ms / 1000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} s` : ''}</p>
        {f.alertas && f.alertas.length ? <ul>{[...new Set(f.alertas.map(etiquetaDeAlerta))].map((t) => <li key={t}>{t}</li>)}</ul> : null}
      </section>

      <details open>
        <summary><Ic nombre="pregunta" size={24} className="en-linea" />¿Por qué? Las razones</summary>
        <Razones filas={[FILA_VIVO, ...(r.traza ?? [])]} />
      </details>
      <p className="tenue pequeno">Las reglas son las de Aurora Cloud, la empresa ficticia de la demo. Un proveedor que no está en su lista se frena: Pulso no le paga a desconocidos.{typeof r.restantes === 'number' ? ` Te quedan ${r.restantes} pruebas en esta hora.` : ''}</p>
    </section> : null}
  </>;
}
