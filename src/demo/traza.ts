import { comprobaciones } from '../engine/comprobaciones';
import type { Config, FacturaExtraida, Hecho, ResultadoDecision } from '../engine/types';
import { IDS_REGLAS, SIN_DATO, formatearUsd } from './formato';

/** Traza de una decision para la pantalla de detalle. Funciones puras: solo presentan lo que el motor ya decidio. */

export type EstadoTraza = 'CUMPLE' | 'FRENAR' | 'ESCALAR' | 'NO_EVALUADA' | 'NO_APLICA';

export interface FilaTraza {
  id: string;
  estado: EstadoTraza;
  cifra: string;
  nota?: string;
}

export const SIN_CONFIANZA = 'Sin dato de confianza (el lector no la reportó)';

export function textoEstado(e: EstadoTraza): string {
  switch (e) {
    case 'CUMPLE':
      return 'Cumple';
    case 'FRENAR':
      return 'No cumple (FRENAR)';
    case 'ESCALAR':
      return 'No cumple (ESCALAR)';
    case 'NO_EVALUADA':
      return 'No evaluada';
    case 'NO_APLICA':
      return 'No aplica';
  }
}

export function clasePillEstado(e: EstadoTraza): string {
  return e === 'CUMPLE' ? 'pill pill-pagar' : e === 'FRENAR' ? 'pill pill-frenar' : e === 'ESCALAR' ? 'pill pill-escalar' : 'pill pill-neutra';
}

const num = (h: Record<string, Hecho>, k: string): number | null => (typeof h[k] === 'number' ? (h[k] as number) : null);
const dias = (n: number | null): string => (n === null ? SIN_DATO : `${n} ${n === 1 ? 'día' : 'días'}`);

/** Fragmentos detectados por el motor (hecho `inyeccion_fragmentos`, separados por " | "). */
export function fragmentosDetectados(h: Record<string, Hecho>): string[] {
  const f = h['inyeccion_fragmentos'];
  return typeof f === 'string' && f !== '' ? f.split(' | ').filter((x) => x !== '') : [];
}

function filaInyeccion(r: ResultadoDecision, factura: FacturaExtraida, cfg: Config): FilaTraza {
  const h = r.hechos;
  const c = comprobaciones(r, cfg).find((x) => x.codigo === 'INYECCION');
  if (!c || c.resultado === 'no_evaluada') return { id: 'INYECCION', estado: 'NO_EVALUADA', cifra: SIN_DATO, nota: 'El motor no pudo evaluar la factura.' };
  if (c.resultado === 'falla') {
    const frags = fragmentosDetectados(h);
    const n = num(h, 'inyeccion_n') ?? frags.length;
    return {
      id: 'INYECCION',
      estado: 'ESCALAR',
      cifra: `${n} ${n === 1 ? 'fragmento detectado' : 'fragmentos detectados'}: ${frags.length > 0 ? frags.map((x) => `«${x}»`).join(', ') : SIN_DATO}`,
      nota: 'El texto de la factura es dato, nunca orden: se ignora como instrucción y una persona revisa.',
    };
  }
  // Sin texto fuente no hay nada que revisar: se muestra como "No aplica", nunca como "Cumple".
  if (typeof factura.texto_fuente !== 'string' || factura.texto_fuente === '') return { id: 'INYECCION', estado: 'NO_APLICA', cifra: 'Sin texto fuente que revisar' };
  return { id: 'INYECCION', estado: 'CUMPLE', cifra: '0 fragmentos detectados en el texto fuente' };
}

function filaConfianza(r: ResultadoDecision, cfg: Config): FilaTraza {
  const h = r.hechos;
  const c = comprobaciones(r, cfg).find((x) => x.codigo === 'CONFIANZA');
  if (!c || c.resultado === 'no_evaluada') return { id: 'CONFIANZA', estado: 'NO_EVALUADA', cifra: SIN_CONFIANZA };
  const minima = num(h, 'confianza_minima_pct');
  const pct = num(h, 'confianza_pct');
  const cifra =
    pct === null
      ? `El lector reportó una confianza no válida. Mínimo exigido: ${minima ?? SIN_DATO} %`
      : `Confianza de lectura ${pct} % frente al mínimo de ${minima ?? SIN_DATO} %`;
  return { id: 'CONFIANZA', estado: c.resultado === 'falla' ? 'ESCALAR' : 'CUMPLE', cifra };
}

function filaRegistro(r: ResultadoDecision, factura: FacturaExtraida, cfg: Config): FilaTraza {
  const c = comprobaciones(r, cfg).find((x) => x.codigo === 'REGISTRO');
  if (c?.resultado === 'falla') {
    return {
      id: 'REGISTRO',
      estado: 'ESCALAR',
      cifra: `nombre_coincide = no. El nombre leído «${factura.beneficiario ?? SIN_DATO}» no coincide con el registrado para ese ID fiscal y esa cuenta`,
    };
  }
  if (c?.resultado === 'ok') return { id: 'REGISTRO', estado: 'CUMPLE', cifra: 'nombre_coincide = sí. El nombre leído coincide con el registrado' };
  if (r.razones.some((x) => x.regla === 'R2') && !r.razones.some((x) => x.regla === 'R7')) {
    return { id: 'REGISTRO', estado: 'NO_APLICA', cifra: SIN_DATO, nota: 'Como R2 no encontró el ID fiscal con esa cuenta, no hay un nombre registrado con el cual comparar.' };
  }
  return { id: 'REGISTRO', estado: 'NO_EVALUADA', cifra: SIN_DATO, nota: 'El motor no llegó a esta comprobación.' };
}

/**
 * Traza completa: defensas (EXTRACCION si se activó, INYECCION, CONFIANZA), luego R1 a R8 con REGISTRO
 * justo despues de R2, que es donde el motor lo evalua. Si R7 corta, las demas reglas van como No evaluada.
 */
export function construirTraza(r: ResultadoDecision, cfg: Config, factura: FacturaExtraida): FilaTraza[] {
  const h = r.hechos;
  const efectoDe = (id: string) => r.razones.find((x) => x.regla === id)?.efecto;
  const cortaR7 = r.razones.some((x) => x.regla === 'R7');
  const falloInterno = r.razones.some((x) => x.regla === 'ESQUEMA');
  const filas: FilaTraza[] = [];

  if (efectoDe('EXTRACCION')) {
    filas.push({ id: 'EXTRACCION', estado: 'ESCALAR', cifra: `${num(h, 'alertas_n') ?? SIN_DATO} ${num(h, 'alertas_n') === 1 ? 'alerta' : 'alertas'} de las defensas de la extracción` });
  }
  if (falloInterno) {
    filas.push({ id: 'ESQUEMA', estado: 'ESCALAR', cifra: 'No se pudo evaluar la factura; se escala por seguridad.' });
  }
  filas.push(filaInyeccion(r, factura, cfg), filaConfianza(r, cfg));

  for (const id of IDS_REGLAS) {
    const efecto = efectoDe(id);

    if (id !== 'R7' && (cortaR7 || falloInterno)) {
      filas.push({
        id,
        estado: 'NO_EVALUADA',
        cifra: SIN_DATO,
        nota: cortaR7
          ? 'El motor cortó la evaluación en R7: sin los campos críticos completos no hay cifras confiables para comparar.'
          : 'El motor no pudo evaluar la factura.',
      });
      if (id === 'R2') filas.push(filaRegistro(r, factura, cfg));
      continue;
    }
    if (id === 'R8' && !('ventana_cuenta_dias' in h)) {
      filas.push({
        id,
        estado: 'NO_EVALUADA',
        cifra: SIN_DATO,
        nota: 'Solo se revisa si la cuenta está registrada. Como R2 no la encontró, no hay fecha de registro que medir.',
      });
      continue;
    }

    const estado: EstadoTraza = efecto === 'FRENAR' ? 'FRENAR' : efecto === 'ESCALAR' ? 'ESCALAR' : 'CUMPLE';
    let cifra = SIN_DATO;
    switch (id) {
      case 'R1':
        cifra = `Monto ${formatearUsd(h['monto_usd_centavos'])} frente al límite de ${formatearUsd(h['limite_pago_usd_centavos'])}`;
        break;
      case 'R2':
        if (estado === 'CUMPLE') cifra = 'ID fiscal y cuenta registrados (coincidencia exacta)';
        else {
          const sug = typeof h['sugerencia_nombre'] === 'string' ? h['sugerencia_nombre'] : null;
          cifra =
            (h['beneficiario_registrado'] === true ? 'El ID fiscal está registrado, pero la cuenta no.' : 'El ID fiscal no está registrado.') +
            (sug ? ` Nombre parecido en la lista: ${sug}. Solo es una sugerencia, no aprueba nada.` : '');
        }
        break;
      case 'R3':
        cifra = `Acumulado del mes con este pago ${formatearUsd(h['acumulado_mes_con_pago_usd_centavos'])} frente al tope de ${formatearUsd(h['tope_mensual_usd_centavos'])}`;
        break;
      case 'R4':
        cifra =
          h['presupuesto_configurado'] === false
            ? 'La categoría no tiene presupuesto configurado'
            : `Gasto de la categoría con este pago ${formatearUsd(h['gasto_categoria_con_pago_usd_centavos'])} frente al presupuesto de ${formatearUsd(h['presupuesto_categoria_usd_centavos'])}`;
        break;
      case 'R5':
        cifra = `Ventana de duplicados: ${dias(num(h, 'ventana_duplicado_dias'))}`;
        break;
      case 'R6':
        cifra = `Tolerancia ${num(h, 'tolerancia_pct') ?? SIN_DATO}%. Acuerdo encontrado: ${h['acuerdo_encontrado'] === true ? 'sí' : h['acuerdo_encontrado'] === false ? 'no' : SIN_DATO}`;
        break;
      case 'R7':
        cifra =
          estado === 'CUMPLE'
            ? 'Campos críticos completos y moneda permitida'
            : `${num(h, 'campos_invalidos_n') ?? SIN_DATO} campos faltantes o inválidos: ${typeof h['campos_invalidos'] === 'string' ? h['campos_invalidos'] : SIN_DATO}`;
        break;
      case 'R8':
        cifra = `Cuenta registrada hace ${dias(num(h, 'dias_desde_cambio_cuenta'))}, ventana de ${dias(num(h, 'ventana_cuenta_dias'))}`;
        break;
    }
    filas.push({ id, estado, cifra });
    if (id === 'R2') filas.push(filaRegistro(r, factura, cfg));
  }
  return filas;
}

export interface TrozoTexto {
  texto: string;
  marcado: boolean;
}

const MARCAS_COMBINANTES = /[̀-ͯ]/g;

/**
 * Parte el texto fuente en trozos y marca los fragmentos que detecto el motor. El motor busca sobre el
 * texto sin acentos, asi que se ubica ahi y se traslada a posiciones del texto original. Un fragmento
 * que no aparece (por ejemplo "marcada por el lector") simplemente no se marca.
 */
export function partirTextoFuente(texto: string, fragmentos: string[]): TrozoTexto[] {
  let plano = '';
  const origen: number[] = [];
  let i = 0;
  for (const ch of texto) {
    const sin = ch.normalize('NFD').replace(MARCAS_COMBINANTES, '');
    for (let k = 0; k < sin.length; k++) origen.push(i);
    plano += sin;
    i += ch.length;
  }
  const rangos: [number, number][] = [];
  for (const f of fragmentos) {
    if (f === '') continue;
    const ini = plano.indexOf(f);
    if (ini < 0) continue;
    const a = origen[ini] ?? 0;
    const fin = ini + f.length - 1;
    rangos.push([a, (origen[fin] ?? texto.length - 1) + 1]);
  }
  rangos.sort((x, y) => x[0] - y[0]);
  const fusion: [number, number][] = [];
  for (const [a, b] of rangos) {
    const ult = fusion[fusion.length - 1];
    if (ult && a <= ult[1]) ult[1] = Math.max(ult[1], b);
    else fusion.push([a, b]);
  }
  const trozos: TrozoTexto[] = [];
  let pos = 0;
  for (const [a, b] of fusion) {
    if (a > pos) trozos.push({ texto: texto.slice(pos, a), marcado: false });
    trozos.push({ texto: texto.slice(a, b), marcado: true });
    pos = b;
  }
  if (pos < texto.length) trozos.push({ texto: texto.slice(pos), marcado: false });
  return trozos.length > 0 ? trozos : [{ texto, marcado: false }];
}
