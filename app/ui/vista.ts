import { confianzaDe, estadoAprobacion } from '../../src/demo/estado';
import type { EstadoDemo, FilaDemo } from '../../src/demo/estado';
import { etiquetaFormato, formatearConfianza } from '../../src/demo/formato';
import { construirTraza } from '../../src/demo/traza';
import { describirVencimiento, vencimientoDe } from '../../src/demo/vencimiento';
import type { VistaFactura } from '../ListaFacturas';
import { dinero, frase } from './lenguaje';
import { iconoDeArchivo } from './mapa-iconos';
import type { VistaLectura } from './Lectura';

/** Formato, confianza y "Para cuándo" de una fila, ya en texto. Se calcula con lo que el estado entrega; no se inventa nada. */
export function vistaLectura(estado: EstadoDemo, fila: FilaDemo): VistaLectura {
  const v = describirVencimiento(vencimientoDe(fila), estado.ahora);
  return {
    formato: etiquetaFormato(fila.fuente?.formato),
    icono: iconoDeArchivo(fila.fuente?.archivo),
    confianza: formatearConfianza(confianzaDe(fila)),
    vence: { clase: v.clase, texto: v.texto },
  };
}

/** Todo lo que una lista de facturas necesita de una fila. */
export function vistaFactura(estado: EstadoDemo, fila: FilaDemo): VistaFactura {
  const f = fila.factura;
  return {
    id: fila.id,
    decision: fila.resultado.decision,
    texto: frase(fila),
    proveedor: f.beneficiario ?? 'Proveedor sin leer',
    monto: dinero(f.monto_centavos, f.moneda),
    razones: construirTraza(fila.resultado, estado.config, f),
    reglas: [...new Set(fila.resultado.razones.map((x) => x.regla))],
    aprobacion: estadoAprobacion(estado, fila),
    lectura: vistaLectura(estado, fila),
  };
}
