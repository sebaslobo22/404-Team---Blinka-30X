import { estadoAprobacion, instruccionPago } from '../../src/demo/estado';
import type { FilaDemo } from '../../src/demo/estado';
import { obtenerEstado } from '../../src/demo/singleton';
import Acciones from './Acciones';

export const dynamic = 'force-dynamic';

function monto(f: FilaDemo): string {
  const c = f.factura.monto_centavos;
  if (typeof c !== 'number') return 'Sin monto';
  return `${(c / 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${f.factura.moneda ?? ''}`.trim();
}

function Datos({ fila }: { fila: FilaDemo }) {
  return (
    <>
      <p style={{ marginBottom: 4 }}>
        <span className="mono">{fila.id}</span> · <strong>{fila.factura.beneficiario ?? 'Sin beneficiario'}</strong> · <span className="mono">{monto(fila)}</span>
      </p>
      <p>{fila.resultado.explicacion}</p>
      {fila.resultado.razones.length > 0 ? (
        <p className="tenue" style={{ fontSize: 13 }}>
          Reglas activadas:{' '}
          {fila.resultado.razones.map((r) => (
            <span key={`${r.regla}-${r.efecto}`} className="mono" style={{ marginRight: 8 }}>
              {r.regla} ({r.efecto})
            </span>
          ))}
        </p>
      ) : null}
    </>
  );
}

export default async function Cola() {
  const estado = await obtenerEstado();
  const escaladas = estado.filas.filter((f) => f.resultado.decision === 'ESCALAR');
  const pendientes = escaladas.filter((f) => estadoAprobacion(estado, f) === 'PENDIENTE');
  const resueltas = escaladas.filter((f) => estadoAprobacion(estado, f) !== 'PENDIENTE');
  const frenadas = estado.filas.filter((f) => f.resultado.decision === 'FRENAR');

  return (
    <>
      <h1>Cola de aprobación</h1>
      <p className="subtitulo">
        Solo las facturas escaladas llegan aquí. Las que se pagan por reglas (PAGAR) no pasan por esta cola. Aprobar no mueve dinero: emite una instrucción de pago.
      </p>

      <h2>Pendientes de aprobación ({pendientes.length})</h2>
      {pendientes.length === 0 ? (
        <div className="aviso aviso-ok" role="status">
          No hay facturas pendientes. Todas las escaladas ya fueron resueltas.
        </div>
      ) : (
        <div className="rejilla-2">
          {pendientes.map((f) => (
            <article key={f.id} className="tarjeta" aria-label={`Factura ${f.id}`}>
              <Datos fila={f} />
              <Acciones facturaId={f.id} />
            </article>
          ))}
        </div>
      )}

      <h2>Resueltas ({resueltas.length})</h2>
      {resueltas.length === 0 ? (
        <p className="tenue">Todavía no se ha resuelto ninguna factura escalada.</p>
      ) : (
        <div className="rejilla-2">
          {resueltas.map((f) => {
            const est = estadoAprobacion(estado, f);
            const ev = estado.aprobaciones.get(f.id);
            const instr = instruccionPago(estado, f);
            return (
              <article key={f.id} className="tarjeta" aria-label={`Factura ${f.id}`}>
                <Datos fila={f} />
                <p>
                  <span className={est === 'APROBADA' ? 'pill pill-pagar' : 'pill pill-frenar'}>{est === 'APROBADA' ? 'APROBADA' : 'RECHAZADA'}</span>{' '}
                  <span className="tenue">por {ev?.por ?? 'revisor'}</span>
                </p>
                {instr ? (
                  <>
                    <p className="tenue" style={{ fontSize: 13 }}>
                      Instrucción de pago emitida (el sistema no ejecuta el pago):
                    </p>
                    <pre className="codigo">{JSON.stringify(instr, null, 2)}</pre>
                  </>
                ) : est === 'APROBADA' ? (
                  <p className="aviso aviso-atencion">Aprobada, pero faltan datos críticos de la factura y no se pudo emitir la instrucción de pago.</p>
                ) : (
                  <p className="tenue">No se emite instrucción de pago.</p>
                )}
              </article>
            );
          })}
        </div>
      )}

      <h2>Frenadas (sin aprobación posible) ({frenadas.length})</h2>
      <p className="aviso aviso-atencion">Una factura frenada no tiene aprobación posible. Se corrige en el origen y se vuelve a presentar.</p>
      <div className="rejilla-2" style={{ marginTop: 10 }}>
        {frenadas.map((f) => (
          <article key={f.id} className="tarjeta" aria-label={`Factura frenada ${f.id}`}>
            <Datos fila={f} />
            <span className="pill pill-frenar">FRENAR</span>
          </article>
        ))}
      </div>
    </>
  );
}
