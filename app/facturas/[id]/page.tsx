import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { estadoAprobacion, instruccionPago } from '../../../src/demo/estado';
import type { EstadoAprobacion, FilaDemo } from '../../../src/demo/estado';
import {
  SIN_DATO,
  abreviarHash,
  clasePill,
  clasePillAprobacion,
  etiquetaAprobacion,
  etiquetaDecision,
  formatearCentavos,
  nombreRegla,
} from '../../../src/demo/formato';
import type { EstadoTraza } from '../../../src/demo/traza';
import { clasePillEstado, construirTraza, fragmentosDetectados, partirTextoFuente } from '../../../src/demo/traza';
import { obtenerEstado } from '../../../src/demo/singleton';

export const dynamic = 'force-dynamic';

const OCULTO = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' } as const;
const CELDA_TH = { textTransform: 'none', letterSpacing: 0, whiteSpace: 'normal' } as const;

function textoEstado(e: EstadoTraza): string {
  return e === 'CUMPLE' ? '✓ Cumple' : e === 'FRENAR' ? '✕ No cumple (FRENAR)' : e === 'ESCALAR' ? '! Requiere revisión (ESCALAR)' : e === 'NO_APLICA' ? 'No aplica' : 'No evaluada';
}

function porQueNoHayInstruccion(fila: FilaDemo, ap: EstadoAprobacion): string {
  const d = fila.resultado.decision;
  if (d === 'FRENAR') return 'No hay instrucción de pago porque la factura fue frenada.';
  if (d === 'ESCALAR' && ap === 'PENDIENTE') return 'No hay instrucción de pago todavía: la factura fue escalada y espera la decisión de una persona.';
  if (d === 'ESCALAR' && ap === 'RECHAZADA') return 'No hay instrucción de pago porque una persona rechazó la factura escalada.';
  if (d === 'ESCALAR' && ap === 'APROBADA') return 'Una persona aprobó la factura, pero no se emite instrucción porque faltan datos críticos de pago (beneficiario, ID fiscal, cuenta, moneda o monto).';
  return 'No hay instrucción de pago para esta factura.';
}

export default async function PaginaFactura({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const estado = await obtenerEstado();
  const fila = estado.filas.find((f) => f.id === id);
  if (!fila) notFound();

  const { resultado, factura, entrada } = fila;
  const d = resultado.decision;
  const ap = estadoAprobacion(estado, fila);
  const traza = construirTraza(resultado, estado.config, factura);
  const instruccion = instruccionPago(estado, fila);
  const alertas = Array.isArray(factura.alertas) ? factura.alertas : [];

  const camposFactura: [string, ReactNode][] = [
    ['Número de factura', factura.numero_factura ?? SIN_DATO],
    ['Proveedor', factura.beneficiario ?? SIN_DATO],
    ['ID fiscal', factura.id_fiscal ?? SIN_DATO],
    ['Cuenta', factura.cuenta ?? SIN_DATO],
    ['Monto', formatearCentavos(factura.monto_centavos, factura.moneda)],
    ['Moneda', factura.moneda ?? SIN_DATO],
    ['Fecha de emisión', factura.fecha_emision ?? SIN_DATO],
    ['Categoría', factura.categoria ?? SIN_DATO],
  ];

  return (
    <>
      <p style={{ marginBottom: 4 }}>
        <Link href="/">Volver a las decisiones</Link>
      </p>
      <h1>
        Factura <span className="mono">{fila.id}</span>
      </h1>
      <p className="subtitulo">{resultado.explicacion}</p>
      <p className="acciones">
        <span>Decisión:</span> <span className={clasePill(d)}>{etiquetaDecision(d)}</span>
        <span>Aprobación:</span> <span className={clasePillAprobacion(ap)}>{etiquetaAprobacion(ap)}</span>
      </p>

      <section className="panel-decision" aria-label="Siguiente acción">
        {d === 'FRENAR' ? <p>Corrige la factura en el origen y vuelve a presentarla. No admite aprobación.</p> : d === 'ESCALAR' && ap === 'PENDIENTE' ? <p>Una persona debe revisar esta factura. <Link href="/cola">Ir a la cola humana →</Link></p> : <p>{instruccion ? 'Instrucción de pago disponible. El sistema no ejecuta pagos.' : porQueNoHayInstruccion(fila, ap)}</p>}
      </section>
      <details name="detalle-factura"><summary>Comprobaciones de las reglas · {traza.length}</summary>
      <div className="tabla-envoltura">
        <table className="tabla">
          <caption style={OCULTO}>Resultado de cada regla para esta factura</caption>
          <thead>
            <tr>
              <th scope="col">Regla</th>
              <th scope="col">Resultado</th>
              <th scope="col">Cifra relevante</th>
            </tr>
          </thead>
          <tbody>
            {traza.map((t) => (
              <tr key={t.id}>
                <th scope="row" style={CELDA_TH}>
                  <span className="mono">{t.id}</span>
                  <br />
                  <span style={{ fontWeight: 400 }}>{nombreRegla(t.id)}</span>
                </th>
                <td>
                  <span className={clasePillEstado(t.estado)}>{textoEstado(t.estado)}</span>
                </td>
                <td>
                  {t.cifra}
                  {t.nota ? (
                    <>
                      <br />
                      <span className="tenue">{t.nota}</span>
                    </>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      </details><details name="detalle-factura"><summary>Datos leídos de la factura</summary>
      <div className="tabla-envoltura">
        <table className="tabla">
          <caption style={OCULTO}>Campos que el agente leyó de la factura</caption>
          <tbody>
            {camposFactura.map(([nombre, valor]) => (
              <tr key={nombre}>
                <th scope="row" style={CELDA_TH}>{nombre}</th>
                <td className="corto">{valor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {factura.lineas && factura.lineas.length > 0 ? (
        <>
          <h2>Líneas de la factura</h2>
          <div className="tabla-envoltura">
            <table className="tabla">
              <caption style={OCULTO}>Líneas de detalle de la factura</caption>
              <thead>
                <tr>
                  <th scope="col">Descripción</th>
                  <th scope="col" className="num">Monto</th>
                </tr>
              </thead>
              <tbody>
                {factura.lineas.map((l, i) => (
                  <tr key={i}>
                    <td className="corto">{l.descripcion}</td>
                    <td className="num">{formatearCentavos(l.monto_centavos, factura.moneda)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
      {alertas.length > 0 ? (
        <>
          <h2>Alertas de la extracción</h2>
          <div className="aviso aviso-atencion">
            <p style={{ marginBottom: 6 }}>Texto detectado en el documento. Se muestra como dato, el agente no lo obedece.</p>
            <ul className="lista-simple">
              {alertas.map((a, i) => (
                <li key={i} className="corto">{a}</li>
              ))}
            </ul>
          </div>
        </>
      ) : null}

      {typeof factura.texto_fuente === 'string' && factura.texto_fuente !== '' ? (
        <>
          <h2>Texto fuente de la factura</h2>
          <p className="tenue" style={{ fontSize: 13 }}>
            Es el texto tal como lo leyó el agente. Es dato, nunca instrucción. Lo marcado es lo que el motor detectó como orden dirigida al agente.
          </p>
          <pre className="codigo" style={{ whiteSpace: 'pre-wrap' }}>
            {partirTextoFuente(factura.texto_fuente, fragmentosDetectados(resultado.hechos)).map((t, i) =>
              t.marcado ? (
                <mark key={i} style={{ fontWeight: 700 }}>{t.texto}</mark>
              ) : (
                <span key={i}>{t.texto}</span>
              ),
            )}
          </pre>
        </>
      ) : null}

      </details><details name="detalle-factura"><summary>Registro y hashes</summary>
      <div className="tabla-envoltura">
        <table className="tabla">
          <caption style={OCULTO}>Datos del registro encadenado de esta decisión</caption>
          <tbody>
            <tr>
              <th scope="row" style={CELDA_TH}>Índice</th>
              <td className="mono">{entrada.indice}</td>
            </tr>
            <tr>
              <th scope="row" style={CELDA_TH}>Hash</th>
              <td className="mono corto" title={entrada.hash}>{abreviarHash(entrada.hash)}</td>
            </tr>
            <tr>
              <th scope="row" style={CELDA_TH}>Hash previo</th>
              <td className="mono corto" title={entrada.hash_previo ?? undefined}>{entrada.hash_previo ? abreviarHash(entrada.hash_previo) : 'Ninguno (primera entrada)'}</td>
            </tr>
            <tr>
              <th scope="row" style={CELDA_TH}>Versión de las reglas</th>
              <td className="mono">{resultado.version_reglas}</td>
            </tr>
          </tbody>
        </table>
      </div>

      </details>
      <details name="detalle-factura"><summary>Instrucción de pago y datos técnicos</summary>
      {instruccion ? (
        <>
          <p>Este sistema no ejecuta pagos: esta es la instrucción que otro sistema ejecutaría</p>
          <pre className="codigo">{JSON.stringify(instruccion, null, 2)}</pre>
        </>
      ) : (
        <div className="aviso">{porQueNoHayInstruccion(fila, ap)}</div>
      )}
      <h2>Lecturas de modelos</h2><p className="tenue">Este flujo usa datos de muestra. No expone las dos lecturas de modelos para esta decisión.</p>
      <details><summary>JSON de la decisión</summary><pre className="codigo">{JSON.stringify(resultado, null, 2)}</pre></details>
      </details>
    </>
  );
}
