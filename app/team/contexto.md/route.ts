import { cargarContexto } from '../datos';
import { armarContextoMd } from '../lib';
import { modoPublico } from '../../../src/publico';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (modoPublico(process.env)) return new Response(null, { status: 404 });
  const md = armarContextoMd(await cargarContexto());
  return new Response(md, { headers: { 'content-type': 'text/markdown; charset=utf-8', 'cache-control': 'no-store' } });
}
