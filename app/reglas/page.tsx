import { obtenerEstado } from '../../src/demo/singleton';
import Formulario from './Formulario';
export const dynamic = 'force-dynamic';
export default async function Reglas() {
const estado = await obtenerEstado(); return <>
    <header>
      <h1>¿Cuáles son mis reglas?</h1>
      <p>Tú pones los topes. El agente los respeta al revisar cada cobro.</p>
      <p>Versión actual: <span className="mono" id="version-reglas">{estado.config.version}</span>.</p>
    </header>
    <section data-tour="reglas-form"><Formulario inicial={estado.parametros} /></section>
  </>;
}
