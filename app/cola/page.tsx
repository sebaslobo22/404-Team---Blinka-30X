import { estadoAprobacion } from '../../src/demo/estado';
import { obtenerEstado } from '../../src/demo/singleton';
import { vistaFactura } from '../ui/vista';
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
    <Lista filas={pendientes.map(f => vistaFactura(estado, f))} /></>;
}
