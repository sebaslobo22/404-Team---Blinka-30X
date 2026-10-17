import reglas from '../../docs/reglas-R1-R8.json';
import { obtenerEstado } from '../../src/demo/singleton';
import Formulario from './Formulario';

export const dynamic = 'force-dynamic';

interface ReglaJson {
  id: string;
  nombre: string;
  si_incumple: string;
  umbral_usd?: number;
  ventana_dias?: number;
  tolerancia_pct?: number;
}

function parametro(r: ReglaJson): string {
  if (r.umbral_usd !== undefined) return `Umbral: ${r.umbral_usd.toLocaleString('es-ES')} USD`;
  if (r.ventana_dias !== undefined) return `Ventana: ${r.ventana_dias} días`;
  if (r.tolerancia_pct !== undefined) return `Tolerancia: ${r.tolerancia_pct} por ciento`;
  return 'Sin parámetro numérico';
}

export default async function Reglas() {
  const estado = await obtenerEstado();
  const lista = reglas.reglas as ReglaJson[];

  return (
    <>
      <h1>Reglas</h1>
      <p className="subtitulo">
        Versión de reglas vigente: <span className="mono" id="version-reglas">{estado.config.version}</span>
      </p>

      <p className="aviso aviso-atencion" role="note" style={{ marginTop: 10 }}>
        Guardar crea una nueva versión de reglas, vuelve a evaluar las {estado.filas.length} facturas y borra las aprobaciones de la sesión.
      </p>
      <h2>Parámetros editables</h2>
      <div className="tarjeta">
        <Formulario inicial={estado.parametros} />
      </div>


      <details><summary>Consultar las 8 reglas base (solo lectura)</summary>
      <div className="tabla-envoltura">
        <table className="tabla">
          <caption className="tenue" style={{ textAlign: 'left', padding: '8px 12px', fontSize: 'var(--t2)' }}>
            Valores base del archivo de reglas. Los parámetros editados arriba se aplican sobre estos.
          </caption>
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">Nombre</th>
              <th scope="col">Si se incumple</th>
              <th scope="col">Parámetro</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((r) => (
              <tr key={r.id}>
                <td className="mono">{r.id}</td>
                <td>{r.nombre}</td>
                <td>
                  <span className={r.si_incumple === 'FRENAR' ? 'pill pill-frenar' : 'pill pill-escalar'}>{r.si_incumple}</span>
                </td>
                <td className="mono" data-label="Parámetro">{parametro(r)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </details>
    </>
  );
}
