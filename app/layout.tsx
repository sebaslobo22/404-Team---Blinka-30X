import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Agente pagador 404',
  description: 'Agente que lee facturas y decide PAGAR, FRENAR o ESCALAR según reglas. Nunca mueve dinero. Datos ficticios.',
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

const ENLACES = [
  { href: '/', texto: 'Decisiones' },
  { href: '/cola', texto: 'Cola de aprobación' },
  { href: '/reglas', texto: 'Reglas' },
  { href: '/registro', texto: 'Registro' },
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <header className="cabecera">
          <div className="contenedor cabecera-interior">
            <Link href="/" className="marca">
              Agente pagador <span className="marca-equipo">Equipo 404</span>
            </Link>
            <nav aria-label="Principal" className="nav">
              {ENLACES.map((e) => (
                <Link key={e.href} href={e.href}>
                  {e.texto}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <div className="aviso-demo" role="note">
          <div className="contenedor">
            Modo replay con datos ficticios. Las lecturas de las facturas son de muestra: no se llama a ningún modelo. El sistema nunca mueve dinero: solo emite una instrucción de pago.
          </div>
        </div>
        <main className="contenedor principal">{children}</main>
      </body>
    </html>
  );
}
