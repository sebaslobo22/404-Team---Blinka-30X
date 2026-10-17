import type { FacturaLeida, ResultadoExtraccion } from '../extraccion/extraer';
import l1 from '../../data/facturas/lecturas/F-001.json';
import l2 from '../../data/facturas/lecturas/F-002.json';
import l3 from '../../data/facturas/lecturas/F-003.json';
import l4 from '../../data/facturas/lecturas/F-004.json';
import l5 from '../../data/facturas/lecturas/F-005.json';
import l6 from '../../data/facturas/lecturas/F-006.json';
import l7 from '../../data/facturas/lecturas/F-007.json';
import l8 from '../../data/facturas/lecturas/F-008.json';
import l9 from '../../data/facturas/lecturas/F-009.json';
import l10 from '../../data/facturas/lecturas/F-010.json';
import l11 from '../../data/facturas/lecturas/F-011.json';
import l12 from '../../data/facturas/lecturas/F-012.json';
import l13 from '../../data/facturas/lecturas/F-013.json';
import l14 from '../../data/facturas/lecturas/F-014.json';
import l15 from '../../data/facturas/lecturas/F-015.json';
import l16 from '../../data/facturas/lecturas/F-016.json';
import l17 from '../../data/facturas/lecturas/F-017.json';
import l18 from '../../data/facturas/lecturas/F-018.json';

/**
 * Lecturas reales grabadas (doble lectura con dos modelos) de las 18 facturas, cargadas con imports
 * estaticos. No se usa fs ni red: en Vercel (serverless) los archivos leidos dinamicamente no se
 * incluyen en el despliegue y todo escalaria por lector_fallo. Este modulo solo importa tipos del
 * lector (se borran al compilar), nunca su codigo, que usa fs y red.
 */

export interface LecturaGrabada {
  id: string;
  /** Fecha ISO de cuando se hizo la lectura real. */
  fecha: string;
  modelos: string[];
  resultado: ResultadoExtraccion;
}

const GRABADAS: Record<string, unknown> = {
  'F-001': l1,
  'F-002': l2,
  'F-003': l3,
  'F-004': l4,
  'F-005': l5,
  'F-006': l6,
  'F-007': l7,
  'F-008': l8,
  'F-009': l9,
  'F-010': l10,
  'F-011': l11,
  'F-012': l12,
  'F-013': l13,
  'F-014': l14,
  'F-015': l15,
  'F-016': l16,
  'F-017': l17,
  'F-018': l18,
};

/** Forma minima que debe cumplir una lectura para usarse. */
function esValida(x: unknown, id: string): x is LecturaGrabada {
  if (!x || typeof x !== 'object') return false;
  const l = x as Partial<LecturaGrabada>;
  const r = l.resultado;
  return (
    l.id === id &&
    typeof l.fecha === 'string' &&
    Array.isArray(l.modelos) &&
    !!r &&
    typeof r === 'object' &&
    !!r.factura &&
    typeof r.factura === 'object' &&
    Array.isArray(r.lecturas) &&
    Array.isArray(r.modelo_versiones)
  );
}

/** La lectura grabada de la factura, o null si falta o no es valida. `fuente` solo existe para pruebas. */
export function lecturaDe(id: string, fuente: Record<string, unknown> = GRABADAS): LecturaGrabada | null {
  const x = Object.prototype.hasOwnProperty.call(fuente, id) ? fuente[id] : undefined;
  return esValida(x, id) ? x : null;
}

/** Factura de falla cerrada, con la misma forma que arma el lector: campos null y alerta, el motor ESCALA. */
export function facturaSinLectura(motivo = 'replay_sin_lectura'): FacturaLeida {
  return {
    numero_factura: null,
    beneficiario: null,
    id_fiscal: null,
    cuenta: null,
    monto_centavos: null,
    moneda: null,
    fecha_emision: null,
    categoria: null,
    alertas: [`lector_fallo:${motivo}`],
    confianza: null,
    instrucciones_detectadas: false,
  };
}
