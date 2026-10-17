import Link from 'next/link';
import { estadoAprobacion, resumen } from '../src/demo/estado';
import { clasePill, clasePillAprobacion, etiquetaAprobacion, etiquetaDecision, formatearCentavos, formatearUsd, nombreRegla } from '../src/demo/formato';
import { obtenerEstado } from '../src/demo/singleton';

export const dynamic = 'force-dynamic';

const OCULTO = { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' } as const;

export default async function PaginaDecisiones() {
  const estado = await obtenerEstado();
  const r = resumen(estado);

  return (
    <>
      <h1>Decisiones</h1>
      <p className="subtitulo">
        El agente leyó {r.total} facturas ficticias y el motor de reglas decidió cada una. Nunca mueve dinero: solo emite la instrucción de pago cuando corresponde.
      </p>

      <h2>Resumen</h2>
      <div className="rejilla">
        <div className="tarjeta">
          <div className="cifra">{r.PAGAR}</div>
          <div className="cifra-etiqueta">
            <span className="pill pill-pagar">PAGAR</span> cumplen todas las reglas
          </div>
        </div>
        <div className="tarjeta">
          <div className="cifra">{r.FRENAR}</div>
          <div className="cifra-etiqueta">
            <span className="pill pill-frenar">FRENAR</span> sin aprobación posible
          </div>
        </div>
        <div className="tarjeta">
          <div className="cifra">{r.ESCALAR}</div>
          <div className="cifra-etiqueta">
            <span className="pill pill-escalar">ESCALAR</span> las resuelve una persona
          </div>
        </div>
        <div className="tarjeta">
          <div className="cifra">{r.pendientes}</div>
          <div className="cifra-etiqueta">
            Pendientes de aprobación. <Link href="/cola">Ir a la cola</Link>
          </div>
        </div>
        <div className="tarjeta">
          <div className="cifra">{r.pctSinPersona}%</div>
          <div className="cifra-etiqueta">Decididas sin intervención de una persona (PAGAR y FRENAR)</div>
        </div>
        <div className="tarjeta">
          <div className="cifra">
            {r.decididasBien} de {r.total}
          </div>
          <div className="cifra-etiqueta">Coinciden con la decisión esperada. En el set de desarrollo, no mide generalización</div>
        </div>
      </div>

      <h2>Las {r.total} facturas</h2>
      <div className="tabla-envoltura">
        <table className="tabla">
          <caption style={OCULTO}>Facturas con su decisión, las reglas activadas y el estado de aprobación</caption>
          <thead>
            <tr>
              <th scope="col">Factura</th>
              <th scope="col">Proveedor</th>
              <th scope="col" className="num">Monto</th>
              <th scope="col" className="num">Monto en USD</th>
              <th scope="col">Decisión</th>
              <th scope="col">Reglas activadas</th>
              <th scope="col">Aprobación</th>
            </tr>
          </thead>
          <tbody>
            {estado.filas.map((fila) => {
              const d = fila.resultado.decision;
              const ap = estadoAprobacion(estado, fila);
              const usd = fila.resultado.hechos['monto_usd_centavos'];
              return (
                <tr key={fila.id}>
                  <td className="mono">
                    <Link href={`/facturas/${fila.id}`}>{fila.id}</Link>
                  </td>
                  <td>{fila.factura.beneficiario ?? 'Sin dato'}</td>
                  <td className="num">{formatearCentavos(fila.factura.monto_centavos, fila.factura.moneda)}</td>
                  <td className="num">{typeof usd === 'number' ? formatearUsd(usd) : 'Sin dato'}</td>
                  <td>
                    <span className={clasePill(d)}>{etiquetaDecision(d)}</span>
                  </td>
                  <td>
                    {fila.resultado.razones.length === 0 ? (
                      <span className="tenue">Ninguna</span>
                    ) : (
                      <ul className="lista-simple">
                        {fila.resultado.razones.map((rz) => (
                          <li key={rz.regla}>
                            <span className="mono">{rz.regla}</span> <span className="tenue">{nombreRegla(rz.regla)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td>
                    <span className={clasePillAprobacion(ap)}>{etiquetaAprobacion(ap)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
