// Frontera entre el producto publico y el centro de mando interno. Ver src/publico.ts y
// docs/despliegue-vercel.md ("Dos proyectos desde el mismo repo").
// - MODO_PUBLICO=1 (leido en cada peticion): /team, /api/team y /equipo responden 404 real de Next.
// - Sin la bandera: se anade X-Robots-Tag y se atienden los nombres viejos /equipo con redireccion.
import { NextResponse, type NextRequest } from 'next/server';
import { debeOcultar, destinoLegado, esRutaInterna } from './src/publico';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (debeOcultar(pathname, process.env)) {
    // Reescribe a una ruta que no existe: Next responde su 404 estandar, sin pistas.
    return NextResponse.rewrite(new URL('/__no_existe__', req.url), { status: 404 });
  }

  const legado = destinoLegado(pathname);
  if (legado) {
    const url = req.nextUrl.clone();
    url.pathname = legado.destino;
    return NextResponse.redirect(url, legado.permanente ? 308 : 307);
  }

  const res = NextResponse.next();
  if (esRutaInterna(pathname)) res.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  return res;
}

// Acotado a lo interno. Las variantes (mayusculas, //, %2e) se comprueban en la funcion pura.
export const config = {
  matcher: ['/team', '/team/:path*', '/api/team', '/api/team/:path*', '/equipo', '/equipo/:path*', '/api/equipo', '/api/equipo/:path*'],
};
