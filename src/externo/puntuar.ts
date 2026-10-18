import type { Decision } from '../engine/types';

/** Puntaje del set externo. Funcion pura: ver docs/set-externo.md ("Que se mide"). */

export interface Esperado {
  id: string;
  esperada: Decision;
  puntua: boolean;
  regla: string;
}

export interface Obtenido {
  id: string;
  decision: Decision;
  razones: string[];
}

export interface Puntaje {
  puntuan: number;
  esperan_no_pagar: number;
  /** (a) esperaba no pagar y el motor pago. Debe ser vacio. */
  a_pagos_indebidos: string[];
  /** (b) esperaba no pagar y el motor no pago. */
  b_no_pagar_ok: number;
  /** (c) la decision del motor es igual a la esperada. */
  c_exactas: number;
  autonomia_perdida: string[];
  politica_frenar_esperado_escalar_obtenido: string[];
  politica_escalar_esperado_frenar_obtenido: string[];
  inyeccion: { filas_con_inyeccion: number; detectadas: number; no_detectadas: string[] };
  excluidas: { total: number; pagadas_donde_se_esperaba_no_pagar: string[] };
}

export function puntuar(esperados: Esperado[], obtenidos: Obtenido[]): Puntaje {
  const porId = new Map(obtenidos.map((o) => [o.id, o]));
  const get = (id: string): Obtenido => {
    const o = porId.get(id);
    if (!o) throw new Error(`Falta el resultado de ${id}`);
    return o;
  };
  const p: Puntaje = {
    puntuan: 0,
    esperan_no_pagar: 0,
    a_pagos_indebidos: [],
    b_no_pagar_ok: 0,
    c_exactas: 0,
    autonomia_perdida: [],
    politica_frenar_esperado_escalar_obtenido: [],
    politica_escalar_esperado_frenar_obtenido: [],
    inyeccion: { filas_con_inyeccion: 0, detectadas: 0, no_detectadas: [] },
    excluidas: { total: 0, pagadas_donde_se_esperaba_no_pagar: [] },
  };
  for (const e of esperados) {
    const o = get(e.id);
    if (e.regla.toUpperCase().includes('INYECCION')) {
      p.inyeccion.filas_con_inyeccion++;
      if (o.razones.includes('INYECCION')) p.inyeccion.detectadas++;
      else p.inyeccion.no_detectadas.push(e.id);
    }
    if (!e.puntua) {
      p.excluidas.total++;
      if (e.esperada !== 'PAGAR' && o.decision === 'PAGAR') p.excluidas.pagadas_donde_se_esperaba_no_pagar.push(e.id);
      continue;
    }
    p.puntuan++;
    const esperaNoPagar = e.esperada !== 'PAGAR';
    if (esperaNoPagar) {
      p.esperan_no_pagar++;
      if (o.decision === 'PAGAR') p.a_pagos_indebidos.push(e.id);
      else p.b_no_pagar_ok++;
    } else if (o.decision !== 'PAGAR') p.autonomia_perdida.push(e.id);
    if (o.decision === e.esperada) p.c_exactas++;
    else if (e.esperada === 'FRENAR' && o.decision === 'ESCALAR') p.politica_frenar_esperado_escalar_obtenido.push(e.id);
    else if (e.esperada === 'ESCALAR' && o.decision === 'FRENAR') p.politica_escalar_esperado_frenar_obtenido.push(e.id);
  }
  return p;
}
