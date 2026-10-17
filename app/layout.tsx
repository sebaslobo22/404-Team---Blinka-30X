import type { Metadata, Viewport } from 'next';
import { Cabecera, AvisoReplay, Movimiento } from './Interfaz';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Agente pagador 404',
  description: 'Agente que lee facturas y decide PAGAR, FRENAR o ESCALAR según reglas. Nunca mueve dinero. Datos ficticios.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <a className="saltar" href="#contenido">Saltar al contenido</a>
        <Cabecera />
        <AvisoReplay />
        <main id="contenido" className="contenedor principal">{children}</main>
        <Movimiento /><footer className="contenedor pie">Equipo 404 · Decisiones explicables. El sistema nunca ejecuta pagos.</footer>
      </body>
    </html>
  );
}
