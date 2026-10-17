'use server';
import { crearEstado } from '../../src/demo/estado';
import { obtenerEstado } from '../../src/demo/singleton';
import { validarParametros } from '../../src/demo/parametros';
// Usa el mismo flujo del guardado en un estado aparte. No sustituye el singleton.
export async function previsualizar(cuerpo: unknown) {
  const v = validarParametros(cuerpo);
  if (!v.ok) return { ok: false as const, error: v.error };
  const actual = await obtenerEstado();
  const prueba = await crearEstado(v.params, actual.edicion + 1);
  return {
    ok: true as const, cambios: prueba.filas.flatMap(f => {
      const antes = actual.filas.find(a => a.id === f.id)?.resultado.decision;
      return antes && antes !== f.resultado.decision ? [{ id: f.id, antes, despues: f.resultado.decision }] : [];
    })
  };
}
