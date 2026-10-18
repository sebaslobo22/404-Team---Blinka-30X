import React, { type CSSProperties, type ReactNode } from 'react';

// Íconos de línea, cuadrícula 24x24, copiados de app/ui/iconos.tsx (mismo set del producto) más unos pocos propios
// (telegram, candado, rayo, globo). Sin dependencias nuevas.
const SHIELD = 'M12 3 5 5.8v5.7c0 4.3 2.9 7.6 7 9.5 4.1-1.9 7-5.2 7-9.5V5.8Z';
const DOC = 'M7 3.5h7l4.5 4.5v11A1.5 1.5 0 0 1 17 20.5H7A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5Z';

export const GLIFOS: Record<string, ReactNode> = {
  documento: <><path d={DOC} /><path d="M14 3.5V8h4.5M9 13h6M9 16.5h4" /></>,
  foto: <><rect x="3" y="4.5" width="18" height="15" rx="2.5" /><circle cx="8.5" cy="9.5" r="1.5" /><path d="m4 17 5-4.5 3.5 3 3-2.5 4.5 4" /></>,
  correo: <><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="m4 7.5 8 6 8-6" /></>,
  chat: <path d="M20 12a7.5 7.5 0 0 1-10.9 6.7L4 20l1.4-4.4A7.5 7.5 0 1 1 20 12Z" />,
  telegram: <><path d="M21.5 3 2.8 10.2l6.6 2.5 2.5 6.6Z" /><path d="m9.4 12.7 12.1-9.7" /></>,
  ojo: <><path d="M2.5 12C4.5 8 8 6 12 6s7.5 2 9.5 6c-2 4-5.5 6-9.5 6s-7.5-2-9.5-6Z" /><circle cx="12" cy="12" r="2.8" /></>,
  reglas: <><path d="M5 7h8M17 7h2M5 17h2M11 17h8" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></>,
  escudo: <><path d={SHIELD} /><path d="m8.8 12.2 2.3 2.3 4.2-4.5" /></>,
  mano: <><path d="M8 12V6.5a1.5 1.5 0 0 1 3 0V11" /><path d="M11 10.5V4.5a1.5 1.5 0 0 1 3 0V10" /><path d="M14 10V6.5a1.5 1.5 0 0 1 3 0V14" /><path d="M17 14c0 3.9-2.6 7-6 7-2.4 0-3.7-1-5-2.8L3.8 14.4a1.4 1.4 0 0 1 2.3-1.6L8 15v-3" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  campana: <><path d="M6 10a6 6 0 0 1 12 0c0 5 2 6.5 2 6.5H4S6 15 6 10Z" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  persona: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.5-3.6 3-5.5 7-5.5s6.5 1.9 7 5.5" /></>,
  cadena: <><path d="M10 14a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-.8.8" /><path d="M14 10a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l.8-.8" /></>,
  rayo: <path d="M13 3 5 13.5h6L10 21l8-10.5h-6Z" />,
  globo: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c2.6 2.7 3.8 5.7 3.8 9s-1.2 6.3-3.8 9c-2.6-2.7-3.8-5.7-3.8-9S9.4 5.7 12 3Z" /></>,
  codigo: <><path d="M9 5C7 5 6 6 6 8v2c0 1.5-.7 2-2 2 1.3 0 2 .5 2 2v2c0 2 1 3 3 3" /><path d="M15 5c2 0 3 1 3 3v2c0 1.5.7 2 2 2-1.3 0-2 .5-2 2v2c0 2-1 3-3 3" /></>,
  reloj: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></>,
  candado: <><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /><path d="M12 14.5v2.5" /></>,
  // Extras del mismo set del producto
  banco: <><path d="M3 9.5 12 4l9 5.5Z" /><path d="M6 12.5v5M10 12.5v5M14 12.5v5M18 12.5v5M3.5 20h17" /></>,
  duplicado: <><path d="M8 8V5.5A1.5 1.5 0 0 1 9.5 4h9A1.5 1.5 0 0 1 20 5.5V15a1.5 1.5 0 0 1-1.5 1.5H16" /><rect x="4" y="8" width="12" height="12.5" rx="1.5" /><path d="M7 12.5h6M7 16h4" /></>,
  edificio: <><path d="M5 21V4.5A1.5 1.5 0 0 1 6.5 3h7A1.5 1.5 0 0 1 15 4.5V21" /><path d="M15 9h2.5a1.5 1.5 0 0 1 1.5 1.5V21" /><path d="M3 21h18M8.5 7.5h3M8.5 11.5h3M8.5 15.5h3" /></>,
  agente: <><rect x="5" y="8" width="14" height="11" rx="2.5" /><path d="M12 4v4M9 13.5v.01M15 13.5v.01" /></>,
  pulso: <path d="M3 12h4.5l2-5 4 10 2.5-6.5 1.5 1.5H21" />,
  alerta: <><path d="M12 4 21 19.5H3Z" /><path d="M12 10v4.2M12 17v.01" /></>,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  pregunta: <><circle cx="12" cy="12" r="9" /><path d="M9.6 9.6A2.5 2.5 0 0 1 14.4 10.4c0 1.6-2.4 2-2.4 3.4" /><path d="M12 17v.01" /></>,
  'lista-check': <><path d="m4 6.5 1.5 1.5L8 5.5M4 12.5l1.5 1.5L8 11.5M4 18.5l1.5 1.5L8 17.5" /><path d="M11.5 7h8.5M11.5 13h8.5M11.5 19h8.5" /></>,
};

export type NombreIcono = keyof typeof GLIFOS;
export const NOMBRES_ICONOS = Object.keys(GLIFOS);

export function Icono({ nombre, size = 96, color = 'currentColor', strokeWidth = 1.75, style }: { nombre: string; size?: number; color?: string; strokeWidth?: number; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={style}>
      {GLIFOS[nombre] ?? GLIFOS.pulso}
    </svg>
  );
}

export default Icono;
