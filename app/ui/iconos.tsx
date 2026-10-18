import React, { type ReactNode } from 'react';
void React; // JSX clásico en las pruebas (vitest); Next usa el runtime automático.
import { type NombreIcono } from './mapa-iconos';

// Un solo set de íconos propios: cuadrícula 24x24, trazo 1,75, extremos y uniones redondeados, sin rellenos (salvo puntos).
// Decorativos: el texto visible al lado ya dice lo mismo.
const SHIELD = 'M12 3 5 5.8v5.7c0 4.3 2.9 7.6 7 9.5 4.1-1.9 7-5.2 7-9.5V5.8Z';
const DOC = 'M7 3.5h7l4.5 4.5v11A1.5 1.5 0 0 1 17 20.5H7A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5Z';
const GLIFOS: Record<NombreIcono, ReactNode> = {
  marca: <><path d="M12 3 20 12 12 21 4 12Z" /><path d="m8.5 12 2.4 2.4L15.6 9.6" /></>,
  decisiones: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="m8 12.2 2.8 2.8L16 9.4" /></>,
  cola: <><path d="M4 13.5 6.6 5.8A1.5 1.5 0 0 1 8 4.8h8a1.5 1.5 0 0 1 1.4 1L20 13.5" /><path d="M4 13.5V18a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 18v-4.5h-4.5a3.5 3.5 0 0 1-7 0Z" /></>,
  reglas: <><path d="M5 7h8M17 7h2M5 17h2M11 17h8" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></>,
  registro: <><path d="M10 14a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-.8.8" /><path d="M14 10a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l.8-.8" /></>,
  equipo: <><circle cx="9" cy="8.5" r="3" /><path d="M3.5 19c.4-3 2.6-4.8 5.5-4.8s5.1 1.8 5.5 4.8" /><path d="M16 5.8a3 3 0 0 1 0 5.4M17.5 14.6c1.8.5 3 2 3.3 4.4" /></>,
  recorrido: <><path d="M5.5 21V4" /><path d="M5.5 4.5h12l-3 3.5 3 3.5h-12" /></>,
  tema: <><circle cx="12" cy="12" r="8.5" /><path d="M12 3.5v17a8.5 8.5 0 0 0 0-17Z" fill="currentColor" /></>,
  colapsar: <path d="m13 7-5 5 5 5M18 7l-5 5 5 5" />,
  campana: <><path d="M6 10a6 6 0 0 1 12 0c0 5 2 6.5 2 6.5H4S6 15 6 10Z" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  mano: <><path d="M8 12V6.5a1.5 1.5 0 0 1 3 0V11" /><path d="M11 10.5V4.5a1.5 1.5 0 0 1 3 0V10" /><path d="M14 10V6.5a1.5 1.5 0 0 1 3 0V14" /><path d="M17 14c0 3.9-2.6 7-6 7-2.4 0-3.7-1-5-2.8L3.8 14.4a1.4 1.4 0 0 1 2.3-1.6L8 15v-3" /></>,
  'check-circulo': <><circle cx="12" cy="12" r="9" /><path d="m7.8 12.2 3 3 5.6-6" /></>,
  guion: <><circle cx="12" cy="12" r="9" /><path d="M8 12h8" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  deshacer: <><path d="M9 14 4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" /></>,
  pregunta: <><circle cx="12" cy="12" r="9" /><path d="M9.6 9.6A2.5 2.5 0 0 1 14.4 10.4c0 1.6-2.4 2-2.4 3.4" /><path d="M12 17v.01" /></>,
  carpeta: <><path d="M4 19V6.5A1.5 1.5 0 0 1 5.5 5H9l2 2.5h6.5A1.5 1.5 0 0 1 19 9v1" /><path d="m4 19 2.3-8a1.5 1.5 0 0 1 1.4-1h12.5a1 1 0 0 1 1 1.3L18.9 18a1.5 1.5 0 0 1-1.4 1Z" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5" /><path d="M12 7.6v.01" /></>,
  'flecha-salida': <><path d="M10 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H10" /><path d="M10 12h10m-4-4 4 4-4 4" /></>,
  volver: <path d="M19 12H6m5-6-6 6 6 6" />,
  persona: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.5-3.6 3-5.5 7-5.5s6.5 1.9 7 5.5" /></>,
  edificio: <><path d="M5 21V4.5A1.5 1.5 0 0 1 6.5 3h7A1.5 1.5 0 0 1 15 4.5V21" /><path d="M15 9h2.5a1.5 1.5 0 0 1 1.5 1.5V21" /><path d="M3 21h18M8.5 7.5h3M8.5 11.5h3M8.5 15.5h3" /></>,
  tarjeta: <><rect x="3" y="5" width="18" height="14" rx="2.5" /><circle cx="8.5" cy="10.5" r="1.75" /><path d="M5.8 16c.4-1.5 1.5-2.2 2.7-2.2s2.3.7 2.7 2.2M14 10h4M14 13.5h3" /></>,
  banco: <><path d="M3 9.5 12 4l9 5.5Z" /><path d="M6 12.5v5M10 12.5v5M14 12.5v5M18 12.5v5M3.5 20h17" /></>,
  'banco-reloj': <><path d="M2 9.5 6.75 6l4.75 3.5Z" /><path d="M4 12.5v4M6.75 12.5v4M9.5 12.5v4M2 19h9.5" /><circle cx="17.5" cy="16" r="4.5" /><path d="M17.5 13.6v2.6l1.7 1" /></>,
  monedas: <><path d="M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3Z" /><path d="M4 7v5c0 1.7 3.6 3 8 3s8-1.3 8-3V7" /><path d="M4 12v5c0 1.7 3.6 3 8 3s8-1.3 8-3v-5" /></>,
  balanza: <><path d="M12 4v16M7.5 20h9M5 7.5h14" /><path d="M5 7.5 2.5 14a2.5 2.5 0 0 0 5 0Z" /><path d="M19 7.5 16.5 14a2.5 2.5 0 0 0 5 0Z" /></>,
  velocimetro: <><path d="M3.5 17.5a8.5 8.5 0 0 1 17 0Z" /><path d="M12 17.5 15.8 12" /><path d="M12 9v1.5M7 11l1 1M17 11l-1 1" /></>,
  'calendario-limite': <><rect x="4" y="5.5" width="16" height="14.5" rx="2.5" /><path d="M8 3.5v4M16 3.5v4M4 10h16" /><path d="M8 15h8M16 13v4" /></>,
  calendario: <><rect x="4" y="5.5" width="16" height="14.5" rx="2.5" /><path d="M8 3.5v4M16 3.5v4M4 10h16M8 14h.01M12 14h.01M16 14h.01M8 17h.01M12 17h.01" /></>,
  billetera: <><path d="M3 9V6.5A2.5 2.5 0 0 1 5.5 4H17v3.5" /><path d="M3 7.5h15.5A2.5 2.5 0 0 1 21 10v8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18Z" /><path d="M21 12.5h-3.5a2 2 0 0 0 0 4H21" /></>,
  duplicado: <><path d="M8 8V5.5A1.5 1.5 0 0 1 9.5 4h9A1.5 1.5 0 0 1 20 5.5V15a1.5 1.5 0 0 1-1.5 1.5H16" /><rect x="4" y="8" width="12" height="12.5" rx="1.5" /><path d="M7 12.5h6M7 16h4" /></>,
  'lista-check': <><path d="m4 6.5 1.5 1.5L8 5.5M4 12.5l1.5 1.5L8 11.5M4 18.5l1.5 1.5L8 17.5" /><path d="M11.5 7h8.5M11.5 13h8.5M11.5 19h8.5" /></>,
  ojos: <><path d="M1.5 12c1-2.4 2.8-3.5 5-3.5s4 1.1 5 3.5c-1 2.4-2.8 3.5-5 3.5s-4-1.1-5-3.5Z" /><circle cx="6.5" cy="12" r="1.2" /><path d="M12.5 12c1-2.4 2.8-3.5 5-3.5s4 1.1 5 3.5c-1 2.4-2.8 3.5-5 3.5s-4-1.1-5-3.5Z" /><circle cx="17.5" cy="12" r="1.2" /></>,
  ojo: <><path d="M2.5 12C4.5 8 8 6 12 6s7.5 2 9.5 6c-2 4-5.5 6-9.5 6s-7.5-2-9.5-6Z" /><circle cx="12" cy="12" r="2.8" /></>,
  'escudo-alerta': <><path d={SHIELD} /><path d="M12 8.5v4.2M12 15.6v.01" /></>,
  'escudo-check': <><path d={SHIELD} /><path d="m8.8 12.2 2.3 2.3 4.2-4.5" /></>,
  'documento-tachado': <><path d={DOC} /><path d="M14 3.5V8h4.5" /><path d="M3.5 3.5l17 17" /></>,
  calculadora: <><rect x="5" y="3" width="14" height="18" rx="2.5" /><path d="M8.5 7.5h7M9 12h.01M12 12h.01M15 12h.01M9 15.5h.01M12 15.5h.01M15 15.5h.01M9 18.5h.01M12 18.5h.01M15 18.5h.01" /></>,
  'triangulo-alerta': <><path d="M12 4 21 19.5H3Z" /><path d="M12 10v4.2M12 17v.01" /></>,
  documento: <><path d={DOC} /><path d="M14 3.5V8h4.5M9 13h6M9 16.5h4" /></>,
  imagen: <><rect x="3" y="4.5" width="18" height="15" rx="2.5" /><circle cx="8.5" cy="9.5" r="1.5" /><path d="m4 17 5-4.5 3.5 3 3-2.5 4.5 4" /></>,
  correo: <><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="m4 7.5 8 6 8-6" /></>,
  chat: <path d="M20 12a7.5 7.5 0 0 1-10.9 6.7L4 20l1.4-4.4A7.5 7.5 0 1 1 20 12Z" />,
  tabla: <><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M9.5 10v9.5" /></>,
  etiqueta: <><path d="M3.5 12.2V5.5A1.5 1.5 0 0 1 5 4h6.7a1.5 1.5 0 0 1 1.1.45l7.2 7.2a1.5 1.5 0 0 1 0 2.1l-6.7 6.7a1.5 1.5 0 0 1-2.1 0l-7.2-7.2a1.5 1.5 0 0 1-.45-1.05Z" /><path d="M8 8.5v.01" /></>,
  huella: <><path d="M12 11v3c0 2-.5 3.7-1.5 5.5" /><path d="M8.5 14.5c0-2.1.8-3.5 3.5-3.5s3.5 1.4 3.5 3.5c0 1.7-.3 3-1 4.5" /><path d="M5.5 16c0-3.6.6-5.3 2-7 1-1.2 2.5-2 4.5-2s3.5.8 4.5 2c1.4 1.7 2 3.4 2 7" /><path d="M9 3.5A9 9 0 0 1 21 11.5v1" /></>,
  vacio: <><path d="M4 13.5 6.6 5.8A1.5 1.5 0 0 1 8 4.8h8a1.5 1.5 0 0 1 1.4 1L20 13.5" /><path d="M4 13.5V18a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 18v-4.5h-4.5a3.5 3.5 0 0 1-7 0Z" /><path d="M12 1.5v2M10.5 2.5h3" /></>,
  'tamano-letra': <><path d="m2.5 18 4.5-12 4.5 12M4.1 14h5.8" /><circle cx="17" cy="15.5" r="2.5" /><path d="M19.5 13v5" /></>,
  tarea: <><rect x="5" y="4.5" width="14" height="16.5" rx="2.5" /><path d="M9 4.5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v.5M9 13l2 2 4-4.5" /></>,
  zona: <><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.3" /></>,
  reloj: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></>,
  acuerdo: <><path d={DOC} /><path d="M14 3.5V8h4.5M9 14l2 2 4-4.5" /></>,
  agente: <><rect x="5" y="8" width="14" height="11" rx="2.5" /><path d="M12 4v4M9 13.5v.01M15 13.5v.01" /></>,
  vivo: <><circle cx="12" cy="12" r="2" /><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4" /></>,
  bandera: <><path d="M5.5 21V4" /><path d="M5.5 4.5h12l-3 3.5 3 3.5h-12" /></>,
  codigo: <><path d="M9 5C7 5 6 6 6 8v2c0 1.5-.7 2-2 2 1.3 0 2 .5 2 2v2c0 2 1 3 3 3" /><path d="M15 5c2 0 3 1 3 3v2c0 1.5.7 2 2 2-1.3 0-2 .5-2 2v2c0 2-1 3-3 3" /></>,
  copiar: <><rect x="8.5" y="8.5" width="11.5" height="12" rx="2" /><path d="M15.5 8.5V5.5A1.5 1.5 0 0 0 14 4H5.5A1.5 1.5 0 0 0 4 5.5V15a1.5 1.5 0 0 0 1.5 1.5h3" /></>,
  descargar: <><path d="M12 4v11m-4.5-4.5L12 15l4.5-4.5" /><path d="M4.5 16.5v2A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5v-2" /></>,
};

export function Ic({ nombre, size = 24, className }: { nombre: NombreIcono; size?: 20 | 24 | 28 | 32 | 48; className?: string }) {
  return <svg className={`ic${className ? ` ${className}` : ''}`} viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{GLIFOS[nombre]}</svg>;
}
export const NOMBRES_DEFINIDOS = Object.keys(GLIFOS);

// Compatibilidad con la barra y la navegación (mismos nombres de antes).
const barra = (nombre: NombreIcono) => function IconoBarra() { return <Ic nombre={nombre} className="barra-icono" />; };
export const IconoMarca = barra('marca');
export const IconoDecisiones = barra('decisiones');
export const IconoCola = barra('cola');
export const IconoReglas = barra('reglas');
export const IconoRegistro = barra('registro');
export const IconoEquipo = barra('equipo');
export const IconoRecorrido = barra('recorrido');
export const IconoTema = barra('tema');
export const IconoColapsar = barra('colapsar');
export const IconoVivo = barra('vivo');
