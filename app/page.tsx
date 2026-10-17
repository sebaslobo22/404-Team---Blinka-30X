import Link from 'next/link';
import { estadoAprobacion, resumen } from '../src/demo/estado';
import { obtenerEstado } from '../src/demo/singleton';
import { construirTraza } from '../src/demo/traza';
import ListaFacturas from './ListaFacturas';
import Portada, { type DatosPortada } from './Portada';
import { Ic } from './ui/iconos';
import { dinero, frase } from './ui/lenguaje';
export const dynamic = 'force-dynamic';
export default async function PaginaDecisiones() {
  const estado = await obtenerEstado(); const r = resumen(estado);
  // Todo se calcula con lo que el estado ya entrega; no se inventa ningún dato.
  const centavos = (f: (typeof estado.filas)[number]) => { const m = f.resultado.hechos.monto_usd_centavos; return typeof m === 'number' && Number.isFinite(m) ? m : null; };
  const suma = (fs: typeof estado.filas) => fs.reduce((t, f) => t + (centavos(f) ?? 0), 0);
  const pendientes = estado.filas.filter(f => f.resultado.decision === 'ESCALAR' && estadoAprobacion(estado, f) === 'PENDIENTE');
  const reglasDe = (f: (typeof estado.filas)[number]) => [...new Set(f.resultado.razones.map(x => x.regla))];
  const conteo = (fs: typeof estado.filas, de: (f: (typeof estado.filas)[number]) => string[]) => { const m = new Map<string, number>(); for (const f of fs) for (const c of de(f)) m.set(c, (m.get(c) ?? 0) + 1); return [...m].map(([id, n]) => ({ id, n })).sort((a, b) => b.n - a.n || a.id.localeCompare(b.id)); };
  const principal = conteo(pendientes, f => { const c = f.resultado.razones.find(x => x.efecto === 'ESCALAR')?.regla ?? f.resultado.razones[0]?.regla; return c ? [c] : []; });
  const datos: DatosPortada = {
    total: r.total, pagar: r.PAGAR, frenar: r.FRENAR, escalar: r.ESCALAR, pendientes: r.pendientes, pct: r.pctSinPersona, bien: r.decididasBien,
    usd: { pagar: suma(estado.filas.filter(f => f.resultado.decision === 'PAGAR')), frenar: suma(estado.filas.filter(f => f.resultado.decision === 'FRENAR')), espera: suma(pendientes) },
    sinMonto: pendientes.filter(f => centavos(f) === null).length, leidas: estado.filas.filter(f => !reglasDe(f).includes('R7')).length,
    riesgos: conteo(estado.filas.filter(f => f.resultado.decision !== 'PAGAR'), reglasDe), motivoTop: principal[0] ?? null,
  };
  return <>
    <header>
      <p className="rotulo">Tus facturas, en orden</p>
      <h1 className="titulo-ic"><Ic nombre="decisiones" size={28} />¿Qué pasó con mis facturas?</h1>
      <p>De {r.total} facturas, {r.PAGAR} tienen pago autorizado, {r.FRENAR} se frenaron y {r.ESCALAR} piden tu ayuda.</p>
      <p className="tenue">El agente decide. No envía dinero.</p></header>

    <Portada d={datos} />

    <ListaFacturas filas={estado.filas.map(f => ({ id: f.id, decision: f.resultado.decision, texto: frase(f), proveedor: f.factura.beneficiario ?? 'Proveedor sin leer', monto: dinero(f.factura.monto_centavos, f.factura.moneda), razones: construirTraza(f.resultado, estado.config, f.factura), reglas: reglasDe(f), aprobacion: estadoAprobacion(estado, f) }))} />
  </>;
}
