import type { ReactNode } from 'react';

// Iconos propios, trazo fino, 24x24. Decorativos: el texto del ítem ya nombra la acción.
function Base({ children }: { children: ReactNode }) {
  return <svg className="barra-icono" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{children}</svg>;
}
export const IconoMarca = () => <Base><path d="M12 3 20 12 12 21 4 12Z" /><path d="m8.5 12 2.4 2.4L15.6 9.6" /></Base>;
export const IconoDecisiones = () => <Base><rect x="4" y="4" width="16" height="16" rx="3" /><path d="m8 12.2 2.8 2.8L16 9.4" /></Base>;
export const IconoCola = () => <Base><path d="M4 13.5 6.6 5.8A1.5 1.5 0 0 1 8 4.8h8a1.5 1.5 0 0 1 1.4 1L20 13.5" /><path d="M4 13.5V18a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 18v-4.5h-4.5a3.5 3.5 0 0 1-7 0Z" /></Base>;
export const IconoReglas = () => <Base><path d="M5 7h8M17 7h2M5 17h2M11 17h8" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></Base>;
export const IconoRegistro = () => <Base><path d="M10 14a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-.8.8" /><path d="M14 10a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l.8-.8" /></Base>;
export const IconoEquipo = () => <Base><circle cx="9" cy="8.5" r="3" /><path d="M3.5 19c.4-3 2.6-4.8 5.5-4.8s5.1 1.8 5.5 4.8" /><path d="M16 5.8a3 3 0 0 1 0 5.4M17.5 14.6c1.8.5 3 2 3.3 4.4" /></Base>;
export const IconoRecorrido = () => <Base><circle cx="12" cy="12" r="8.5" /><path d="M9.6 9.6A2.5 2.5 0 0 1 14.4 10.4c0 1.6-2.4 2-2.4 3.4" /><path d="M12 16.9v.1" /></Base>;
export const IconoTema = () => <Base><circle cx="12" cy="12" r="8.5" /><path d="M12 3.5v17a8.5 8.5 0 0 0 0-17Z" fill="currentColor" stroke="none" /></Base>;
export const IconoColapsar = () => <Base><path d="m13 7-5 5 5 5M18 7l-5 5 5 5" /></Base>;
