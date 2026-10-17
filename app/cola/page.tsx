import { estadoAprobacion } from '../../src/demo/estado';
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
        <a className="mono" href={`/facturas/${fila.id}`}>{fila.id} ↗</a> · <strong>{fila.factura.beneficiario ?? 'Sin beneficiario'}</strong> · <span className="mono">{monto(fila)}</span>
      </p>
      <p>{fila.resultado.explicacion}</p>
      {fila.resultado.razones.length > 0 ? (
        <p className="tenue" style={{ fontSize: 'var(--t2)' }}>
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
              <span className="pill pill-escalar">ESCALAR</span><Datos fila={f} />
              <Acciones facturaId={f.id} />
            </article>
          ))}
        </div>
      )}

      <p className="tenue">Las facturas resueltas y frenadas se consultan en <a href="/">Decisiones</a>. Una factura FRENADA no admite aprobación.</p>
    </>
  );
}
