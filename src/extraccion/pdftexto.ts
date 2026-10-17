import { inflateSync } from 'node:zlib';

/**
 * Capa de texto de un PDF sencillo (sin dependencias): descomprime los flujos FlateDecode y junta
 * las cadenas de los operadores Tj/TJ. Sirve para los PDF que genera `cupsfilter` y para facturas
 * digitales con texto real; NO lee PDF escaneados ni fuentes con codificacion propia (devuelve ''
 * y quien llama debe tratarlo como "sin texto").
 */
export function textoDePdf(pdf: Uint8Array): string {
  const buf = Buffer.from(pdf);
  const s = buf.toString('latin1');
  const lineas: string[] = [];
  const re = /stream\r?\n/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const ini = m.index + m[0].length;
    const fin = s.indexOf('endstream', ini);
    if (fin < 0) break;
    let datos: string;
    try {
      datos = inflateSync(buf.subarray(ini, fin)).toString('latin1');
    } catch {
      continue;
    }
    if (!/\bBT\b/.test(datos)) continue;
    for (const bloque of datos.split(/\bBT\b/).slice(1)) {
      const texto = bloque.split(/\bET\b/)[0] ?? '';
      let linea = '';
      for (const c of texto.matchAll(/\(((?:\\.|[^\\)])*)\)/g)) linea += desescapar(c[1] ?? '');
      if (linea.trim()) lineas.push(linea.replace(/\s+$/, ''));
    }
  }
  return lineas.join('\n');
}

function desescapar(s: string): string {
  return s.replace(/\\([nrtbf()\\]|[0-7]{1,3})/g, (_x, g: string) => {
    if (/^[0-7]+$/.test(g)) return String.fromCharCode(parseInt(g, 8));
    return ({ n: '\n', r: '\r', t: '\t', b: '\b', f: '\f' } as Record<string, string>)[g] ?? g;
  });
}
