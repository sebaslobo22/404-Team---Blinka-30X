'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Ic } from './ui/iconos';
import { RIESGO, type NombreIcono } from './ui/mapa-iconos';
import Tarjeta, { AyudaBoton } from './ui/Tarjeta';

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
    { k: 'ESCALAR', n: d.escalar, palabra: 'Te necesitan', icono: 'campana' as NombreIcono, clase: 'escalar', ayuda: 'te-necesitan' },
    { k: 'FRENAR', n: d.frenar, palabra: 'Frenadas', icono: 'mano' as NombreIcono, clase: 'frenar', ayuda: 'frenadas' },
    { k: 'PAGAR', n: d.pagar, palabra: 'Pagadas', icono: 'check-circulo' as NombreIcono, clase: 'pagar', ayuda: 'pagadas' },
  ];
  let acumulado = 0;
  const dibujados = segmentos.map(s => { const p = d.total ? (s.n / d.total) * 100 : 0; const o = { ...s, p, inicio: acumulado }; acumulado += p; return o; });
  const dinero = [
    { k: 'pagar', palabra: 'Pagado solo', valor: d.usd.pagar, clase: 'pagar', icono: 'check-circulo' as NombreIcono, ayuda: 'pagado-solo' },
    { k: 'frenar', palabra: 'Frenado: protegido', valor: d.usd.frenar, clase: 'frenar', icono: 'mano' as NombreIcono, ayuda: 'frenado-protegido' },
    { k: 'espera', palabra: 'Espera tu decisión', valor: d.usd.espera, clase: 'escalar', icono: 'campana' as NombreIcono, ayuda: 'espera-decision' },
  ];
  const motivo = d.motivoTop;
  return <section className="portada" aria-label="Resumen">
    <Tarjeta variante="base" icono="campana" tono="escalar" titulo="Te necesitan" ayuda="te-necesitan" grande className="tarjeta-principal" datos={{ 'data-tour': 'resumen' }}
      cifra={<><Cuenta valor={d.pendientes} formato={n => String(Math.round(n))} /> {d.pendientes === 1 ? 'factura' : 'facturas'} <span className="cifra-aparte">· {usd(d.usd.espera)} en juego</span></>}>
      {motivo ? <p className="con-ic motivo"><Ic nombre={RIESGO[motivo.id]?.icono ?? 'lista-check'} size={24} /><strong>{fraseMotivo(motivo.id, motivo.n)}</strong></p> : <p className="tenue">No hay nada esperando tu respuesta.</p>}
      {d.sinMonto ? <p className="tenue pequeno">No cuenta {d.sinMonto} {d.sinMonto === 1 ? 'cobro sin monto leído' : 'cobros sin monto leído'}.</p> : null}
      <Link className="btn btn-primario" href="/cola"><Ic nombre="cola" size={24} />Revisar ahora</Link>
    </Tarjeta>

    <div className="rejilla-tarjetas rejilla-2c">
      <Tarjeta variante="base" icono="agente" titulo="Decidido sin ti" ayuda="decidido-sin-ti" grande datos={{ 'data-tour': 'autonomia' }}
        cifra={<><Cuenta valor={d.pct} formato={pctTxt} /> %</>}
        apoyo="Pagó o frenó por sí solo.">
        <div className="barra-fina" role="img" aria-label={`${pctTxt(d.pct)} por ciento decidido sin ti`}><span style={{ width: `${Math.min(100, d.pct)}%` }} /></div>
      </Tarjeta>
      <Tarjeta variante="base" icono="escudo-check" titulo="Te protegimos de pagar" ayuda="protegimos" grande
        cifra={<Cuenta valor={d.usd.frenar / 100} formato={n => `USD ${Math.round(n).toLocaleString('es-CO')}`} />}
        apoyo={`En ${d.frenar} ${d.frenar === 1 ? 'cobro frenado' : 'cobros frenados'}.`} />
    </div>

    <div className="rejilla-tarjetas rejilla-2c">
      <Tarjeta variante="base" encabezado icono="decisiones" titulo="Cómo se decidió" ayuda="anillo">
        <div className="anillo-fila">
          <svg className="anillo" viewBox="0 0 42 42" role="img" aria-label={`${d.total} facturas: ${d.pagar} pagadas, ${d.frenar} frenadas, ${d.escalar} te necesitan`}>
            <circle cx="21" cy="21" r="15.9155" className="anillo-fondo" />
            {dibujados.filter(s => s.n > 0).map(s => <circle key={s.k} cx="21" cy="21" r="15.9155" pathLength={100} className={`anillo-seg seg-${s.clase}`} strokeDasharray={`${Math.max(0.5, s.p - 1)} ${100 - Math.max(0.5, s.p - 1)}`} strokeDashoffset={-s.inicio} transform="rotate(-90 21 21)" onClick={() => filtrar({ decision: s.k })} />)}
            <text x="21" y="22.5" textAnchor="middle" className="anillo-num">{d.total}</text>
            <text x="21" y="27.5" textAnchor="middle" className="anillo-txt">facturas</text>
          </svg>
          <ul className="leyenda">{segmentos.map(s => <li key={s.k} className="fila-ayuda" data-ayuda-ancla=""><button type="button" className="leyenda-bt" onClick={() => filtrar({ decision: s.k })}><Ic nombre={s.icono} size={24} className={`ic-${s.clase}`} /><span className="leyenda-txt"><strong>{s.palabra}</strong><span className="mono">{s.n}</span></span></button><AyudaBoton clave={s.ayuda} modo="fila" /></li>)}</ul>
        </div>
      </Tarjeta>
      <Tarjeta variante="base" encabezado icono="monedas" titulo="Dinero en juego" ayuda="dinero">
        <div className="barra-dinero" role="img" aria-label={dinero.map(x => `${x.palabra}: ${usd(x.valor)}`).join('. ')}>{dinero.filter(x => x.valor > 0).map(x => <span key={x.k} className={`tramo tramo-${x.clase}`} style={{ flexGrow: x.valor }} />)}</div>
        <ul className="lista-dinero">{dinero.map(x => <li key={x.k} className="fila-ayuda" data-ayuda-ancla=""><Ic nombre={x.icono} size={24} className={`ic-${x.clase}`} /><span className="leyenda-txt"><strong>{x.palabra}</strong><span className="mono">{usd(x.valor)}</span></span><AyudaBoton clave={x.ayuda} modo="fila" /></li>)}</ul>
      </Tarjeta>
    </div>

    <ul className="rejilla-tarjetas rejilla-indicadores" aria-label="Datos clave">
      <li><Tarjeta variante="indicador" icono="check-circulo" tono="pagar" titulo="Pagadas solas" ayuda="pagadas-solas" cifra={`${d.pagar} · ${usd(d.usd.pagar)}`} apoyo="Cumplieron todas tus reglas." /></li>
      <li><Tarjeta variante="indicador" icono="mano" tono="frenar" titulo="Frenadas" ayuda="frenadas" cifra={`${d.frenar} · ${usd(d.usd.frenar)}`} apoyo="Rompen una regla de tu empresa." /></li>
      <li><Tarjeta variante="indicador" icono="decisiones" titulo="Coinciden con lo esperado" ayuda="coinciden" cifra={`${d.bien} de ${d.total}`} apoyo="Aún falta probar con facturas nuevas." datos={{ 'data-tour': 'coincide' }} /></li>
      <li><Tarjeta variante="indicador" icono="monedas" titulo={`Costo de leer las ${d.total}`} ayuda="costo-lectura" cifra={d.costoLectura} apoyo="Dos modelos por factura. Suma de las lecturas grabadas." datos={{ 'data-costo-lectura': true }} /></li>
    </ul>

    <section aria-labelledby="titulo-flujo">
      <h3 className="titulo-ic" id="titulo-flujo"><Ic nombre="flecha-salida" size={24} />Cómo decidió Pulso</h3>
      <ol className="rejilla-tarjetas rejilla-etapas">
        <li><Tarjeta variante="etapa" icono="documento" titulo="Llegaron" ayuda="llegaron" cifra={d.total} apoyo={d.formatos.length ? d.formatos.map(x => `${x.etiqueta} ${x.n}`).join(' · ') : undefined} /></li>
        <li><Tarjeta variante="etapa" icono="ojos" titulo="Leímos" ayuda="leimos" cifra={d.leidas} apoyo="Con dos modelos, datos completos." /></li>
        <li><Tarjeta variante="etapa" icono="reglas" titulo="Revisamos reglas" ayuda="reglas" cifra={d.total} apoyo="Una por una, siempre igual." /></li>
        <li><Tarjeta variante="etapa" icono="check-circulo" tono="pagar" titulo="Pagamos" ayuda="pagamos" cifra={d.pagar} apoyo="Con pago autorizado." /></li>
        <li><Tarjeta variante="etapa" icono="mano" tono="frenar" titulo="Frenamos" ayuda="frenamos" cifra={d.frenar} apoyo="No se pueden aprobar." /></li>
        <li><Tarjeta variante="etapa" icono="campana" tono="escalar" titulo="Te preguntamos" ayuda="preguntamos" cifra={d.escalar} apoyo="Esperan tu respuesta." /></li>
      </ol>
    </section>

    {d.riesgos.length ? <section aria-labelledby="titulo-riesgos">
      <h3 className="titulo-ic" id="titulo-riesgos"><Ic nombre="escudo-alerta" size={24} />Riesgos detectados</h3>
      <ul className="rejilla-tarjetas rejilla-riesgos">{d.riesgos.map(r => { const info = RIESGO[r.id]; return <li key={r.id}><Tarjeta variante="riesgo" icono={info?.icono ?? 'lista-check'} titulo={info?.etiqueta ?? r.id} ayuda={`riesgo-${r.id}`} cifra={`${r.n} ${r.n === 1 ? 'factura' : 'facturas'}`} alPulsar={() => filtrar({ regla: r.id })} /></li>; })}</ul>
    </section> : null}
  </section>;
}
