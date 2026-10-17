import { obtenerEstado } from '../../src/demo/singleton';
import { Veredicto, VerMas, Evidencia, Vacio } from '../ui/Sistema';
import { frase } from '../ui/lenguaje';
import Controles from './Controles';
export const dynamic = 'force-dynamic';
export default async function Registro() {
  const estado = await obtenerEstado();
  const [dec, apr, entradas] = await Promise.all([estado.registroDecisiones.verificar(estado.anclaInicial), estado.registroAprobaciones.verificar(), estado.almacenDecisiones.leerTodo()]);
  const ok = dec.ok && apr.ok;
  return <>
    <header>
      <h1>¿Qué quedó registrado?</h1>
      <p>Cada decisión deja una huella. Así puedes revisar qué pasó.</p>
    </header>
    <section data-tour="registro-verificar">
      <div className={`aviso ${ok ? 'aviso-ok' : 'aviso-error'}`} role={ok ? 'status' : 'alert'}><strong>{ok ? 'No se detectaron cambios en el registro.' : 'El registro no pasó la revisión.'}</strong>
        <p>{ok ? 'La cadena coincide con su punto de control.' : 'Revisa la evidencia antes de confiar en estos datos.'}</p>
      </div>
      <Controles n={entradas.length} /></section>

    <h2>Las decisiones, paso a paso</h2>
    {entradas.length ? <ol className="timeline"><VerMas total={entradas.length}>{entradas.map((e, i) => {
const fila = estado.filas.find(f => f.id === e.resultado.factura_id); return <li key={e.indice} data-tour={i === 0 ? 'registro-linea' : undefined}><time className="fecha" dateTime={e.registrado_en}>{new Date(e.registrado_en).toLocaleString('es-VE', { timeZone: 'America/Caracas', dateStyle: 'medium', timeStyle: 'short' })} · Caracas</time><Veredicto id={e.resultado.factura_id} decision={e.resultado.decision} texto={fila ? frase({ ...fila, resultado: e.resultado }) : 'La decisión quedó guardada. Puedes ver sus datos.'}><Evidencia>
        <section>
          <h2>La huella de esta decisión</h2>
          <p>La huella técnica se llama hash. Cambia si cambian los datos.</p>
          <dl className="datos">
            <div>
              <dt>Versión de reglas</dt>
              <dd className="mono">{e.resultado.version_reglas}</dd>
            </div>
            <div>
              <dt>Huella</dt>
              <dd className="mono corto">{e.hash}</dd>
            </div>
            <div>
              <dt>Huella anterior</dt>
              <dd className="mono corto">{e.hash_previo ?? 'Es la primera'}</dd>
            </div>
          </dl>
          <p>Se compara con el punto de control guardado al inicio. No prueba que nunca existió una versión distinta.</p>
          <pre className="codigo">{JSON.stringify(e, null, 2)}</pre>
        </section>
      </Evidencia></Veredicto></li>;
})}</VerMas></ol> : <Vacio>No hay decisiones guardadas. <a href="/">Ve a tus facturas.</a></Vacio>}

    <details>
      <summary>Ver evidencia de la revisión</summary>
      <p>Busca datos cambiados, borrados o fuera de orden. Usa el punto de control inicial.</p>
      <pre className="codigo">{JSON.stringify({ decisiones: dec, aprobaciones: apr }, null, 2)}</pre>
    </details>
  </>;
}
