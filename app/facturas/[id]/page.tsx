import Link from 'next/link';
import { notFound } from 'next/navigation';
import { estadoAprobacion, instruccionPago } from '../../../src/demo/estado';
import { construirTraza, fragmentosDetectados, partirTextoFuente } from '../../../src/demo/traza';
import { obtenerEstado } from '../../../src/demo/singleton';
import { Evidencia, Estado, Razones } from '../../ui/Sistema';
import { dinero, frase, nombres } from '../../ui/lenguaje';
import Acciones from '../../cola/Acciones';
export const dynamic = 'force-dynamic';
export default async function PaginaFactura({ params }: { params: Promise<{ id: string ;}> ;}) {
  const { id } = await params; const estado = await obtenerEstado(); const fila = estado.filas.find(f => f.id === id); if (!fila) notFound();
  const { factura, resultado, entrada } = fila; const ap = estadoAprobacion(estado, fila);
  const traza = construirTraza(resultado, estado.config, factura); const instruccion = instruccionPago(estado, fila);
  const campos = [['Factura', factura.numero_factura ?? 'Sin leer'], ['Proveedor', factura.beneficiario ?? 'Sin leer'], ['Número fiscal', factura.id_fiscal ?? 'Sin leer'], ['Cuenta bancaria', factura.cuenta ?? 'Sin leer'], ['Monto', dinero(factura.monto_centavos, factura.moneda)], ['Fecha del cobro', factura.fecha_emision ?? 'Sin leer'], ['Tipo de gasto', factura.categoria ?? 'Sin leer']];
  return <><Link className="btn btn-texto" href="/">Volver a mis facturas</Link>
    <header>
      <p className="rotulo">Factura <span className="mono">{id}</span></p>
      <h1>¿Por qué decidimos esto?</h1>
    </header>
    <section className="panel-decision" data-tour="explicacion"><Estado decision={resultado.decision} />
      <p className="veredicto-frase">{frase(fila)}</p>
      <p>{factura.beneficiario ?? 'Proveedor sin leer'} · <span className="mono">{dinero(factura.monto_centavos, factura.moneda)}</span></p>
      {resultado.decision === 'FRENAR' ? <p>Corrige el cobro en su origen. No se puede aprobar aquí.</p> : ap === 'APROBADA' ? <p>Ya aprobaste este pago.</p> : ap === 'RECHAZADA' ? <p>Ya rechazaste este pago.</p> : null}</section>
    {resultado.decision === 'ESCALAR' && ap === 'PENDIENTE' ? <Acciones facturaId={id} monto={dinero(factura.monto_centavos, factura.moneda)} /> : null}

    <details open data-tour="comprobaciones">
      <summary>¿Por qué? Las razones</summary>
      <Razones filas={traza} /></details>
    <Evidencia>
      <section>
        <h2>Datos leídos</h2>
        <p>Compara estos datos con tu factura. Un dato sin leer no se supone.</p>
        <dl className="datos">{campos.map(([k, v]) => <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>)}</dl>
      </section>

      <details open data-tour="datos-leidos">
        <summary>Texto que recibió el agente</summary>
        {factura.texto_fuente ? <>
          <p>Lo marcado intenta dar órdenes. Se lee como un dato y no se obedece.</p>
          <pre className="codigo" data-tour="texto-fuente">{partirTextoFuente(factura.texto_fuente, fragmentosDetectados(resultado.hechos)).map((t, i) => t.marcado ? <mark key={i}>{t.texto}</mark> : <span key={i}>{t.texto}</span>)}</pre>
        </> : <p>No hay texto original en este caso. El archivo original no llega a esta pantalla.</p>}</details>

      <section>
        <h2>La huella de esta decisión</h2>
        <p>Esta huella ayuda a detectar cambios. Se llama hash.</p>
        <dl className="datos">
          <div>
            <dt>Versión de reglas</dt>
            <dd className="mono">{resultado.version_reglas}</dd>
          </div>
          <div>
            <dt>Huella</dt>
            <dd className="mono corto">{entrada.hash}</dd>
          </div>
          <div>
            <dt>Huella anterior</dt>
            <dd className="mono corto">{entrada.hash_previo ?? 'Es la primera'}</dd>
          </div>
        </dl>
      </section>

      <details>
        <summary>Códigos de las comprobaciones</summary>
        <ul>{traza.map(t => <li key={t.id}><span className="mono">{t.id}</span> · {nombres[t.id] ?? 'Datos'}: {t.cifra}{t.nota ? ` ${t.nota}` : ''}</li>)}</ul>
      </details>

      <details>
        <summary>Datos del motor en JSON</summary>
        <p>JSON es el formato técnico de estos datos.</p>
        <pre className="codigo">{JSON.stringify(resultado, null, 2)}</pre>
      </details>

      <details>
        <summary>Orden de pago para otro sistema</summary>
        {instruccion ? <>
          <p>No ejecuta el pago. Solo indica qué se autorizó.</p>
          <pre className="codigo">{JSON.stringify(instruccion, null, 2)}</pre>
        </> : <p>No hay orden de pago disponible.</p>}</details>

      <details>
        <summary>Lecturas de los modelos</summary>
        <p>Esta demostración usa lecturas de muestra. Las dos lecturas reales no llegan a esta pantalla.</p>
        {factura.alertas?.length ? <pre className="codigo">{JSON.stringify(factura.alertas, null, 2)}</pre> : null}</details>
    </Evidencia>
  </>;
}
