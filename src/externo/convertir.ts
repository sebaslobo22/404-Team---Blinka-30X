import type { Decision, FacturaExtraida } from '../engine/types';

/**
 * Conversion mecanica del set externo de Joffre. Funciones puras: ver docs/set-externo.md.
 * No usan el motor: convertir no mira que decidiria Pulso.
 */

export interface FilaExterna {
  id: string;
  escenario: string;
  esperada: Decision;
  regla: string;
  motivo_archivo: string;
  factura: FacturaExtraida;
  puntua: boolean;
  motivo_exclusion: string | null;
}

export interface SetExterno {
  meta: { fuente: string; autor: string; nota: string };
  config: {
    limite_pago_usd_centavos: number;
    tope_mensual_usd_centavos: number;
    ventana_cuenta_dias: number;
    ventana_duplicado_dias: number;
    tolerancia_bps: number;
    monedas_quitadas: string[];
  };
  contexto: {
    ahora: string;
    beneficiarios: { id_fiscal: string; nombre: string; cuentas: { cuenta: string; desde: string }[] }[];
    acuerdos: { id_fiscal: string; moneda: string; monto_centavos: number; categoria: string }[];
    presupuestos: Record<string, number>;
    historial: never[];
  };
  filas: FilaExterna[];
  excluidas: { id: string; motivo: string }[];
}

/** CSV con comillas dobles y saltos de linea dentro de campos. */
export function parseCsv(texto: string): string[][] {
  const filas: string[][] = [];
  let campo = '';
  let fila: string[] = [];
  let comillas = false;
  const t = texto.replace(/^﻿/, '');
  for (let i = 0; i < t.length; i++) {
    const c = t[i] as string;
    if (comillas) {
      if (c === '"' && t[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') comillas = false;
      else campo += c;
    } else if (c === '"') comillas = true;
    else if (c === ',') {
      fila.push(campo);
      campo = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      fila.push(campo);
      campo = '';
      if (fila.length > 1 || fila[0] !== '') filas.push(fila);
      fila = [];
    } else campo += c;
  }
  if (campo !== '' || fila.length > 0) {
    fila.push(campo);
    filas.push(fila);
  }
  return filas;
}

const VACIO = new Set(['', '—', '-', '–']);
const limpio = (s: string | undefined): string | null => {
  const v = (s ?? '').trim();
  return VACIO.has(v) ? null : v;
};

/** "EXT-" mas el proveedor en mayusculas y solo letras y numeros ASCII. */
export function derivarIdFiscal(proveedor: string | null): string | null {
  if (proveedor === null) return null;
  const s = proveedor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  return s === '' ? null : `EXT-${s}`;
}

/** Quita la anotacion entre parentesis, por ejemplo "(NUEVA, 3 dias)". */
export function limpiarCuenta(cuenta: string | null): string | null {
  if (cuenta === null) return null;
  const v = cuenta.replace(/\s*\(.*$/s, '').trim();
  return VACIO.has(v) ? null : v;
}

export function decisionDe(texto: string): Decision {
  if (texto.includes('PAGAR')) return 'PAGAR';
  if (texto.includes('FRENAR')) return 'FRENAR';
  if (texto.includes('ESCALAR')) return 'ESCALAR';
  throw new Error(`Decision no reconocida: ${texto}`);
}

const sinAcentos = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const PALABRAS_CUMPLIMIENTO = ['ofac', 'lavado', 'phishing', 'lista negra', 'sancion', 'homoglif'];
const REGLAS_FUERA = ['R3', 'R4', 'R9'];
export const ID_INCONSISTENTE = 'E-062';

/** Motivo de exclusion del puntaje, o null si puntua. Criterios de docs/set-externo.md. */
export function motivoExclusion(id: string, regla: string, escenario: string, subcategoria: string, motivo: string): string | null {
  const tokens = regla.split('+').map((x) => x.trim().toUpperCase());
  const fuera = REGLAS_FUERA.filter((r) => tokens.includes(r));
  if (fuera.length > 0) return `regla ${fuera.join(' y ')}: no existe en Pulso, no hay datos en el archivo o es una decision de cumplimiento`;
  const texto = sinAcentos(`${escenario} ${subcategoria} ${motivo}`);
  const palabra = PALABRAS_CUMPLIMIENTO.find((p) => texto.includes(p));
  if (palabra) return `cumplimiento o fraude (${palabra}): fuera del alcance del reto`;
  if (id === ID_INCONSISTENTE) return 'el archivo se contradice: exactamente USD 25.000 marcado ESCALAR con su R1 "auto-aprobar hasta 25K"';
  return null;
}

export function convertir(csv: string): SetExterno {
  const tabla = parseCsv(csv);
  const cab = tabla[0] as string[];
  const col = (nombre: string): number => {
    const i = cab.findIndex((c) => c.trim().toLowerCase().startsWith(nombre.toLowerCase()));
    if (i < 0) throw new Error(`Falta la columna ${nombre}`);
    return i;
  };
  const iID = col('ID');
  const iEsc = col('Escenario');
  const iSub = col('Árbol');
  const iProv = col('Proveedor');
  const iDesc = col('Servicio');
  const iCat = col('Categoría');
  const iMonto = col('Monto');
  const iMon = col('Moneda');
  const iFecha = col('Fecha Emisión');
  const iCuenta = col('Cuenta');
  const iDec = col('Decisión');
  const iRegla = col('Regla');
  const iMot = col('Motivo');

  const filas: FilaExterna[] = [];
  for (const r of tabla.slice(1)) {
    if (!r[iID] || !r[iID]!.startsWith('E-')) continue;
    const proveedor = limpio(r[iProv]);
    const monto = Number((r[iMonto] ?? '').replace(/,/g, ''));
    const montoCentavos = Number.isFinite(monto) ? Math.round(monto * 100) : null;
    const regla = (r[iRegla] ?? '').trim();
    const esperada = decisionDe(r[iDec] ?? '');
    const exclusion = motivoExclusion(r[iID]!, regla, r[iEsc] ?? '', r[iSub] ?? '', r[iMot] ?? '');
    filas.push({
      id: r[iID]!,
      escenario: (r[iEsc] ?? '').trim(),
      esperada,
      regla,
      motivo_archivo: (r[iMot] ?? '').trim(),
      factura: {
        numero_factura: r[iID]!,
        beneficiario: proveedor,
        id_fiscal: derivarIdFiscal(proveedor),
        cuenta: limpiarCuenta(limpio(r[iCuenta])),
        monto_centavos: montoCentavos,
        moneda: limpio(r[iMon]),
        fecha_emision: limpio(r[iFecha]),
        categoria: limpio(r[iCat]),
        texto_fuente: (r[iDesc] ?? '').trim(),
      },
      puntua: exclusion === null,
      motivo_exclusion: exclusion,
    });
  }

  // Contexto: registrado = aparece en alguna fila PAGAR del propio archivo.
  const mapa = new Map<string, { nombre: string; cuentas: Set<string> }>();
  const acuerdos: SetExterno['contexto']['acuerdos'] = [];
  for (const f of filas) {
    if (f.esperada !== 'PAGAR') continue;
    const { id_fiscal, beneficiario, cuenta, monto_centavos, moneda, categoria } = f.factura;
    if (!id_fiscal || !beneficiario || monto_centavos === null || !moneda || !categoria) continue;
    const e = mapa.get(id_fiscal) ?? { nombre: beneficiario, cuentas: new Set<string>() };
    if (cuenta) e.cuentas.add(cuenta);
    mapa.set(id_fiscal, e);
    acuerdos.push({ id_fiscal, moneda, monto_centavos, categoria });
  }
  const NO_BINDING = 100_000_000_000; // USD mil millones en centavos: nunca se activa
  const presupuestos: Record<string, number> = {};
  for (const f of filas) if (f.factura.categoria) presupuestos[f.factura.categoria] = NO_BINDING;
  const fechas = filas.map((f) => f.factura.fecha_emision ?? '').filter((x) => x !== '').sort();

  return {
    meta: {
      fuente: 'data/externo/fuente-joffre.csv',
      autor: 'Joffre (equipo 404)',
      nota: 'Conversion mecanica. Ver docs/set-externo.md. Datos ficticios.',
    },
    config: {
      limite_pago_usd_centavos: 25_000 * 100,
      tope_mensual_usd_centavos: NO_BINDING,
      ventana_cuenta_dias: 7,
      ventana_duplicado_dias: 30,
      tolerancia_bps: 200,
      monedas_quitadas: ['VES'],
    },
    contexto: {
      ahora: `${fechas[fechas.length - 1]}T12:00:00Z`,
      beneficiarios: [...mapa.entries()].map(([id_fiscal, v]) => ({
        id_fiscal,
        nombre: v.nombre,
        cuentas: [...v.cuentas].map((cuenta) => ({ cuenta, desde: '2026-01-01' })),
      })),
      acuerdos,
      presupuestos,
      historial: [],
    },
    filas,
    excluidas: filas.filter((f) => !f.puntua).map((f) => ({ id: f.id, motivo: f.motivo_exclusion as string })),
  };
}
