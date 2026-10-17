'use client';
import { usePathname } from 'next/navigation';
import { Ic } from '../ui/iconos';

// Botón "?" de la cabecera (móvil y tablet). En escritorio el mismo gesto vive en la barra lateral.
export function BotonTour() {
  const ruta = usePathname();
  if (ruta.startsWith('/team')) return null;
  return <button type="button" className="btn tema tour-boton" data-tour-boton title="Ver recorrido" aria-label="Ver recorrido" onClick={() => window.dispatchEvent(new Event('tour:abrir'))}><Ic nombre="recorrido" size={20} />Ver recorrido</button>;
}
