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
  { id: 'bienvenida', ruta: '/', tipo: 'inicio', titulo: 'Recorrido de un minuto', texto: 'Este agente lee facturas con IA y decide con reglas en código si pagar, frenar o escalar. Nunca mueve dinero.' },
  { id: 'barra', ruta: '/', selector: '[data-tour="barra"]', soloEscritorio: true, titulo: 'Desde aquí navegas', texto: 'Desde aquí navegas: decisiones, cola, reglas y registro. Puedes plegarla con Ctrl o Cmd más B.' },
  { id: 'autonomia', ruta: '/', selector: '[data-tour="autonomia"]', titulo: 'Autonomía', texto: 'Mide cuántas facturas se deciden sin una persona. FRENAR también cuenta, porque bloquear un pago malo es una decisión del agente sin ayuda humana.' },
  { id: 'decisiones', ruta: '/', selector: '[data-tour="tarjeta-decision"]', titulo: 'Tres decisiones posibles', texto: 'PAGAR cumple todas las reglas, ESCALAR pide permiso a una persona y FRENAR bloquea la factura. Una factura FRENADA no se puede aprobar.' },
  { id: 'coincide', ruta: '/', selector: '[data-tour="coincide"]', titulo: 'Seguridad', texto: 'Compara cada decisión del agente con la esperada. Ninguna factura trampa termina en PAGAR.' },
  { id: 'trampa', ruta: '/', selector: '[data-tour="factura-trampa"]', titulo: 'Una factura trampa', texto: `La ${FACTURA_TRAMPA} trae una orden escondida para engañar a la IA. Abramos esta factura para ver el porqué.` },
  { id: 'explicacion', ruta: `/facturas/${FACTURA_TRAMPA}`, selector: '[data-tour="explicacion"]', titulo: 'Explicación en palabras', texto: 'La decisión se explica en lenguaje claro, sin abrir el código. Cualquiera puede entender por qué se tomó.' },
  { id: 'comprobaciones', ruta: `/facturas/${FACTURA_TRAMPA}`, selector: '[data-tour="comprobaciones"]', abrir: '[data-tour="comprobaciones"]', titulo: 'Deciden las reglas, no la IA', texto: 'Cada regla muestra su resultado con la cifra que la explica. La IA solo lee la factura: quien decide es el código.' },
  { id: 'texto-fuente', ruta: `/facturas/${FACTURA_TRAMPA}`, selector: '[data-tour="texto-fuente"]', abrir: '[data-tour="datos-leidos"]', titulo: 'La orden escondida', texto: 'Aquí está el texto original, con la orden oculta marcada. Se trata como un dato, nunca como una orden, y la factura se escala.' },
  { id: 'cola', ruta: '/cola', selector: '[data-tour="pendientes"]', titulo: 'Solo lo dudoso pide permiso', texto: 'Aquí llegan solo las facturas ESCALADAS. Una persona decide y debe dejar una nota obligatoria.' },
  { id: 'reglas', ruta: '/reglas', selector: '[data-tour="reglas-form"]', titulo: 'La empresa pone sus reglas', texto: 'Aquí se definen límites, beneficiarios y presupuesto. Cada decisión guarda con qué versión de reglas se tomó.' },
  { id: 'registro', ruta: '/registro', selector: '[data-tour="registro-verificar"], [data-tour="registro-linea"]', titulo: 'Un registro a prueba de cambios', texto: 'Cada decisión queda encadenada a la anterior en esta línea de tiempo. Con Verificar cadena se comprueba que nadie la haya alterado.' },
  { id: 'fin', ruta: '/', tipo: 'fin', titulo: 'Eso es todo', texto: 'Eso es todo. Puedes repetir el recorrido desde Ver recorrido en la barra lateral, o desde el botón de interrogación de la cabecera.' },
];

/** Pasos que aplican al ancho actual: la barra lateral solo existe en escritorio. */
export function pasosPara(escritorio: boolean): Paso[] {
  return PASOS.filter((p) => escritorio || !p.soloEscritorio);
}

/** Cuenta frases terminadas en . ! o ? (para el tope de 2 por paso). */
export function contarFrases(texto: string): number {
  return texto.split(/(?<=[.!?])\s+/).filter((s) => s.trim() !== '').length;
}
