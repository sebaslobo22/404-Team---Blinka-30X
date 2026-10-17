import Link from 'next/link';
import { notFound } from 'next/navigation';
import { estadoAprobacion, instruccionPago } from '../../../src/demo/estado';
import { construirTraza, fragmentosDetectados, partirTextoFuente } from '../../../src/demo/traza';
import { obtenerEstado } from '../../../src/demo/singleton';
import { Evidencia, Estado, Razones } from '../../ui/Sistema';
import { dinero, frase, nombres } from '../../ui/lenguaje';
import Acciones from '../../cola/Acciones';
import { Ic } from '../../ui/iconos';
import { etiquetaDeAlerta, iconoDeAlerta, iconoDeRegla } from '../../ui/mapa-iconos';
export const dynamic = 'force-dynamic';
export default async function PaginaFactura({ params }: { params: Promise<{ id: string ;}> ;}) {
  const { id } = await params; const estado = await obtenerEstado(); const fila = estado.filas.find(f => f.id === id); if (!fila) notFound();
  const { factura, resultado, entrada } = fila; const ap = estadoAprobacion(estado, fila);
  const traza = construirTraza(resultado, estado.config, factura); const instruccion = instruccionPago(estado, fila);
  const campos = [['Factura', factura.numero_factura ?? 'Sin leer', 'documento'], ['Proveedor', factura.beneficiario ?? 'Sin leer', 'edificio'], ['Número fiscal', factura.id_fiscal ?? 'Sin leer', 'tarjeta'], ['Cuenta bancaria', factura.cuenta ?? 'Sin leer', 'banco'], ['Monto', dinero(factura.monto_centavos, factura.moneda), 'monedas'], ['Fecha del cobro', factura.fecha_emision ?? 'Sin leer', 'calendario'], ['Tipo de gasto', factura.categoria ?? 'Sin leer', 'etiqueta']] as const;
  return <><Link className="btn btn-texto" href="/"><Ic nombre="volver" size={20} />Volver a mis facturas</Link>
    <header>
      <p className="rotulo">Factura <span className="mono">{id}</span></p>
      <h1 className="titulo-ic"><Ic nombre="pregunta" size={28} />¿Por qué decidimos esto?</h1>
    </header>
    <section className="panel-decision" data-tour="explicacion"><Estado decision={resultado.decision} />
      <p className="veredicto-frase">{frase(fila)}</p>
      <p className="veredicto-meta"><span className="con-ic"><Ic nombre="edificio" size={20} />{factura.beneficiario ?? 'Proveedor sin leer'}</span><span className="con-ic"><Ic nombre="monedas" size={20} /><span className="mono">{dinero(factura.monto_centavos, factura.moneda)}</span></span></p>
      {resultado.decision === 'FRENAR' ? <p>Corrige el cobro en su origen. No se puede aprobar aquí.</p> : ap === 'APROBADA' ? <p>Ya aprobaste este pago.</p> : ap === 'RECHAZADA' ? <p>Ya rechazaste este pago.</p> : null}</section>
    {resultado.decision === 'ESCALAR' && ap === 'PENDIENTE' ? <Acciones facturaId={id} monto={dinero(factura.monto_centavos, factura.moneda)} /> : null}

    <details open data-tour="comprobaciones">
      <summary><Ic nombre="pregunta" size={24} className="en-linea" />¿Por qué? Las razones</summary>
      <Razones filas={traza} /></details>
    <Evidencia>
      <section>
        <h2 className="titulo-ic"><Ic nombre="tabla" size={28} />Datos leídos</h2>
        <p>Compara estos datos con tu factura. Un dato sin leer no se supone.</p>
        <dl className="datos">{campos.map(([k, v, ic]) => <div key={k}>
          <dt><Ic nombre={ic} size={20} />{k}</dt>
          <dd>{v}</dd>
        </div>)}</dl>
      </section>

      <details open data-tour="datos-leidos">
        <summary><Ic nombre="documento" size={24} className="en-linea" />Texto que recibió el agente</summary>
        {factura.texto_fuente ? <>
          <p>Lo marcado intenta dar órdenes. Se lee como un dato y no se obedece.</p>
          <pre className="codigo" data-tour="texto-fuente">{partirTextoFuente(factura.texto_fuente, fragmentosDetectados(resultado.hechos)).map((t, i) => t.marcado ? <mark key={i}>{t.texto}</mark> : <span key={i}>{t.texto}</span>)}</pre>
        </> : <p>No hay texto original en este caso. El archivo original no llega a esta pantalla.</p>}</details>

      <section>
        <h2 className="titulo-ic"><Ic nombre="huella" size={28} />La huella de esta decisión</h2>
        <p>Esta huella ayuda a detectar cambios. Se llama hash.</p>
        <dl className="datos">
          <div>
            <dt><Ic nombre="etiqueta" size={20} />Versión de reglas</dt>
            <dd className="mono">{resultado.version_reglas}</dd>
          </div>
          <div>
            <dt><Ic nombre="huella" size={20} />Huella</dt>
            <dd className="mono corto">{entrada.hash}</dd>
          </div>
          <div>
            <dt><Ic nombre="registro" size={20} />Huella anterior</dt>
            <dd className="mono corto">{entrada.hash_previo ?? 'Es la primera'}</dd>
          </div>
        </dl>
      </section>

      <details>
        <summary><Ic nombre="lista-check" size={24} className="en-linea" />Códigos de las comprobaciones</summary>
        <ul className="lista-simple">{traza.map(t => <li key={t.id} className="con-ic"><Ic nombre={iconoDeRegla(t.id)} size={20} /><span className="mono">{t.id}</span> · {nombres[t.id] ?? 'Datos'}: {t.cifra}{t.nota ? ` ${t.nota}` : ''}</li>)}</ul>
      </details>

      <details>
        <summary><Ic nombre="codigo" size={24} className="en-linea" />Datos del motor en JSON</summary>
        <p>JSON es el formato técnico de estos datos.</p>
        <pre className="codigo">{JSON.stringify(resultado, null, 2)}</pre>
      </details>

      <details>
        <summary><Ic nombre="flecha-salida" size={24} className="en-linea" />Orden de pago para otro sistema</summary>
        {instruccion ? <>
          <p>No ejecuta el pago. Solo indica qué se autorizó.</p>
          <pre className="codigo">{JSON.stringify(instruccion, null, 2)}</pre>
        </> : <p>No hay orden de pago disponible.</p>}</details>

      <details>
        <summary><Ic nombre="ojos" size={24} className="en-linea" />Lecturas de los modelos</summary>
        <p>Esta demostración usa lecturas de muestra. Las dos lecturas reales no llegan a esta pantalla.</p>
        {factura.alertas?.length ? <ul className="lista-simple">{factura.alertas.map((a, i) => <li key={i} className="con-ic"><Ic nombre={iconoDeAlerta(a)} size={24} /><strong>{etiquetaDeAlerta(a)}</strong></li>)}</ul> : null}
        {factura.alertas?.length ? <pre className="codigo">{JSON.stringify(factura.alertas, null, 2)}</pre> : null}</details>
    </Evidencia>
  </>;
}
