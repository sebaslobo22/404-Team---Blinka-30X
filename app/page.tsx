import Link from 'next/link';
import { estadoAprobacion, resumen } from '../src/demo/estado';
import { obtenerEstado } from '../src/demo/singleton';
import { construirTraza } from '../src/demo/traza';
import ListaFacturas from './ListaFacturas';
import { dinero, frase } from './ui/lenguaje';
export const dynamic = 'force-dynamic';
export default async function PaginaDecisiones() {
  const estado = await obtenerEstado(); const r = resumen(estado);
  return <>
    <header>
      <p className="rotulo">Tus facturas, en orden</p>
      <h1>¿Qué pasó con mis facturas?</h1>
      <p>De {r.total} facturas, {r.PAGAR} tienen pago autorizado, {r.FRENAR} se frenaron y {r.ESCALAR} piden tu ayuda.</p>
      <p className="tenue">El agente decide. No envía dinero.</p>
      <Link className="btn btn-primario" href="/cola">Revisar {r.pendientes} cobros pendientes</Link></header>

    <section className="resumen-cifras" aria-label="Resumen">
      <div className="tarjeta" data-tour="autonomia">
        <div>
          <h2>Sin tu ayuda</h2>
          <p className="cifra">{r.pctSinPersona.toLocaleString('es-ES')} %</p>
        </div>
        <p className="cifra-etiqueta">Decidió pagar o frenar por sí solo.</p>
      </div>
      <div className="tarjeta" data-tour="coincide">
        <div>
          <h2>En esta prueba</h2>
          <p className="cifra">{r.decididasBien} de {r.total}</p>
        </div>
        <p className="cifra-etiqueta">Coinciden con lo esperado. Aún falta probar con facturas nuevas.</p>
      </div>
      <div className="tarjeta">
        <div>
          <h2>Te esperan</h2>
          <p className="cifra">{r.pendientes}</p>
        </div>
        <p className="cifra-etiqueta">Cobros que aún esperan tu respuesta.</p>
      </div>
    </section>

    <ListaFacturas filas={estado.filas.map(f => ({ id: f.id, decision: f.resultado.decision, texto: frase(f), proveedor: f.factura.beneficiario ?? 'Proveedor sin leer', monto: dinero(f.factura.monto_centavos, f.factura.moneda), razones: construirTraza(f.resultado, estado.config, f.factura), aprobacion: estadoAprobacion(estado, f) }))} />
  </>;
}
