import type { MetadataRoute } from 'next';
import { modoPublico } from '../src/publico';

// Se evalua en cada peticion para leer MODO_PUBLICO en tiempo de ejecucion.
export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  // Publico: se indexa el producto (/) y se desautoriza lo interno y toda la API.
  // Interno: igual, solo se desautoriza /team y /api/team.
  const disallow = modoPublico(process.env) ? ['/team', '/api'] : ['/team', '/api/team'];
  return { rules: [{ userAgent: '*', allow: '/', disallow }] };
}
