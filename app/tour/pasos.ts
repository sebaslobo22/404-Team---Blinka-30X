// Tabla de pasos del recorrido guiado. Pura: sin DOM, para poder probarla.
export interface Paso {
  id: string;
  /** Ruta donde vive el paso. El recorrido navega hasta ella si hace falta. */
  ruta: string;
  /** Selector CSS del elemento a iluminar (puede casar con varios: se ilumina su unión). Sin selector: burbuja centrada. */
  selector?: string;
  /** Selector de un plegable (details) que hay que abrir antes de buscar el elemento. */
  abrir?: string;
  titulo: string;
  texto: string;
  tipo?: 'inicio' | 'fin';
  /** Solo se muestra con la barra lateral visible (escritorio). */
  soloEscritorio?: boolean;
}

export const FACTURA_TRAMPA = 'F-016';

export const PASOS: readonly Paso[] = [
  { id: 'bienvenida', ruta: '/', tipo: 'inicio', titulo: 'Recorrido de un minuto', texto: 'Pulso lee tus facturas y aplica tus reglas. Nunca mueve dinero.' },
  { id: 'barra', ruta: '/', selector: '[data-tour="barra"]', soloEscritorio: true, titulo: 'Desde aquí navegas', texto: 'Desde aquí navegas: decisiones, cola, reglas y registro. Puedes plegarla con Ctrl o Cmd más B.' },
  { id: 'autonomia', ruta: '/', selector: '[data-tour="autonomia"]', titulo: 'Autonomía', texto: 'Muestra cuánto decide sin tu ayuda. Frenar un cobro también cuenta.' },
  { id: 'decisiones', ruta: '/', selector: '[data-tour="tarjeta-decision"]', titulo: 'Tres decisiones posibles', texto: 'Puede autorizar un pago, frenarlo o pedir tu ayuda. Un cobro frenado no se puede aprobar.' },
  { id: 'coincide', ruta: '/', selector: '[data-tour="coincide"]', titulo: 'Seguridad', texto: 'Compara las decisiones con lo esperado en esta prueba. Aún falta probar con facturas nuevas.' },
  { id: 'trampa', ruta: '/', selector: '[data-tour="factura-trampa"]', abrir: 'details.carril', titulo: 'Una factura trampa', texto: `La ${FACTURA_TRAMPA} trae una orden escondida para engañar a la IA. Abramos esta factura para ver el porqué.` },
  { id: 'explicacion', ruta: `/facturas/${FACTURA_TRAMPA}`, selector: '[data-tour="explicacion"]', titulo: 'Explicación en palabras', texto: 'Aquí ves qué se decidió y por qué. Las razones te ayudan a revisar el cobro.' },
  { id: 'comprobaciones', ruta: `/facturas/${FACTURA_TRAMPA}`, selector: '[data-tour="comprobaciones"]', abrir: '[data-tour="comprobaciones"]', titulo: 'Deciden las reglas, no la IA', texto: 'Cada regla muestra si se cumple y por qué. Pulso lee, pero las reglas deciden.' },
  { id: 'texto-fuente', ruta: `/facturas/${FACTURA_TRAMPA}`, selector: '[data-tour="texto-fuente"]', abrir: '[data-tour="datos-leidos"]', titulo: 'La orden escondida', texto: 'Aquí ves la orden oculta marcada en el texto. No se obedece: el cobro pide tu ayuda.' },
  { id: 'cola', ruta: '/cola', selector: '[data-tour="pendientes"]', titulo: 'Solo lo dudoso pide permiso', texto: 'Estos cobros esperan tu respuesta. Puedes aprobar o rechazar con una nota.' },
  { id: 'reglas', ruta: '/reglas', selector: '[data-tour="reglas-form"]', titulo: 'La empresa pone sus reglas', texto: 'Tú marcas los topes de pago. Puedes ver qué cambia antes de guardar.' },
  { id: 'registro', ruta: '/registro', selector: '[data-tour="registro-verificar"], [data-tour="registro-linea"]', titulo: 'Un registro a prueba de cambios', texto: 'Cada decisión deja una huella ligada a la anterior. Comprobar ahora busca cambios en ese registro.' },
  { id: 'fin', ruta: '/', tipo: 'fin', titulo: 'Eso es todo', texto: 'Ya conoces el camino. Puedes volver con el botón Ver recorrido.' },
];

/** Pasos que aplican al ancho actual: la barra lateral solo existe en escritorio. */
export function pasosPara(escritorio: boolean): Paso[] {
  return PASOS.filter((p) => escritorio || !p.soloEscritorio);
}

/** Cuenta frases terminadas en . ! o ? (para el tope de 2 por paso). */
export function contarFrases(texto: string): number {
  return texto.split(/(?<=[.!?])\s+/).filter((s) => s.trim() !== '').length;
}
