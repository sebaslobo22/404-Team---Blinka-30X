'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Ic } from './ui/iconos';
import { RIESGO, type NombreIcono } from './ui/mapa-iconos';

export interface DatosPortada {
  total: number; pagar: number; frenar: number; escalar: number; pendientes: number; pct: number; bien: number;
  usd: { pagar: number; frenar: number; espera: number }; // centavos
  sinMonto: number; leidas: number;
  riesgos: { id: string; n: number }[]; motivoTop: { id: string; n: number } | null;
  /** Costo de leer todas las facturas, sumado de las lecturas grabadas (ya con formato). */
  costoLectura: string;
  /** Cuántas facturas llegaron en cada formato de documento. */
  formatos: { etiqueta: string; n: number }[];
}

const FRASE_MOTIVO: Record<string, [string, string]> = {
  R1: ['supera tu límite', 'superan tu límite'], R3: ['pasa tu tope del mes', 'pasan tu tope del mes'], R4: ['no tiene presupuesto', 'no tienen presupuesto'],
  R5: ['es un cobro repetido', 'son cobros repetidos'], R6: ['no cuadra con lo acordado', 'no cuadran con lo acordado'],
  R8: ['viene de una cuenta cambiada hace poco', 'vienen de cuentas cambiadas hace poco'], INYECCION: ['trae órdenes ocultas', 'traen órdenes ocultas'],
  CONFIANZA: ['se leyó con duda', 'se leyeron con duda'], R7: ['tiene datos incompletos', 'tienen datos incompletos'], R2: ['es de un proveedor fuera de tu lista', 'son de proveedores fuera de tu lista'],
};
const fraseMotivo = (id: string, n: number) => `${n} ${(FRASE_MOTIVO[id] ?? [RIESGO[id]?.etiqueta ?? id, RIESGO[id]?.etiqueta ?? id])[n === 1 ? 0 : 1]}`;

const usd = (c: number) => `USD ${Math.round(c / 100).toLocaleString('es-CO')}`;
const pctTxt = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 1 });

/** Número que cuenta hasta su valor al aparecer. Sin movimiento si se pide reducirlo; el valor final siempre está en el HTML. */
function useConteo(final: number): number {
  const [v, setV] = useState(final);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(final); return; }
    let r = 0; const t0 = performance.now(); setV(0);
    const paso = (t: number) => { const k = Math.min(1, (t - t0) / 700); setV(final * (1 - Math.pow(1 - k, 3))); if (k < 1) r = requestAnimationFrame(paso); };
    r = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(r);
  }, [final]);
  return v;
}
function Cuenta({ valor, formato }: { valor: number; formato: (n: number) => string }) { const v = useConteo(valor); return <span className="mono-num">{formato(v)}</span>; }

type Filtro = { decision?: string; regla?: string };
function filtrar(f: Filtro) {
  window.dispatchEvent(new CustomEvent('lista:filtrar', { detail: f }));
  const lista = document.getElementById('lista');
  lista?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}

export default function Portada({ d }: { d: DatosPortada }) {
  const segmentos = [
    { k: 'ESCALAR', n: d.escalar, palabra: 'Te necesitan', icono: 'campana' as NombreIcono, clase: 'escalar' },
    { k: 'FRENAR', n: d.frenar, palabra: 'Frenadas', icono: 'mano' as NombreIcono, clase: 'frenar' },
    { k: 'PAGAR', n: d.pagar, palabra: 'Pagadas', icono: 'check-circulo' as NombreIcono, clase: 'pagar' },
  ];
  let acumulado = 0;
  const dibujados = segmentos.map(s => { const p = d.total ? (s.n / d.total) * 100 : 0; const o = { ...s, p, inicio: acumulado }; acumulado += p; return o; });
  const dinero = [
    { k: 'pagar', palabra: 'Pagado solo', valor: d.usd.pagar, clase: 'pagar', icono: 'check-circulo' as NombreIcono },
    { k: 'frenar', palabra: 'Frenado: protegido', valor: d.usd.frenar, clase: 'frenar', icono: 'mano' as NombreIcono },
    { k: 'espera', palabra: 'Espera tu decisión', valor: d.usd.espera, clase: 'escalar', icono: 'campana' as NombreIcono },
  ];
  const motivo = d.motivoTop;
  return <section className="portada" aria-label="Resumen">
    <div className="tarjeta tarjeta-principal" data-tour="resumen">
      <p className="rotulo-ic"><Ic nombre="campana" size={24} />Te necesitan</p>
      <h2 className="cifra cifra-principal"><Cuenta valor={d.pendientes} formato={n => String(Math.round(n))} /> {d.pendientes === 1 ? 'factura' : 'facturas'} <span className="cifra-aparte">· {usd(d.usd.espera)} en juego</span></h2>
      {motivo ? <p className="con-ic motivo"><Ic nombre={RIESGO[motivo.id]?.icono ?? 'lista-check'} size={24} /><strong>{fraseMotivo(motivo.id, motivo.n)}</strong></p> : <p className="tenue">No hay nada esperando tu respuesta.</p>}
      {d.sinMonto ? <p className="tenue pequeno">No cuenta {d.sinMonto} {d.sinMonto === 1 ? 'cobro sin monto leído' : 'cobros sin monto leído'}.</p> : null}
      <Link className="btn btn-primario" href="/cola"><Ic nombre="cola" size={24} />Revisar ahora</Link>
    </div>

    <div className="par-grande">
      <div className="tarjeta" data-tour="autonomia">
        <p className="rotulo-ic"><Ic nombre="agente" size={24} />Decidido sin ti</p>
        <p className="cifra"><Cuenta valor={d.pct} formato={pctTxt} /> %</p>
        <div className="barra-fina" role="img" aria-label={`${pctTxt(d.pct)} por ciento decidido sin ti`}><span style={{ width: `${Math.min(100, d.pct)}%` }} /></div>
        <p className="cifra-etiqueta">Pagó o frenó por sí solo.</p>
      </div>
      <div className="tarjeta">
        <p className="rotulo-ic"><Ic nombre="escudo-check" size={24} />Te protegimos de pagar</p>
        <p className="cifra"><Cuenta valor={d.usd.frenar / 100} formato={n => `USD ${Math.round(n).toLocaleString('es-CO')}`} /></p>
        <p className="cifra-etiqueta">En {d.frenar} {d.frenar === 1 ? 'cobro frenado' : 'cobros frenados'}.</p>
      </div>
    </div>

    <div className="graficos">
      <div className="tarjeta">
        <h3 className="titulo-ic"><Ic nombre="decisiones" size={24} />Cómo se decidió</h3>
        <div className="anillo-fila">
          <svg className="anillo" viewBox="0 0 42 42" role="img" aria-label={`${d.total} facturas: ${d.pagar} pagadas, ${d.frenar} frenadas, ${d.escalar} te necesitan`}>
            <circle cx="21" cy="21" r="15.9155" className="anillo-fondo" />
            {dibujados.filter(s => s.n > 0).map(s => <circle key={s.k} cx="21" cy="21" r="15.9155" pathLength={100} className={`anillo-seg seg-${s.clase}`} strokeDasharray={`${Math.max(0.5, s.p - 1)} ${100 - Math.max(0.5, s.p - 1)}`} strokeDashoffset={-s.inicio} transform="rotate(-90 21 21)" onClick={() => filtrar({ decision: s.k })} />)}
            <text x="21" y="22.5" textAnchor="middle" className="anillo-num">{d.total}</text>
            <text x="21" y="27.5" textAnchor="middle" className="anillo-txt">facturas</text>
          </svg>
          <ul className="leyenda">{segmentos.map(s => <li key={s.k}><button type="button" className={`leyenda-bt ic-${s.clase}`} onClick={() => filtrar({ decision: s.k })}><Ic nombre={s.icono} size={24} /><span className="leyenda-txt"><strong>{s.palabra}</strong><span className="mono">{s.n}</span></span></button></li>)}</ul>
        </div>
      </div>
      <div className="tarjeta">
        <h3 className="titulo-ic"><Ic nombre="monedas" size={24} />Dinero en juego</h3>
        <div className="barra-dinero" role="img" aria-label={dinero.map(x => `${x.palabra}: ${usd(x.valor)}`).join('. ')}>{dinero.filter(x => x.valor > 0).map(x => <span key={x.k} className={`tramo tramo-${x.clase}`} style={{ flexGrow: x.valor }} />)}</div>
        <ul className="lista-dinero">{dinero.map(x => <li key={x.k} className={`ic-${x.clase}`}><Ic nombre={x.icono} size={24} /><span className="leyenda-txt"><strong>{x.palabra}</strong><span className="mono">{usd(x.valor)}</span></span></li>)}</ul>
      </div>
    </div>

    <ul className="kpis" aria-label="Datos clave">
      <li className="kpi ic-pagar"><Ic nombre="check-circulo" size={24} /><div><p className="kpi-etiqueta">Pagadas solas</p><p className="kpi-cifra mono">{d.pagar} · {usd(d.usd.pagar)}</p></div></li>
      <li className="kpi ic-frenar"><Ic nombre="mano" size={24} /><div><p className="kpi-etiqueta">Frenadas</p><p className="kpi-cifra mono">{d.frenar} · {usd(d.usd.frenar)}</p></div></li>
      <li className="kpi" data-tour="coincide"><Ic nombre="decisiones" size={24} /><div><p className="kpi-etiqueta">Coinciden con lo esperado</p><p className="kpi-cifra mono">{d.bien} de {d.total}</p><p className="kpi-nota">Aún falta probar con facturas nuevas.</p></div></li>
      <li className="kpi" data-costo-lectura><Ic nombre="monedas" size={24} /><div><p className="kpi-etiqueta">Costo de leer las {d.total}</p><p className="kpi-cifra mono">{d.costoLectura}</p><p className="kpi-nota">Dos modelos por factura. Suma de las lecturas grabadas.</p></div></li>
    </ul>

    <div className="tarjeta flujo-tarjeta">
      <h3 className="titulo-ic"><Ic nombre="flecha-salida" size={24} />Cómo decidió Pulso</h3>
      <ol className="flujo">
        <li><Ic nombre="documento" size={24} /><strong>Llegaron</strong><span className="mono">{d.total}</span>{d.formatos.length ? <small>{d.formatos.map(x => `${x.etiqueta} ${x.n}`).join(' · ')}</small> : null}</li>
        <li><Ic nombre="ojos" size={24} /><strong>Leímos</strong><span className="mono">{d.leidas}</span><small>con dos modelos, datos completos</small></li>
        <li><Ic nombre="reglas" size={24} /><strong>Revisamos reglas</strong><span className="mono">{d.total}</span></li>
        <li className="flujo-salidas"><ul>
          <li className="ic-pagar"><Ic nombre="check-circulo" size={24} /><strong>Pagamos</strong><span className="mono">{d.pagar}</span></li>
          <li className="ic-frenar"><Ic nombre="mano" size={24} /><strong>Frenamos</strong><span className="mono">{d.frenar}</span></li>
          <li className="ic-escalar"><Ic nombre="campana" size={24} /><strong>Te preguntamos</strong><span className="mono">{d.escalar}</span></li>
        </ul></li>
      </ol>
    </div>

    {d.riesgos.length ? <div>
      <h3 className="titulo-ic"><Ic nombre="escudo-alerta" size={24} />Riesgos detectados</h3>
      <ul className="fichas">{d.riesgos.map(r => { const info = RIESGO[r.id]; return <li key={r.id}><button type="button" className="ficha" onClick={() => filtrar({ regla: r.id })}><span className="ficha-ic"><Ic nombre={info?.icono ?? 'lista-check'} size={28} /></span><span className="ficha-txt"><strong>{info?.etiqueta ?? r.id}</strong><span className="mono">{r.n} {r.n === 1 ? 'factura' : 'facturas'}</span></span></button></li>; })}</ul>
    </div> : null}
  </section>;
}
