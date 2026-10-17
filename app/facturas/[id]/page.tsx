import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { confianzaDe, estadoAprobacion, instruccionPago } from '../../../src/demo/estado';
import type { EstadoAprobacion, FilaDemo } from '../../../src/demo/estado';
import {
  SIN_DATO,
  abreviarHash,
  camposQueDifieren,
  clasePill,
  clasePillAprobacion,
  etiquetaAprobacion,
  etiquetaDecision,
  etiquetaFormato,
  fechaLectura,
  formatearCentavos,
  formatearConfianza,
  formatearCostoLectura,
  formatearMs,
  nombreRegla,
} from '../../../src/demo/formato';
import { clasePillEstado, construirTraza, fragmentosDetectados, partirTextoFuente, textoEstado } from '../../../src/demo/traza';
import { obtenerEstado } from '../../../src/demo/singleton';

export const dynamic = 'force-dynamic';

const OCULTO = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' } as const;
const CELDA_TH = { textTransform: 'none', letterSpacing: 0, whiteSpace: 'normal' } as const;

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
  const { lectura, fuente } = fila;
  const detalles = lectura?.resultado.lecturas ?? [];
  const fallos = alertas.filter((a) => a.startsWith('lector_fallo'));
  const lecturaFallo = lectura === null || fallos.length > 0;
  const difieren = camposQueDifieren(alertas);
  const otrasAlertas = alertas.filter((a) => !a.startsWith('lecturas_difieren:') && !a.startsWith('lector_fallo'));
  const nombresModelos = detalles.map((l) => l.modelo_servido ?? l.modelo);

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
      <p className="subtitulo">{fila.trampa}</p>
      <p className="acciones">
        <span>Decisión:</span> <span className={clasePill(d)}>{etiquetaDecision(d)}</span>
        <span>Aprobación:</span> <span className={clasePillAprobacion(ap)}>{etiquetaAprobacion(ap)}</span>
      </p>

      <h2>Del documento a la decisión</h2>
      <ol className="flujo" aria-label="Pasos desde el documento hasta el registro">
        <li>
          <div className="flujo-titulo">Documento</div>
          <div className="flujo-detalle">
            {fuente ? (
              <>
                {etiquetaFormato(fuente.formato)}
                <br />
                <span className="mono">{fuente.archivo}</span>
              </>
            ) : (
              SIN_DATO
            )}
          </div>
        </li>
        <li>
          <div className="flujo-titulo">Lectura con 2 modelos</div>
          <div className="flujo-detalle">
            {lectura === null ? (
              <strong>La lectura falló: no hay lectura grabada.</strong>
            ) : (
              <>
                <span className="mono">{nombresModelos.join(' y ')}</span>
                <br />
                Confianza {formatearConfianza(confianzaDe(fila))} · {formatearMs(lectura.resultado.ms)} · {formatearCostoLectura(lectura.resultado.costo_usd)}
              </>
            )}
          </div>
        </li>
        <li>
          <div className="flujo-titulo">Motor de reglas</div>
          <div className="flujo-detalle">
            <span className={clasePill(d)}>{etiquetaDecision(d)}</span>
          </div>
        </li>
        <li>
          <div className="flujo-titulo">Registro</div>
          <div className="flujo-detalle">
            Índice <span className="mono">{entrada.indice}</span>
            <br />
            Hash <span className="mono" title={entrada.hash}>{abreviarHash(entrada.hash)}</span>
          </div>
        </li>
      </ol>

      <h2>Lectura</h2>
      <p className="tenue" style={{ fontSize: 13 }}>
        {lectura
          ? `Lectura real grabada el ${fechaLectura(lectura.fecha)} y reproducida sin llamar a ningún modelo.`
          : 'No hay lectura grabada de esta factura y no se llama a ningún modelo para reemplazarla.'}
      </p>
      {lecturaFallo ? (
        <div className="aviso aviso-error" style={{ marginBottom: 10 }}>
          <p style={{ marginBottom: 6 }}>
            <strong>La lectura falló.</strong> El lector no entregó datos utilizables y la factura se escala por falla cerrada: ningún campo se adivina.
          </p>
          {fallos.length > 0 ? (
            <ul className="lista-simple">
              {fallos.map((a, i) => (
                <li key={i} className="mono corto">{a}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      <div className="tabla-envoltura">
        <table className="tabla">
          <caption style={OCULTO}>Modelos que leyeron la factura, con tokens, tiempo y costo</caption>
          <thead>
            <tr>
              <th scope="col">Modelo servido</th>
              <th scope="col">Lectura</th>
              <th scope="col" className="num">Confianza</th>
              <th scope="col" className="num">Tokens (entrada / salida)</th>
              <th scope="col" className="num">Tiempo</th>
              <th scope="col" className="num">Costo</th>
            </tr>
          </thead>
          <tbody>
            {detalles.length === 0 ? (
              <tr>
                <td colSpan={6} className="tenue">Sin lecturas de modelos.</td>
              </tr>
            ) : (
              detalles.map((l) => (
                <tr key={l.modelo}>
                  <td className="mono corto">
                    {l.modelo_servido ?? SIN_DATO}
                    {l.modelo_servido && l.modelo_servido !== l.modelo ? (
                      <>
                        <br />
                        <span className="tenue">pedido: {l.modelo}</span>
                      </>
                    ) : null}
                  </td>
                  <td>{l.ok ? 'Correcta' : <strong>Falló: {l.error ?? 'sin detalle'}</strong>}</td>
                  <td className="num">{formatearConfianza(l.datos?.confianza)}</td>
                  <td className="num">
                    {l.tokens_entrada} / {l.tokens_salida}
                  </td>
                  <td className="num">{formatearMs(l.ms)}</td>
                  <td className="num">{formatearCostoLectura(l.costo_usd)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="tarjeta" style={{ marginTop: 10 }}>
        <p style={{ margin: 0 }}>
          <strong>Confianza final:</strong> {formatearConfianza(confianzaDe(fila))} (el mínimo de las dos lecturas).{' '}
          {detalles.length < 2 ? (
            <>No hubo dos lecturas válidas para comparar.</>
          ) : difieren.length === 0 ? (
            <>Las dos lecturas coincidieron en todos los campos comparados.</>
          ) : (
            <>
              Las dos lecturas no coincidieron en: <span className="mono">{difieren.join(', ')}</span>.
            </>
          )}
        </p>
        {lectura ? (
          <p className="tenue" style={{ margin: '6px 0 0', fontSize: 13 }}>
            Total de esta factura: {formatearMs(lectura.resultado.ms)} y {formatearCostoLectura(lectura.resultado.costo_usd)}.
          </p>
        ) : null}
      </div>
      {difieren.length > 0 || otrasAlertas.length > 0 ? (
        <div className="aviso aviso-atencion" style={{ marginTop: 10 }}>
          <p style={{ marginBottom: 6 }}>Alertas del lector. Cualquiera de ellas hace que el motor escale la factura.</p>
          <ul className="lista-simple">
            {[...difieren.map((c) => `lecturas_difieren:${c}`), ...otrasAlertas].map((a, i) => (
              <li key={i} className="mono corto">{a}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="tenue" style={{ fontSize: 13, marginTop: 10 }}>El lector no levantó alertas.</p>
      )}

      <h3 style={{ fontSize: 14, margin: '18px 0 6px' }}>Texto fuente</h3>
      {typeof factura.texto_fuente === 'string' && factura.texto_fuente !== '' ? (
        <>
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
      ) : (
        <p className="tenue" style={{ fontSize: 13 }}>
          {fuente?.formato === 'imagen'
            ? 'El documento es una imagen: no hay texto fuente, los dos modelos la leyeron directamente.'
            : 'No hay texto fuente de esta factura.'}
        </p>
      )}

      <h2>Explicación del motor</h2>
      <div className="tarjeta">
        <p style={{ margin: 0 }}>{resultado.explicacion}</p>
      </div>

      <h2>Traza de las reglas</h2>
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

      <h2>Campos extraídos de la factura</h2>
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
      <h2>Datos del registro</h2>
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

      <h2>Qué sigue</h2>
      {d === 'FRENAR' ? (
        <div className="aviso aviso-error">Una factura frenada no tiene aprobación posible. Se corrige en el origen y se vuelve a presentar.</div>
      ) : d === 'ESCALAR' && ap === 'PENDIENTE' ? (
        <div className="aviso aviso-atencion">
          Esta factura espera la decisión de una persona. <Link href="/cola">Ir a la cola de aprobación</Link>
        </div>
      ) : null}

      <h2>Instrucción de pago</h2>
      {instruccion ? (
        <>
          <p>Este sistema no ejecuta pagos: esta es la instrucción que otro sistema ejecutaría</p>
          <pre className="codigo">{JSON.stringify(instruccion, null, 2)}</pre>
        </>
      ) : (
        <div className="aviso">{porQueNoHayInstruccion(fila, ap)}</div>
      )}
    </>
  );
}
