import Link from 'next/link';
import type { Verificacion } from '../../src/ledger/registro';
import { obtenerEstado } from '../../src/demo/singleton';
import Controles from './Controles';

export const dynamic = 'force-dynamic';

const MOTIVOS: Record<string, string> = {
  FORMATO: 'una entrada tiene un formato inválido',
  INDICE_INVALIDO: 'el índice de una entrada no coincide con su posición (borrado o reordenamiento)',
  ENCADENADO_ROTO: 'el hash previo no coincide con la entrada anterior',
  HASH_NO_COINCIDE: 'el contenido de la entrada no coincide con su hash (fue modificada)',
  ANCLA_NO_COINCIDE: 'la cadena no coincide con el ancla tomada al inicio (se recortó o se reescribió)',
};

function describir(nombre: string, v: Verificacion): { ok: boolean; texto: string; } {
  if (v.ok) return { ok: true, texto: `${nombre}: la cadena verifica (${v.n} entradas).` };
  return {
    ok: false,
    texto: `${nombre}: la verificación falla en la entrada ${v.indice}, motivo ${v.motivo}: ${MOTIVOS[v.motivo] ?? 'motivo desconocido'}.`,
  };
}

const corto = (h: string | null) => (h ? h.slice(0, 12) : 'ninguno');

export default async function Registro() {
  const estado = await obtenerEstado();
  const [dec, apr, entradas] = await Promise.all([
    estado.registroDecisiones.verificar(estado.anclaInicial),
    estado.registroAprobaciones.verificar(),
    estado.almacenDecisiones.leerTodo(),
  ]);
  const a = describir('Decisiones', dec);
  const b = describir('Aprobaciones', apr);
  const todoOk = a.ok && b.ok;

  return (
    <>

      <h1>Registro de decisiones</h1>

      <p className="subtitulo">
        Cada decisión y cada aprobación quedan encadenadas por hash. Versión de reglas vigente: <span className="mono">{estado.config.version}</span>.
      </p>


      <div aria-live="polite">

        <div className={todoOk ? 'aviso aviso-ok' : 'aviso aviso-error'} role={todoOk ? 'status' : 'alert'}>
          <strong>{todoOk ? 'Verificación correcta.' : 'Verificación fallida.'}</strong>

          <ul className="lista-simple" style={{ marginTop: 4 }}>

            <li>{a.texto}</li>

            <li>{b.texto}</li>
          </ul>
        </div>
      </div>


      <p style={{ marginTop: 10 }}>
        Es evidencia de manipulación, no inmutabilidad: la cadena detecta cambios, borrados y reordenamientos; reescribirla entera solo se detecta contra el ancla tomada al inicio.
      </p>


      <h2>Verificar la integridad</h2>
      <Controles n={entradas.length} />


      <h2>Entradas de decisiones ({entradas.length})</h2>
      {entradas.length === 0 ? <p className="aviso">Aún no hay decisiones registradas. Vuelve a Decisiones para consultar las facturas.</p> : null}

      <ol className="timeline">
        {entradas.map((e, i) => <li key={e.indice} data-tour={i === 0 ? 'registro-linea' : undefined}>
          <article className="tarjeta">
            <div className="acciones"><Link className="mono" href={`/facturas/${e.resultado.factura_id}`}>{e.resultado.factura_id} ↗</Link><span className={`pill pill-${e.resultado.decision.toLowerCase()}`}>{e.resultado.decision}</span><span className="mono tenue">{corto(e.hash)}</span></div>
            <p>{e.resultado.explicacion}</p>
            <details name="entrada-registro">
              <summary>Detalle de la entrada {e.indice}</summary>
              <dl>
                <dt>Versión de reglas</dt>
                <dd className="mono">{e.resultado.version_reglas}</dd>
                <dt>Hash completo</dt>
                <dd className="mono corto">{e.hash}</dd>
                <dt>Hash anterior</dt>
                <dd className="mono corto">{e.hash_previo ?? 'Primera entrada'}</dd>
              </dl>
              <pre className="codigo">{JSON.stringify(e, null, 2)}</pre>
            </details>
          </article>
        </li>)}
      </ol>
    </>
  );
}
