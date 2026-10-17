import Link from 'next/link';
import { estadoAprobacion, resumen } from '../src/demo/estado';
import { etiquetaAprobacion, formatearCentavos } from '../src/demo/formato';
import { obtenerEstado } from '../src/demo/singleton';
import ListaFacturas from './ListaFacturas';
import { Contador } from './Interfaz';
export const dynamic = 'force-dynamic';
export default async function PaginaDecisiones() {
  const estado = await obtenerEstado(); const r = resumen(estado);
  return <><span className="rotulo">Control de facturas</span>
    <h1>Decisiones de facturas</h1>
    <p className="subtitulo">La IA lee. Las reglas deciden. Revisa el motivo de cada decisión antes de continuar.</p>

    <section className="autonomia" aria-label="Autonomía" data-tour="autonomia">
      <div>
        <div className="rotulo">Autonomía</div>
        <div className="cifra"><Contador valor={r.pctSinPersona} /></div>
      </div>
      <div>
        <p>Facturas decididas sin intervención humana: PAGAR y FRENAR, sobre {r.total} facturas ficticias.</p>
        <Link href="/cola">Revisar {r.pendientes} pendientes en la cola →</Link></div>
    </section>

    <section className="rejilla" aria-label="Resumen de decisiones">{([{ d: 'PAGAR', n: r.PAGAR, t: 'Cumplen las reglas. No ejecuta el pago.' }, { d: 'FRENAR', n: r.FRENAR, t: 'Sin aprobación posible.' }, { d: 'ESCALAR', n: r.ESCALAR, t: 'Requieren revisión humana.' }]).map(x => <div className="tarjeta" key={x.d} data-tour="tarjeta-decision"><span className={`pill pill-${x.d.toLowerCase()}`}>{x.d}</span>
      <p className="cifra">{x.n}</p>
      <div className="cifra-etiqueta">{x.t}</div>
    </div>)}
      <div className="tarjeta" data-tour="coincide"><p className="cifra">{r.decididasBien} de {r.total}</p>
        <div className="cifra-etiqueta">Coinciden con la decisión esperada. En el set de desarrollo, no mide generalización</div>
      </div></section>

    <ListaFacturas filas={estado.filas.map(f => ({ id: f.id, proveedor: f.factura.beneficiario ?? 'Sin proveedor leído', monto: formatearCentavos(f.factura.monto_centavos, f.factura.moneda), decision: f.resultado.decision, motivo: f.resultado.explicacion, aprobacion: etiquetaAprobacion(estadoAprobacion(estado, f)) }))} />
  </>;
}
