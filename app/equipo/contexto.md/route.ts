import { cargarContexto } from '../datos';
import { armarContextoMd } from '../lib';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const md = armarContextoMd(await cargarContexto());
  return new Response(md, { headers: { 'content-type': 'text/markdown; charset=utf-8', 'cache-control': 'no-store' } });
}
