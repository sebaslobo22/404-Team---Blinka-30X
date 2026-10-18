/**
 * Limite de lecturas en vivo: por visitante (ventana de una hora) y global por dia (UTC).
 * Vive en memoria del proceso: en un despliegue sin servidor cada instancia lleva su cuenta y un
 * arranque en frio la reinicia. Por eso NO es el techo de gasto: el techo real es el limite de
 * credito de la clave de OpenRouter, que se fija en su panel. Esto solo frena el abuso casual.
 */
export interface OpcionesLimite {
  porVisitanteHora: number;
  globalDia: number;
}

export type ResultadoLimite = { ok: true; restantesVisitante: number } | { ok: false; motivo: 'VISITANTE' | 'GLOBAL'; mensaje: string };

export class Limitador {
  private porVisitante = new Map<string, number[]>();
  private dia = '';
  private usadasDia = 0;

  constructor(private o: OpcionesLimite, private reloj: () => number = Date.now) {}

  /** Cuenta una lectura si cabe; si no cabe, no cuenta nada. */
  intentar(visitante: string): ResultadoLimite {
    const ahora = this.reloj();
    const hoy = new Date(ahora).toISOString().slice(0, 10);
    if (hoy !== this.dia) {
      this.dia = hoy;
      this.usadasDia = 0;
    }
    const recientes = (this.porVisitante.get(visitante) ?? []).filter((t) => ahora - t < 3_600_000);
    if (this.usadasDia >= this.o.globalDia) {
      return { ok: false, motivo: 'GLOBAL', mensaje: 'La demo llegó al tope de lecturas en vivo de hoy. Prueba mañana o usa las facturas de ejemplo.' };
    }
    if (recientes.length >= this.o.porVisitanteHora) {
      this.porVisitante.set(visitante, recientes);
      return { ok: false, motivo: 'VISITANTE', mensaje: `Ya probaste ${this.o.porVisitanteHora} facturas en la última hora. Espera un rato para seguir.` };
    }
    recientes.push(ahora);
    this.porVisitante.set(visitante, recientes);
    this.usadasDia++;
    return { ok: true, restantesVisitante: this.o.porVisitanteHora - recientes.length };
  }
}

/** Lee un entero positivo de una variable de entorno, con valor por defecto. */
export function enteroEnv(valor: string | undefined, defecto: number): number {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : defecto;
}
