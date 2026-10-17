import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import type { Hecho, ResultadoDecision } from '../../../src/engine/types';
import { estadoAprobacion, instruccionPago } from '../../../src/demo/estado';
import type { EstadoAprobacion, FilaDemo } from '../../../src/demo/estado';
import {
  IDS_REGLAS,
  SIN_DATO,
  abreviarHash,
  clasePill,
  clasePillAprobacion,
  etiquetaAprobacion,
  etiquetaDecision,
  formatearCentavos,
  formatearUsd,
  nombreRegla,
} from '../../../src/demo/formato';
import { obtenerEstado } from '../../../src/demo/singleton';

export const dynamic = 'force-dynamic';

type Estado = 'CUMPLE' | 'FRENAR' | 'ESCALAR' | 'NO_EVALUADA';
interface FilaTraza {
  id: string;
  estado: Estado;
  cifra: ReactNode;
  nota?: string;
}

const OCULTO = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' } as const;
const CELDA_TH = { textTransform: 'none', letterSpacing: 0, whiteSpace: 'normal' } as const;

function textoEstado(e: Estado): string {
  return e === 'CUMPLE' ? 'Cumple' : e === 'FRENAR' ? 'No cumple (FRENAR)' : e === 'ESCALAR' ? 'No cumple (ESCALAR)' : 'No evaluada';
}
function clasePillEstado(e: Estado): string {
  return e === 'CUMPLE' ? 'pill pill-pagar' : e === 'FRENAR' ? 'pill pill-frenar' : e === 'ESCALAR' ? 'pill pill-escalar' : 'pill pill-neutra';
}

const num = (h: Record<string, Hecho>, k: string): number | null => (typeof h[k] === 'number' ? (h[k] as number) : null);
const dias = (n: number | null): string => (n === null ? SIN_DATO : `${n} ${n === 1 ? 'día' : 'días'}`);

function construirTraza(r: ResultadoDecision): FilaTraza[] {
  const h = r.hechos;
  const efectoDe = (id: string) => r.razones.find((x) => x.regla === id)?.efecto;
  const cortaR7 = r.razones.some((x) => x.regla === 'R7');
  const falloInterno = r.razones.some((x) => x.regla === 'ESQUEMA');
  const filas: FilaTraza[] = [];

  if (efectoDe('EXTRACCION')) {
    filas.push({
      id: 'EXTRACCION',
      estado: 'ESCALAR',
      cifra: `${num(h, 'alertas_n') ?? SIN_DATO} alertas de las defensas de la extracción`,
    });
  }
  if (falloInterno) {
    filas.push({ id: 'ESQUEMA', estado: 'ESCALAR', cifra: 'No se pudo evaluar la factura; se escala por seguridad.' });
  }

  for (const id of IDS_REGLAS) {
    const efecto = efectoDe(id);

    if (id !== 'R7' && (cortaR7 || falloInterno)) {
      filas.push({
        id,
        estado: 'NO_EVALUADA',
        cifra: SIN_DATO,
        nota: cortaR7
          ? 'El motor cortó la evaluación en R7: sin los campos críticos completos no hay cifras confiables para comparar.'
          : 'El motor no pudo evaluar la factura.',
      });
      continue;
    }
    if (id === 'R8' && !('ventana_cuenta_dias' in h)) {
      filas.push({
        id,
        estado: 'NO_EVALUADA',
        cifra: SIN_DATO,
        nota: 'Solo se revisa si la cuenta está registrada. Como R2 no la encontró, no hay fecha de registro que medir.',
      });
      continue;
    }

    const estado: Estado = efecto === 'FRENAR' ? 'FRENAR' : efecto === 'ESCALAR' ? 'ESCALAR' : 'CUMPLE';
    let cifra: ReactNode = SIN_DATO;
    switch (id) {
      case 'R1':
        cifra = `Monto ${formatearUsd(h['monto_usd_centavos'])} frente al límite de ${formatearUsd(h['limite_pago_usd_centavos'])}`;
        break;
      case 'R2':
        if (estado === 'CUMPLE') cifra = 'ID fiscal y cuenta registrados (coincidencia exacta)';
        else {
          const sug = typeof h['sugerencia_nombre'] === 'string' ? h['sugerencia_nombre'] : null;
          cifra = (
            <>
              {h['beneficiario_registrado'] === true ? 'El ID fiscal está registrado, pero la cuenta no.' : 'El ID fiscal no está registrado.'}
              {sug ? ` Nombre parecido en la lista: ${sug}. Solo es una sugerencia, no aprueba nada.` : ''}
            </>
          );
        }
        break;
      case 'R3':
        cifra = `Acumulado del mes con este pago ${formatearUsd(h['acumulado_mes_con_pago_usd_centavos'])} frente al tope de ${formatearUsd(h['tope_mensual_usd_centavos'])}`;
        break;
      case 'R4':
        cifra =
          h['presupuesto_configurado'] === false
            ? 'La categoría no tiene presupuesto configurado'
            : `Gasto de la categoría con este pago ${formatearUsd(h['gasto_categoria_con_pago_usd_centavos'])} frente al presupuesto de ${formatearUsd(h['presupuesto_categoria_usd_centavos'])}`;
        break;
      case 'R5':
        cifra = `Ventana de duplicados: ${dias(num(h, 'ventana_duplicado_dias'))}`;
        break;
      case 'R6':
        cifra = `Tolerancia ${num(h, 'tolerancia_pct') ?? SIN_DATO}%. Acuerdo encontrado: ${h['acuerdo_encontrado'] === true ? 'sí' : h['acuerdo_encontrado'] === false ? 'no' : SIN_DATO}`;
        break;
      case 'R7':
        cifra =
          estado === 'CUMPLE'
            ? 'Campos críticos completos y moneda permitida'
            : `${num(h, 'campos_invalidos_n') ?? SIN_DATO} campos faltantes o inválidos: ${typeof h['campos_invalidos'] === 'string' ? h['campos_invalidos'] : SIN_DATO}`;
        break;
      case 'R8':
        cifra = `Cuenta registrada hace ${dias(num(h, 'dias_desde_cambio_cuenta'))}, ventana de ${dias(num(h, 'ventana_cuenta_dias'))}`;
        break;
    }
    filas.push({ id, estado, cifra });
  }
  return filas;
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
  const traza = construirTraza(resultado);
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
      <p className="subtitulo">{fila.trampa}</p>
      <p className="acciones">
        <span>Decisión:</span> <span className={clasePill(d)}>{etiquetaDecision(d)}</span>
        <span>Aprobación:</span> <span className={clasePillAprobacion(ap)}>{etiquetaAprobacion(ap)}</span>
      </p>

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
