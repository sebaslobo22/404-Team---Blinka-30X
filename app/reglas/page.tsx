import { obtenerEstado } from '../../src/demo/singleton';
import Formulario from './Formulario';
import { Ic } from '../ui/iconos';
export const dynamic = 'force-dynamic';
export default async function Reglas() {
const estado = await obtenerEstado(); return <>
    <header>
      <h1 className="titulo-ic"><Ic nombre="reglas" size={28} />¿Cuáles son mis reglas?</h1>
      <p>Tú pones los topes. Pulso los respeta al revisar cada cobro.</p>
      <p className="con-ic"><Ic nombre="etiqueta" size={20} />Versión actual: <span className="mono" id="version-reglas">{estado.config.version}</span>.</p>
    </header>
    <section data-tour="reglas-form"><Formulario inicial={estado.parametros} /></section>
  </>;
}
