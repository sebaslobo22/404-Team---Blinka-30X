// Guion del video pitch deck de Pulso (Equipo 404). 123 BPM a 30 fps.
// Cada escena empieza en un beat. Un beat = 14,634 fotogramas = 0,4878 s.
// Convención: en las escenas 'iconos', `etiqueta` lleva una leyenda por ícono separada por "|"
// (el ícono i se revela en el beat i * (beats / iconos.length)). En 'cifra', `cifra` es el número gigante
// y `etiqueta` su descripción. En 'dispositivo', `imagen2` aparece a mitad de la escena (cambio de pantalla).
// Textos: máximo 7 palabras por bloque. Sin cifras inventadas.

export const BPM = 123;
export const FPS = 30;
export const beat = (n: number) => Math.round((n * 1800) / 123);
export const segundos = (n: number) => (n * 60) / 123;

export type Escena = {
  id: string;
  desdeBeat: number;
  beats: number;
  tipo: 'texto' | 'iconos' | 'veredicto' | 'dispositivo' | 'cifra' | 'cierre';
  titulo?: string;
  subtitulo?: string;
  color?: string;
  iconos?: string[];
  dispositivo?: 'mac' | 'iphone' | 'ipad' | 'mac+iphone' | 'mac+ipad';
  imagen?: string;
  imagen2?: string;
  cifra?: string;
  etiqueta?: string;
};

export const COLORES = {
  fondoDesde: '#071224',
  fondoHasta: '#0b1d3a',
  violeta: '#7c6cff',
  pagar: '#34d399',
  frenar: '#f87171',
  escalar: '#fbbf24',
  texto: '#f5f8ff',
};

export const escenas: Escena[] = [
  // 1 Gancho
  { id: 'gancho', desdeBeat: 0, beats: 8, tipo: 'texto', titulo: '¿Y si pagas la factura equivocada?', color: COLORES.frenar, iconos: ['alerta'] },
  // 2 Problema (situaciones, sin cifras)
  { id: 'problema-formatos', desdeBeat: 8, beats: 8, tipo: 'iconos', titulo: 'PDF, fotos, chats', subtitulo: 'Así llegan tus facturas', iconos: ['documento', 'foto', 'correo', 'chat'], etiqueta: 'PDF|Fotos|Correos|Chats' },
  { id: 'problema-cuenta', desdeBeat: 16, beats: 4, tipo: 'texto', titulo: 'Cuenta cambiada', subtitulo: 'El dinero llega a otro lado', color: COLORES.frenar, iconos: ['banco'] },
  { id: 'problema-cobro', desdeBeat: 20, beats: 4, tipo: 'texto', titulo: 'Cobro repetido', subtitulo: 'La misma factura, dos veces', color: COLORES.escalar, iconos: ['duplicado'] },
  // 3 Para quién
  { id: 'publico', desdeBeat: 24, beats: 8, tipo: 'iconos', titulo: 'Fundador o CFO con equipo en LatAm', iconos: ['persona', 'edificio', 'globo'], etiqueta: 'Fundadores|CFOs|LatAm' },
  // 4 Solución + logo
  { id: 'solucion', desdeBeat: 32, beats: 8, tipo: 'texto', titulo: 'Pulso', subtitulo: 'Lee, decide y explica cada pago', color: COLORES.violeta, iconos: ['pulso'] },
  // 5 Cómo funciona (3 pasos, 4 beats por paso)
  { id: 'como-funciona', desdeBeat: 40, beats: 12, tipo: 'iconos', titulo: 'Lee. Decide. Pregunta.', iconos: ['ojo', 'reglas', 'mano'], etiqueta: 'La IA lee|Reglas en código|Una persona responde' },
  // 6 Tres veredictos
  { id: 'veredicto-pagar', desdeBeat: 52, beats: 8, tipo: 'veredicto', titulo: 'PAGAR', subtitulo: 'Se paga sola', color: COLORES.pagar, iconos: ['check'] },
  { id: 'veredicto-frenar', desdeBeat: 60, beats: 8, tipo: 'veredicto', titulo: 'FRENAR', subtitulo: 'Esta no. Nunca.', color: COLORES.frenar, iconos: ['mano'] },
  { id: 'veredicto-escalar', desdeBeat: 68, beats: 8, tipo: 'veredicto', titulo: 'ESCALAR', subtitulo: 'Esta te pregunta', color: COLORES.escalar, iconos: ['campana'] },
  // 7 Demo en dispositivos
  { id: 'demo-landing', desdeBeat: 76, beats: 4, tipo: 'dispositivo', dispositivo: 'mac', titulo: 'Míralo en acción', imagen: 'real/mac-landing.png' },
  { id: 'demo-portada', desdeBeat: 80, beats: 4, tipo: 'dispositivo', dispositivo: 'mac', titulo: 'Todo claro de un vistazo', imagen: 'real/mac-portada.png' },
  { id: 'demo-f016', desdeBeat: 84, beats: 8, tipo: 'dispositivo', dispositivo: 'mac', titulo: 'Intentó darle órdenes a la IA', subtitulo: 'Pulso no obedece facturas', etiqueta: 'F-016', color: COLORES.frenar, imagen: 'real/mac-f016.png' },
  { id: 'demo-telegram', desdeBeat: 92, beats: 8, tipo: 'dispositivo', dispositivo: 'iphone', titulo: 'Apruebas en un toque', subtitulo: 'Desde Telegram', color: COLORES.escalar, imagen: 'real/tg-escalar.png', imagen2: 'real/tg-aprobada.png' },
  { id: 'demo-ipad', desdeBeat: 100, beats: 4, tipo: 'dispositivo', dispositivo: 'mac+ipad', titulo: 'En cualquier pantalla', imagen: 'real/mac-registro.png', imagen2: 'real/ipad-landing.png' },
  // 8 Prueba (4 beats por cifra)
  { id: 'cifra-autonomia', desdeBeat: 104, beats: 4, tipo: 'cifra', cifra: '25 de 30', etiqueta: 'sin persona (83,3 %)', color: COLORES.pagar },
  { id: 'cifra-indebidos', desdeBeat: 108, beats: 4, tipo: 'cifra', cifra: '0', etiqueta: 'pagos indebidos', subtitulo: 'Set ciego 2: 10 documentos, 62 filas', color: COLORES.violeta },
  { id: 'cifra-pruebas', desdeBeat: 112, beats: 4, tipo: 'cifra', cifra: '733', etiqueta: 'pruebas', color: COLORES.violeta },
  { id: 'cifra-telegram', desdeBeat: 116, beats: 4, tipo: 'cifra', cifra: '37', etiqueta: 'escenarios en Telegram, sin pagos', color: COLORES.escalar },
  // 9 Por qué gana
  { id: 'gana-roles', desdeBeat: 120, beats: 8, tipo: 'iconos', titulo: 'La IA lee. El código decide.', subtitulo: 'Una persona aprueba.', iconos: ['ojo', 'codigo', 'persona'], etiqueta: 'Lee|Decide|Aprueba' },
  { id: 'gana-registro', desdeBeat: 128, beats: 8, tipo: 'iconos', titulo: 'Registro encadenado', subtitulo: 'Nunca mueve dinero', iconos: ['cadena', 'escudo'], etiqueta: 'Cada decisión enlazada|Nunca mueve dinero' },
  // 10 Canales
  { id: 'canales', desdeBeat: 136, beats: 12, tipo: 'iconos', titulo: 'Donde ya trabajas', iconos: ['globo', 'telegram', 'agente'], etiqueta: 'Web|Telegram|MCP' },
  // 11 Cierre
  { id: 'cierre', desdeBeat: 148, beats: 16, tipo: 'cierre', titulo: 'Pulso', subtitulo: 'Pulso firme en cada pago', etiqueta: 'equipo404.produfy.co · Equipo 404', color: COLORES.violeta, iconos: ['pulso'] },
];

export const TOTAL_BEATS = 164;
export const TOTAL_FRAMES = beat(TOTAL_BEATS); // 2400 fotogramas = 80,0 s
