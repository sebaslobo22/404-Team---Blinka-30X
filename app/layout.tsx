import type { Metadata, Viewport } from 'next';
import { Cabecera, AvisoReplay, NavegacionMovil } from './Interfaz';
import { BarraLateral } from './barra/Barra';
import { Tour } from './tour/Tour';
import { estadoAprobacion } from '../src/demo/estado';
import { obtenerEstado } from '../src/demo/singleton';
import { modoPublico } from '../src/publico';
import type { ReactNode } from 'react';
import './globals.css';
import './barra/barra.css';
import './ui/iconos.css';

export const metadata: Metadata = {
  title: 'Agente pagador 404',
  description: 'Agente que lee facturas y decide PAGAR, FRENAR o ESCALAR según reglas. Nunca mueve dinero. Datos ficticios.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

// Pinta el ancho guardado de la barra antes del primer cuadro, para que no parpadee al cargar.
const SCRIPT_BARRA = "try{let d=document.documentElement.dataset,s=localStorage;if(s.getItem('404-barra')==='colapsada')d.barra='colapsada';let t=s.getItem('404-tema');if(t==='light'||t==='dark')d.theme=t;let l=s.getItem('404-letra');if(l==='grande'||l==='muy-grande')d.letra=l}catch(e){}";

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
  const equipoDisponible = !modoPublico(process.env);
  return (
    <html lang="es" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: SCRIPT_BARRA }} /></head>
      <body>
        <a className="saltar" href="#contenido">Saltar al contenido</a>
        <BarraLateral pendientes={pendientes} equipoDisponible={equipoDisponible} />
        <Cabecera equipoDisponible={equipoDisponible} />
        <div className="app-cuerpo">
          <AvisoReplay />
          <main id="contenido" className="contenedor principal">{children}</main>
          <footer className="contenedor pie">Equipo 404 · El agente decide. Nunca mueve dinero.</footer>
        </div>
        <NavegacionMovil /><Tour />
      </body>
    </html>
  );
}
