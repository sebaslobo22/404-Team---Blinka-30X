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

function describir(nombre: string, v: Verificacion): { ok: boolean; texto: string } {
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

      <h2>Controles de la demostración</h2>
      <Controles n={entradas.length} />

      <h2>Entradas de decisiones ({entradas.length})</h2>
      <div className="tabla-envoltura">
        <table className="tabla">
          <thead>
            <tr>
              <th scope="col" className="num">Índice</th>
              <th scope="col">Factura</th>
              <th scope="col">Decisión</th>
              <th scope="col">Hash</th>
              <th scope="col">Hash previo</th>
              <th scope="col">Versión de reglas</th>
            </tr>
          </thead>
          <tbody>
            {entradas.map((e) => {
              const d = e.resultado.decision;
              const clase = d === 'PAGAR' ? 'pill pill-pagar' : d === 'FRENAR' ? 'pill pill-frenar' : 'pill pill-escalar';
              const roto = !dec.ok && dec.indice === e.indice;
              return (
                <tr key={e.indice}>
                  <td className="num">{e.indice}</td>
                  <td className="mono">{e.resultado.factura_id}</td>
                  <td>
                    <span className={clase}>{d}</span>
                    {roto ? <span className="pill pill-frenar" style={{ marginLeft: 6 }}>FALLA</span> : null}
                  </td>
                  <td className="mono">{corto(e.hash)}</td>
                  <td className="mono">{corto(e.hash_previo)}</td>
                  <td className="mono">{e.resultado.version_reglas}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
