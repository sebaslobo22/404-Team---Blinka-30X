import type { Metadata, Viewport } from 'next';
import { Cabecera, AvisoReplay, Movimiento } from './Interfaz';
import { BarraLateral } from './barra/Barra';
import { Tour } from './tour/Tour';
import { estadoAprobacion } from '../src/demo/estado';
import { obtenerEstado } from '../src/demo/singleton';
import type { ReactNode } from 'react';
import './globals.css';
import './barra/barra.css';

export const metadata: Metadata = {
  title: 'Agente pagador 404',
  description: 'Agente que lee facturas y decide PAGAR, FRENAR o ESCALAR según reglas. Nunca mueve dinero. Datos ficticios.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

// Pinta el ancho guardado de la barra antes del primer cuadro, para que no parpadee al cargar.
const SCRIPT_BARRA = "try{if(localStorage.getItem('404-barra')==='colapsada')document.documentElement.dataset.barra='colapsada'}catch(e){}";

/** Facturas escaladas que esperan a una persona. Si el estado no está disponible, sin contador. */
async function contarPendientes(): Promise<number | null> {
  try {
    const estado = await obtenerEstado();
    return estado.filas.filter((f) => f.resultado.decision === 'ESCALAR' && estadoAprobacion(estado, f) === 'PENDIENTE').length;
  } catch {
    return null;
  }
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const pendientes = await contarPendientes();
  return (
    <html lang="es" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: SCRIPT_BARRA }} /></head>
      <body>
        <a className="saltar" href="#contenido">Saltar al contenido</a>
        <BarraLateral pendientes={pendientes} />
        <Cabecera />
        <div className="app-cuerpo">
          <AvisoReplay />
          <main id="contenido" className="contenedor principal">{children}</main>
          <Movimiento /><footer className="contenedor pie">Equipo 404 · Decisiones explicables. El sistema nunca ejecuta pagos.</footer>
        </div>
        <Tour />
      </body>
    </html>
  );
}
