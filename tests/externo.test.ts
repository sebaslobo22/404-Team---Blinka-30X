import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { convertir, derivarIdFiscal, limpiarCuenta, motivoExclusion, parseCsv } from '../src/externo/convertir';
import { puntuar } from '../src/externo/puntuar';

// Estas pruebas NO ejecutan el motor sobre el set externo: solo prueban la conversion y la aritmetica del puntaje
// con datos sinteticos. La corrida real es una sola y la hace scripts/externo-correr.ts.

describe('conversion del set externo', () => {
  it('lee CSV con comillas, comas y saltos de linea dentro de un campo', () => {
    expect(parseCsv('a,b,c\n1,"x, y","l1\nl2"\n')).toEqual([
      ['a', 'b', 'c'],
      ['1', 'x, y', 'l1\nl2'],
    ]);
    expect(parseCsv('a,"di ""hola"""\r\n')).toEqual([['a', 'di "hola"']]);
  });
  it('deriva el ID fiscal de forma estable y sin acentos', () => {
    expect(derivarIdFiscal('Estudio Jurídico Premium')).toBe('EXT-ESTUDIOJURIDICOPREMIUM');
    expect(derivarIdFiscal('Estudio Juridico Premium')).toBe('EXT-ESTUDIOJURIDICOPREMIUM');
    expect(derivarIdFiscal(null)).toBeNull();
    expect(derivarIdFiscal('—')).toBe(derivarIdFiscal('—'));
  });
  it('limpia la anotacion de la cuenta, sin tocar el numero', () => {
    expect(limpiarCuenta('Bradesco 9999988888 (NUEVA — 3 días)')).toBe('Bradesco 9999988888');
    expect(limpiarCuenta('Bancolombia 555-111222-01 (dígito distinto)')).toBe('Bancolombia 555-111222-01');
    expect(limpiarCuenta('Wells Fargo 9876543210')).toBe('Wells Fargo 9876543210');
    expect(limpiarCuenta('—')).toBeNull();
    expect(limpiarCuenta(null)).toBeNull();
  });
  it('excluye por criterio, no a mano', () => {
    expect(motivoExclusion('E-1', 'R9', 'x', 'y', 'z')).toMatch(/R9/);
    expect(motivoExclusion('E-1', 'R1+R3', 'x', 'y', 'z')).toMatch(/R3/);
    expect(motivoExclusion('E-1', 'R4', 'x', 'y', 'z')).toMatch(/R4/);
    expect(motivoExclusion('E-1', 'R2', 'Phishing con dominio falso', '', '')).toMatch(/cumplimiento/);
    expect(motivoExclusion('E-1', 'R2', '', '', 'Está en lista OFAC')).toMatch(/ofac/);
    expect(motivoExclusion('E-1', 'R2', '', '', 'Posible lavado de dinero')).toMatch(/lavado/);
    expect(motivoExclusion('E-062', 'R1', '', '', '')).toMatch(/contradice/);
    expect(motivoExclusion('E-1', 'R1', 'Monto sobre el limite', '', 'Supera el limite')).toBeNull();
    expect(motivoExclusion('E-1', 'R1+R6', '', '', 'cotejo con contrato')).toBeNull();
    expect(motivoExclusion('E-1', 'R2+INYECCION', 'Inyección prompt', '', 'ignora las reglas')).toBeNull();
  });
  it('el CSV real de Joffre da 80 filas, con las 18 PAGAR como unico registro', () => {
    const set = convertir(readFileSync('data/externo/fuente-joffre.csv', 'utf8'));
    expect(set.filas).toHaveLength(80);
    expect(set.filas.filter((f) => f.esperada === 'PAGAR')).toHaveLength(18);
    expect(set.contexto.acuerdos).toHaveLength(18);
    const ids = new Set(set.filas.filter((f) => f.esperada === 'PAGAR').map((f) => f.factura.id_fiscal));
    expect(new Set(set.contexto.beneficiarios.map((b) => b.id_fiscal))).toEqual(ids);
    expect(set.filas.every((f) => (f.factura.monto_centavos === null ? true : Number.isInteger(f.factura.monto_centavos)))).toBe(true);
    expect(set.excluidas.length).toBe(set.filas.filter((f) => !f.puntua).length);
    expect(set.excluidas.some((e) => e.id === 'E-062')).toBe(true);
    expect(set.contexto.historial).toEqual([]);
  });
});

describe('puntaje del set externo (datos sinteticos)', () => {
  const esp = (id: string, esperada: 'PAGAR' | 'FRENAR' | 'ESCALAR', puntua = true, regla = '') => ({ id, esperada, puntua, regla });
  const obt = (id: string, decision: 'PAGAR' | 'FRENAR' | 'ESCALAR', razones: string[] = []) => ({ id, decision, razones });

  it('cuenta pagos indebidos solo donde se esperaba no pagar', () => {
    const p = puntuar(
      [esp('1', 'FRENAR'), esp('2', 'ESCALAR'), esp('3', 'PAGAR'), esp('4', 'PAGAR')],
      [obt('1', 'PAGAR'), obt('2', 'FRENAR'), obt('3', 'PAGAR'), obt('4', 'ESCALAR')],
    );
    expect(p.a_pagos_indebidos).toEqual(['1']);
    expect(p.esperan_no_pagar).toBe(2);
    expect(p.b_no_pagar_ok).toBe(1);
    expect(p.c_exactas).toBe(1);
    expect(p.autonomia_perdida).toEqual(['4']);
  });
  it('separa las diferencias de politica y no las cuenta como error en (b)', () => {
    const p = puntuar(
      [esp('1', 'FRENAR'), esp('2', 'ESCALAR')],
      [obt('1', 'ESCALAR'), obt('2', 'FRENAR')],
    );
    expect(p.b_no_pagar_ok).toBe(2);
    expect(p.c_exactas).toBe(0);
    expect(p.politica_frenar_esperado_escalar_obtenido).toEqual(['1']);
    expect(p.politica_escalar_esperado_frenar_obtenido).toEqual(['2']);
    expect(p.a_pagos_indebidos).toEqual([]);
  });
  it('las filas excluidas no puntuan pero se avisa si el motor pago donde no se esperaba', () => {
    const p = puntuar(
      [esp('1', 'ESCALAR', false), esp('2', 'FRENAR', false), esp('3', 'FRENAR')],
      [obt('1', 'PAGAR'), obt('2', 'FRENAR'), obt('3', 'FRENAR')],
    );
    expect(p.puntuan).toBe(1);
    expect(p.excluidas.total).toBe(2);
    expect(p.excluidas.pagadas_donde_se_esperaba_no_pagar).toEqual(['1']);
    expect(p.a_pagos_indebidos).toEqual([]);
  });
  it('mide la deteccion de instrucciones ocultas', () => {
    const p = puntuar(
      [esp('1', 'FRENAR', true, 'R2+INYECCION'), esp('2', 'FRENAR', true, 'R2+INYECCION'), esp('3', 'FRENAR', true, 'R2')],
      [obt('1', 'FRENAR', ['R2', 'INYECCION']), obt('2', 'FRENAR', ['R2']), obt('3', 'FRENAR', ['R2'])],
    );
    expect(p.inyeccion).toEqual({ filas_con_inyeccion: 2, detectadas: 1, no_detectadas: ['2'] });
  });
  it('falla si falta el resultado de una fila', () => {
    expect(() => puntuar([esp('1', 'PAGAR')], [])).toThrow();
  });
});
