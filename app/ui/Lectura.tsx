import { Ic } from './iconos';
import type { NombreIcono } from './mapa-iconos';
import type { ClaseVencimiento } from '../../src/demo/vencimiento';

/** Lo mínimo de la lectura que se muestra en una tarjeta de factura. Son textos ya listos, aptos para pasar al navegador. */
export interface VistaLectura {
  /** "PDF", "Imagen", "Correo" o "Chat". */
  formato: string;
  icono: NombreIcono;
  /** "95 %" o "Sin dato". */
  confianza: string;
  /** "Para cuándo": frase y clase para darle énfasis cuando ya venció. */
  vence: { clase: ClaseVencimiento; texto: string };
}

/** Una sola línea discreta: formato del documento, confianza de la lectura y para cuándo. */
export function LineaLectura({ lectura }: { lectura: VistaLectura }) {
  const { formato, icono, confianza, vence } = lectura;
  return <ul className="lectura-meta" aria-label="Cómo se leyó">
    <li className="con-ic"><Ic nombre={icono} size={20} /><span><span className="sr-only">Documento: </span>{formato}</span></li>
    <li className="con-ic"><Ic nombre="ojo" size={20} /><span>Confianza {confianza}</span></li>
    <li className={`con-ic vence vence-${vence.clase}`}><Ic nombre={vence.clase === 'sin' || vence.clase === 'dudosa' ? 'calendario' : 'calendario-limite'} size={20} /><span><strong>Para cuándo:</strong> {vence.texto}</span></li>
  </ul>;
}
