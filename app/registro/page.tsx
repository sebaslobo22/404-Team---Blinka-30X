import { obtenerEstado } from '../../src/demo/singleton';
import { Veredicto, VerMas, Evidencia, Vacio } from '../ui/Sistema';
import { frase } from '../ui/lenguaje';
import Controles from './Controles';
import { Ic } from '../ui/iconos';
import { ICONO_DECISION } from '../ui/mapa-iconos';
import { estados } from '../ui/lenguaje';
import { AVISO_ORDEN } from '../../src/demo/orden';
export const dynamic = 'force-dynamic';
export default async function Registro() {
  const estado = await obtenerEstado();
  const [dec, apr, pag, entradas] = await Promise.all([estado.registroDecisiones.verificar(estado.anclaInicial), estado.registroAprobaciones.verificar(), estado.registroPagos.verificar(), estado.almacenDecisiones.leerTodo()]);
  const ok = dec.ok && apr.ok && pag.ok;
  return <>
    <header>
      <h1 className="titulo-ic"><Ic nombre="registro" size={28} />¿Qué quedó registrado?</h1>
      <p>Cada decisión deja una huella. Así puedes revisar qué pasó.</p>
    </header>
    <section data-tour="registro-verificar">
      <div className={`aviso sello ${ok ? 'aviso-ok' : 'aviso-error'}`} role={ok ? 'status' : 'alert'}><Ic nombre={ok ? 'escudo-check' : 'triangulo-alerta'} size={48} /><div><strong>{ok ? 'No se detectaron cambios en el registro.' : 'El registro no pasó la revisión.'}</strong>
        <p>{ok ? 'La cadena coincide con su punto de control.' : 'Revisa la evidencia antes de confiar en estos datos.'}</p>
      </div></div>
      <Controles n={entradas.length} />
      <p className="acciones"><a className="btn btn-texto" href="/api/ordenes/csv" download><Ic nombre="descargar" size={20} />Descargar lote de órdenes (CSV)</a><a className="btn btn-texto" href="/api/ordenes/csv?incluir=pagadas" download><Ic nombre="descargar" size={20} />Descargar todas, también las pagadas (CSV)</a></p>
      <p className="tenue pequeno">{AVISO_ORDEN} El lote trae solo las órdenes que faltan por pagar. Hay {estado.pagos.size === 1 ? '1 orden marcada como pagada' : `${estado.pagos.size} órdenes marcadas como pagadas`}, guardadas en un registro encadenado aparte.</p></section>

    <h2 className="titulo-ic"><Ic nombre="reloj" size={28} />Las decisiones, paso a paso</h2>
    {entradas.length ? <ol className="timeline"><VerMas total={entradas.length} enLista>{entradas.map((e, i) => {
const fila = estado.filas.find(f => f.id === e.resultado.factura_id); return <li key={e.indice} data-tour={i === 0 ? 'registro-linea' : undefined}><span className={`nodo ic-${estados[e.resultado.decision].clase}`} aria-hidden="true"><Ic nombre={ICONO_DECISION[e.resultado.decision]} size={20} /></span><time className="fecha" dateTime={e.registrado_en}>{new Date(e.registrado_en).toLocaleString('es-VE', { timeZone: 'America/Caracas', dateStyle: 'medium', timeStyle: 'short' })} · Caracas</time><Veredicto id={e.resultado.factura_id} decision={e.resultado.decision} regla={e.resultado.decision === 'PAGAR' ? undefined : (e.resultado.razones.find(x => x.efecto === e.resultado.decision)?.regla ?? e.resultado.razones[0]?.regla)} texto={fila ? frase({ ...fila, resultado: e.resultado }) : 'La decisión quedó guardada. Puedes ver sus datos.'}><Evidencia>
        <section>
          <h2 className="titulo-ic"><Ic nombre="huella" size={28} />La huella de esta decisión</h2>
          <p>La huella técnica se llama hash. Cambia si cambian los datos.</p>
          <dl className="datos">
            <div>
              <dt><Ic nombre="etiqueta" size={20} />Versión de reglas</dt>
              <dd className="mono">{e.resultado.version_reglas}</dd>
            </div>
            <div>
              <dt><Ic nombre="huella" size={20} />Huella</dt>
              <dd className="mono corto">{e.hash}</dd>
            </div>
            <div>
              <dt><Ic nombre="registro" size={20} />Huella anterior</dt>
              <dd className="mono corto">{e.hash_previo ?? 'Es la primera'}</dd>
            </div>
          </dl>
          <p>Se compara con el punto de control guardado al inicio. No prueba que nunca existió una versión distinta.</p>
          <pre className="codigo">{JSON.stringify(e, null, 2)}</pre>
        </section>
      </Evidencia></Veredicto></li>;
})}</VerMas></ol> : <Vacio>No hay decisiones guardadas. <a href="/">Ve a tus facturas.</a></Vacio>}

    <details>
      <summary><Ic nombre="carpeta" size={20} className="en-linea" />Ver evidencia de la revisión</summary>
      <p>Busca datos cambiados, borrados o fuera de orden. Usa el punto de control inicial.</p>
      <pre className="codigo">{JSON.stringify({ decisiones: dec, aprobaciones: apr, pagos: pag }, null, 2)}</pre>
    </details>
  </>;
}
