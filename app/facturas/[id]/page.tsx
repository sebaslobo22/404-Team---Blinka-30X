import Link from 'next/link';
import { notFound } from 'next/navigation';
import { confianzaDe, estadoAprobacion, instruccionPago } from '../../../src/demo/estado';
import { abreviarHash, camposQueDifieren, etiquetaFormato, fechaLectura, formatearConfianza, formatearCostoLectura, formatearMs, nombreModelo } from '../../../src/demo/formato';
import { describirVencimiento, vencimientoDe } from '../../../src/demo/vencimiento';
import { construirTraza, fragmentosDetectados, partirTextoFuente } from '../../../src/demo/traza';
import { obtenerEstado } from '../../../src/demo/singleton';
import { Evidencia, Estado, Razones } from '../../ui/Sistema';
import { camposLeidos, dinero, frase, nombres } from '../../ui/lenguaje';
import Acciones from '../../cola/Acciones';
import { Ic } from '../../ui/iconos';
import { etiquetaDeAlerta, iconoDeAlerta, iconoDeArchivo, iconoDeRegla } from '../../ui/mapa-iconos';
import { LineaLectura } from '../../ui/Lectura';
import { vistaLectura } from '../../ui/vista';
export const dynamic = 'force-dynamic';
export default async function PaginaFactura({ params }: { params: Promise<{ id: string ;}> ;}) {
  const { id } = await params; const estado = await obtenerEstado(); const fila = estado.filas.find(f => f.id === id); if (!fila) notFound();
  const { factura, resultado, entrada } = fila; const ap = estadoAprobacion(estado, fila);
  const traza = construirTraza(resultado, estado.config, factura); const instruccion = instruccionPago(estado, fila);
  const { lectura, fuente } = fila; const vence = describirVencimiento(vencimientoDe(fila), estado.ahora); const vista = vistaLectura(estado, fila);
  const detalles = lectura?.resultado.lecturas ?? []; const versiones = lectura?.resultado.modelo_versiones ?? [];
  const difieren = camposQueDifieren(factura.alertas); const dosCompletas = detalles.length >= 2 && detalles.every(l => l.ok && l.datos);
  const nombresModelos = detalles.map(l => nombreModelo(l.modelo));
  const campos = [['Factura', factura.numero_factura ?? 'Sin leer', 'documento'], ['Proveedor', factura.beneficiario ?? 'Sin leer', 'edificio'], ['Número fiscal', factura.id_fiscal ?? 'Sin leer', 'tarjeta'], ['Cuenta bancaria', factura.cuenta ?? 'Sin leer', 'banco'], ['Monto', dinero(factura.monto_centavos, factura.moneda), 'monedas'], ['Fecha del cobro', factura.fecha_emision ?? 'Sin leer', 'calendario'], ['Para cuándo', vence.texto, 'calendario-limite'], ['Tipo de gasto', factura.categoria ?? 'Sin leer', 'etiqueta']] as const;
  return <><Link className="btn btn-texto" href="/"><Ic nombre="volver" size={20} />Volver a mis facturas</Link>
    <header>
      <p className="rotulo">Factura <span className="mono">{id}</span></p>
      <h1 className="titulo-ic"><Ic nombre="pregunta" size={28} />¿Por qué decidimos esto?</h1>
    </header>
    <section className="panel-decision" data-tour="explicacion"><Estado decision={resultado.decision} />
      <p className="veredicto-frase">{frase(fila)}</p>
      <p className="veredicto-meta"><span className="con-ic"><Ic nombre="edificio" size={20} />{factura.beneficiario ?? 'Proveedor sin leer'}</span><span className="con-ic"><Ic nombre="monedas" size={20} /><span className="mono">{dinero(factura.monto_centavos, factura.moneda)}</span></span></p>
      <LineaLectura lectura={vista} />
      {resultado.decision === 'FRENAR' ? <p>Corrige el cobro en su origen. No se puede aprobar aquí.</p> : ap === 'APROBADA' ? <p>Ya aprobaste este pago.</p> : ap === 'RECHAZADA' ? <p>Ya rechazaste este pago.</p> : null}</section>
    {resultado.decision === 'ESCALAR' && ap === 'PENDIENTE' ? <Acciones facturaId={id} monto={dinero(factura.monto_centavos, factura.moneda)} /> : null}

    <section className="tarjeta flujo-tarjeta" aria-labelledby="titulo-flujo" data-flujo-lectura>
      <h2 id="titulo-flujo" className="titulo-ic"><Ic nombre="flecha-salida" size={28} />De la factura a la decisión</h2>
      <ol className="flujo flujo-lectura">
        <li><Ic nombre={iconoDeArchivo(fuente?.archivo)} size={24} /><strong>1. Documento</strong>
          <span className="dato">{etiquetaFormato(fuente?.formato)}</span><small className="archivo">{fuente?.archivo ?? 'Archivo sin dato'}</small></li>
        <li><Ic nombre="ojos" size={24} /><strong>2. Lectura con dos modelos</strong>
          {lectura ? <>
            <span className="dato">Confianza {formatearConfianza(confianzaDe(fila))}</span>
            <small>{nombresModelos.join(' y ')}</small>
            <small>{formatearMs(lectura.resultado.ms)} · {formatearCostoLectura(lectura.resultado.costo_usd)}</small></> : <small>Sin lectura grabada. No se leyó ningún dato.</small>}</li>
        <li><Ic nombre="reglas" size={24} /><strong>3. Motor de reglas</strong>
          <Estado decision={resultado.decision} /><small>Decide con tus reglas, no la IA. Versión {resultado.version_reglas}</small></li>
        <li><Ic nombre="registro" size={24} /><strong>4. Registro</strong>
          <span className="dato">Entrada {entrada.indice + 1}</span><small className="archivo">Huella {abreviarHash(entrada.hash)}</small></li>
      </ol>
      <p className="tenue pequeno">{lectura ? `Lectura real grabada el ${fechaLectura(lectura.fecha)} y reproducida sin llamar a ningún modelo.` : 'No hay lectura grabada para esta factura. Sin datos leídos, Pulso no decide solo y pide tu ayuda.'}</p>
    </section>

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

      <details open>
        <summary><Ic nombre="ojos" size={24} className="en-linea" />Lectura con dos modelos</summary>
        {lectura ? <>
          <p>{lectura.resultado.lecturas.length} lecturas hechas por modelos de empresas distintas. Estos son los modelos que respondieron, no solo los que se pidieron.</p>
          <div className="tabla-envoltura"><table className="tabla"><caption className="sr-only">Modelos que leyeron esta factura</caption>
            <thead><tr><th scope="col">Modelo pedido</th><th scope="col">Versión que respondió</th><th scope="col">Confianza</th><th scope="col">Tiempo</th><th scope="col">Costo</th></tr></thead>
            <tbody>{detalles.map((l, i) => <tr key={l.modelo}><td className="mono corto">{l.modelo}</td><td className="mono corto">{versiones[i]?.servido ?? l.modelo_servido ?? 'Sin dato'}</td><td>{l.ok ? formatearConfianza(l.datos?.confianza) : 'No leyó'}</td><td>{formatearMs(l.ms)}</td><td>{formatearCostoLectura(l.costo_usd)}</td></tr>)}</tbody></table></div>
          <p><strong>Confianza final: {formatearConfianza(confianzaDe(fila))}.</strong> Se toma la menor de las dos lecturas.</p>
          <p className="con-ic"><Ic nombre={difieren.length ? 'ojos' : dosCompletas ? 'check-circulo' : 'triangulo-alerta'} size={24} /><strong>{difieren.length ? `Los dos modelos leyeron distinto en: ${difieren.map(c => camposLeidos[c] ?? c).join(', ')}.` : dosCompletas ? 'Los dos modelos coincidieron en todos los datos que se comparan.' : 'No hay dos lecturas completas para comparar.'}</strong></p>
          <h3>Alertas del lector</h3>
          {factura.alertas?.length ? <ul className="lista-simple">{factura.alertas.map((a, i) => <li key={i} className="con-ic"><Ic nombre={iconoDeAlerta(a)} size={24} /><strong>{etiquetaDeAlerta(a)}</strong></li>)}</ul> : <p>El lector no dejó alertas.</p>}
          {factura.alertas?.length ? <pre className="codigo">{JSON.stringify(factura.alertas, null, 2)}</pre> : null}
          <p className="tenue pequeno">Lectura real grabada el {fechaLectura(lectura.fecha)} y reproducida sin llamar a ningún modelo.</p></> : <p className="aviso aviso-atencion">No hay lectura grabada para esta factura. Por eso no se leyó ningún dato y Pulso pide tu ayuda.</p>}</details>

      <details open data-tour="datos-leidos">
        <summary><Ic nombre="documento" size={24} className="en-linea" />Texto que recibió Pulso</summary>
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
    </Evidencia>
  </>;
}
