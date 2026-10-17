import { estadoAprobacion } from '../../src/demo/estado';
import { obtenerEstado } from '../../src/demo/singleton';
import { construirTraza } from '../../src/demo/traza';
import { dinero, frase } from '../ui/lenguaje';
import Lista from './Lista';
import { Ic } from '../ui/iconos';
export const dynamic = 'force-dynamic';
export default async function Cola() {
  const estado = await obtenerEstado();
  const pendientes = estado.filas.filter(f => f.resultado.decision === 'ESCALAR' && estadoAprobacion(estado, f) === 'PENDIENTE').sort((a, b) => Number(b.resultado.hechos.monto_usd_centavos ?? -1) - Number(a.resultado.hechos.monto_usd_centavos ?? -1));
  return <>
    <header>
      <h1 className="titulo-ic"><Ic nombre="cola" size={28} />¿Qué necesita mi aprobación?</h1>
      <p>Hay {pendientes.length} cobros que piden tu ayuda. Los de mayor monto van primero.</p>
      <p className="tenue">Revisa cada uno y deja una nota. Aprobar no mueve dinero.</p>
    </header>
    <Lista filas={pendientes.map(f => ({ id: f.id, decision: f.resultado.decision, texto: frase(f), proveedor: f.factura.beneficiario ?? 'Proveedor sin leer', monto: dinero(f.factura.monto_centavos, f.factura.moneda), razones: construirTraza(f.resultado, estado.config, f.factura), aprobacion: 'PENDIENTE' }))} /></>;
}
