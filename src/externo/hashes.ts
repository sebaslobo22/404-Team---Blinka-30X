import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

/** Todo lo que se fija antes de correr el motor sobre el set externo. */
export const ARCHIVOS_CONGELADOS = [
  'docs/set-externo.md',
  'data/externo/fuente-joffre.csv',
  'data/externo/set-externo.json',
  'src/externo/convertir.ts',
  'src/externo/puntuar.ts',
  'src/externo/hashes.ts',
  'scripts/externo-convertir.ts',
  'scripts/externo-congelar.ts',
  'scripts/externo-correr.ts',
];

export const sha256 = (ruta: string): string => createHash('sha256').update(readFileSync(ruta)).digest('hex');
