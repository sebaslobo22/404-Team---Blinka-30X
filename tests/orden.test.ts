import { describe, expect, it } from 'vitest';
import dataset from '../data/dev-set.json';
import defensas from '../data/dev-set-defensas.json';
import { crearEstado, instruccionPago, resolver } from '../src/demo/estado';
import type { EstadoDemo } from '../src/demo/estado';
import {
  AVISO_ORDEN, COLUMNAS_CSV, celdaCsv, construirOrden, limpiarReferencia, marcarPagada, montoUnidades, ordenDe, ordenes, ordenesCsv, ordenesPorPagar,
  paisDeIdFiscal, rielSugerido, textoParaPagar,
} from '../src/demo/orden';
import { obtenerEstado, reiniciarEstado } from '../src/demo/singleton';
import { POST as postPagos } from '../app/api/pagos/route';
import { GET as getOrdenes } from '../app/api/ordenes/route';
import { GET as getCsv } from '../app/api/ordenes/csv/route';
import { POST as postRestaurar } from '../app/api/demo/restaurar/route';

const fila = (e: EstadoDemo, id: string) => e.filas.find((f) => f.id === id)!;

/** Lector CSV minimo (comillas dobles, CRLF) para comprobar lo que sale. */
function leerCsv(texto: string): string[][] {
  const filas: string[][] = []; let fila: string[] = []; let celda = ''; let comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]!;
    if (comillas) { if (c === '"' && texto[i + 1] === '"') { celda += '"'; i++; } else if (c === '"') comillas = false; else celda += c; continue; }
    if (c === '"') comillas = true;
    else if (c === ',') { fila.push(celda); celda = ''; }
    else if (c === '\r' && texto[i + 1] === '\n') { fila.push(celda); filas.push(fila); fila = []; celda = ''; i++; }
    else celda += c;
  }
  if (celda || fila.length) { fila.push(celda); filas.push(fila); }
  return filas;
}

describe('riel sugerido', () => {
  it('pais desde el prefijo del ID fiscal ficticio', () => {
    expect(paisDeIdFiscal('FIC-PE-001')).toBe('PE');
    expect(paisDeIdFiscal('FIC-CO-002')).toBe('CO');
    expect(paisDeIdFiscal('fic-mx-006')).toBe('MX');
    expect(paisDeIdFiscal('J-12345678')).toBeNull();
    expect(paisDeIdFiscal(null)).toBeNull();
  });

  // Cada par moneda / pais que aparece en los acuerdos y facturas del set, con su riel esperado.
  const ESPERADO: Record<string, string> = {
    'PEN/PE': 'POR_DEFINIR', // Blinka tiene ruta en Peru pero no la detalla: lo elige una persona.
    'COP/CO': 'BRE_B',
    'USD/VE': 'SWIFT',
    'USD/EC': 'SWIFT',
    'BRL/BR': 'PIX',
    'MXN/MX': 'SPEI',
  };
  it('cada moneda y pais del set tiene su riel', () => {
    const vistos = new Set<string>();
    for (const a of dataset.contexto.acuerdos) vistos.add(`${a.moneda}/${paisDeIdFiscal(a.id_fiscal)}`);
    for (const f of [...dataset.facturas, ...defensas.facturas] as { factura?: { moneda?: string | null; id_fiscal?: string | null } }[]) {
      if (f.factura?.moneda && f.factura.id_fiscal) vistos.add(`${f.factura.moneda}/${paisDeIdFiscal(f.factura.id_fiscal)}`);
    }
    expect(vistos.size).toBeGreaterThanOrEqual(6);
    for (const par of vistos) {
      expect(ESPERADO[par], `par sin riel esperado: ${par}`).toBeDefined();
      const [moneda, pais] = par.split('/');
      expect(rielSugerido(moneda, pais ?? null).codigo, par).toBe(ESPERADO[par]);
    }
  });
  it('rieles de Blinka que el set no usa', () => {
    expect(rielSugerido('EUR', 'ES').codigo).toBe('SEPA');
    expect(rielSugerido('EUR', 'DE').codigo).toBe('SEPA');
    expect(rielSugerido('ARS', 'AR').codigo).toBe('CBU_CVU');
    expect(rielSugerido('USD', 'US')).toMatchObject({ codigo: 'ACH', nombre: 'ACH' });
    expect(rielSugerido('USD', 'CO')).toMatchObject({ codigo: 'SWIFT', nombre: 'Wire internacional (SWIFT)' });
    expect(rielSugerido('cop', 'CO').codigo).toBe('BRE_B');
  });
  it('por definir: lo elige una persona (no se inventan rieles)', () => {
    const casos: [unknown, string | null][] = [
      ['PEN', 'PE'], ['GBP', 'GB'], ['VES', 'VE'], ['USD', null], ['COP', 'PE'], ['MXN', 'US'], ['BRL', null], [null, 'CO'], [undefined, null], ['', 'US'], ['EUR', 'PE'], ['EUR', 'US'], ['EUR', null],
    ];
    for (const [m, p] of casos) {
      expect(rielSugerido(m, p), `${String(m)}/${String(p)}`).toMatchObject({ codigo: 'POR_DEFINIR', nombre: 'Por definir: lo elige una persona' });
    }
  });
});

describe('orden lista para Blinka', () => {
  it('montos en unidades con 2 decimales sin flotantes', () => {
    expect(montoUnidades(980000)).toBe('9800.00');
    expect(montoUnidades(119000)).toBe('1190.00');
    expect(montoUnidades(1)).toBe('0.01');
    expect(montoUnidades(800000000)).toBe('8000000.00');
    expect(montoUnidades(12345)).toBe('123.45');
    expect(() => montoUnidades(1.5)).toThrow();
  });
  it('las PAGAR del set salen con referencia, concepto, riel, version, hash y estado EMITIDA', async () => {
    const e = await crearEstado();
    const lista = ordenes(e);
    expect(lista.map((o) => o.factura_id)).toEqual(['F-001', 'F-002', 'F-003', 'F-004']);
    expect(lista.map((o) => o.riel.codigo)).toEqual(['POR_DEFINIR', 'BRE_B', 'SWIFT', 'PIX']);
    for (const o of lista) {
      const f = fila(e, o.factura_id);
      expect(o).toMatchObject({
        aviso: AVISO_ORDEN,
        referencia: f.factura.numero_factura,
        concepto: f.factura.categoria,
        fecha_sugerida: null, // las facturas ficticias no traen vencimiento
        version_reglas: f.resultado.version_reglas,
        decision_hash: f.entrada.hash,
        origen_aprobacion: 'AUTOMATICA_REGLAS',
        aprobado_por: null,
        estado: 'EMITIDA',
        pago: null,
      });
      // Conserva los datos de la instruccion actual.
      expect(o).toMatchObject(instruccionPago(e, f)!);
    }
  });
  it('construirOrden es pura y usa el vencimiento si existe', () => {
    const instr = { factura_id: 'X-1', beneficiario: 'Proveedor US', id_fiscal: 'FIC-US-001', cuenta: 'ACC-US-1', monto_centavos: 250050, moneda: 'USD',
      origen_aprobacion: 'PERSONA' as const, aprobado_por: 'revisor-demo', decision_hash: 'a'.repeat(64) };
    const datos = { numero_factura: 'N-9', categoria: 'Operaciones', vencimiento: '2026-11-01', version_reglas: 'v1' };
    const copia = structuredClone(instr);
    const o = construirOrden(instr, datos);
    expect(instr).toEqual(copia);
    expect(o).toMatchObject({ monto: '2500.50', referencia: 'N-9', concepto: 'Operaciones', fecha_sugerida: '2026-11-01', pais_beneficiario: 'US', estado: 'EMITIDA' });
    expect(o.riel.codigo).toBe('ACH');
    expect(construirOrden(instr, datos)).toEqual(o);
    expect(textoParaPagar(o)).toContain('Monto: USD 2500.50');
    expect(textoParaPagar(o)).toContain(AVISO_ORDEN);
  });
  it('FRENAR y ESCALAR sin aprobar no tienen orden; ESCALAR aprobado si, con origen PERSONA', async () => {
    const e = await crearEstado();
    for (const f of e.filas) if (f.resultado.decision !== 'PAGAR') expect(ordenDe(e, f), f.id).toBeNull();
    await resolver(e, 'F-005', 'APROBAR', 'revisor-demo');
    expect(ordenDe(e, fila(e, 'F-005'))).toMatchObject({ origen_aprobacion: 'PERSONA', aprobado_por: 'revisor-demo', riel: { codigo: 'SWIFT' }, monto: '9800.00' });
    await resolver(e, 'F-008', 'RECHAZAR', 'revisor-demo');
    expect(ordenDe(e, fila(e, 'F-008'))).toBeNull();
  });
});

describe('marcar como pagada', () => {
  it('FRENAR no puede marcarse pagada', async () => {
    const e = await crearEstado();
    for (const f of e.filas.filter((x) => x.resultado.decision === 'FRENAR')) {
      expect(await marcarPagada(e, f.id, 'BANCO-123', 'revisor-demo'), f.id).toMatchObject({ ok: false, codigo: 'SIN_ORDEN' });
    }
    expect(e.pagos.size).toBe(0);
    expect(await e.registroPagos.verificar()).toMatchObject({ ok: true, n: 0 });
  });
  it('ESCALAR sin aprobar (o rechazado) no puede', async () => {
    const e = await crearEstado();
    expect(await marcarPagada(e, 'F-005', 'BANCO-123', 'revisor-demo')).toMatchObject({ ok: false, codigo: 'SIN_ORDEN' });
    await resolver(e, 'F-008', 'RECHAZAR', 'revisor-demo');
    expect(await marcarPagada(e, 'F-008', 'BANCO-123', 'revisor-demo')).toMatchObject({ ok: false, codigo: 'SIN_ORDEN' });
    expect(e.pagos.size).toBe(0);
  });
  it('marcar dos veces da YA_RESUELTA y queda una sola entrada encadenada', async () => {
    const e = await crearEstado();
    const r = await marcarPagada(e, 'F-002', '  TRX-0001  ', 'revisor-demo');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.evento).toMatchObject({ factura_id: 'F-002', referencia_banco: 'TRX-0001', marcado_por: 'revisor-demo', hash_decision: fila(e, 'F-002').entrada.hash });
      expect(r.orden).toMatchObject({ estado: 'MARCADA_PAGADA', pago: { referencia_banco: 'TRX-0001' } });
    }
    expect(await marcarPagada(e, 'F-002', 'TRX-0002', 'revisor-demo')).toMatchObject({ ok: false, codigo: 'YA_RESUELTA' });
    expect(await e.registroPagos.verificar()).toMatchObject({ ok: true, n: 1 });
    // Marcar no cambia ninguna decision ni el registro de decisiones.
    expect(e.filas.map((f) => f.resultado.decision)).toEqual(e.filas.map((f) => f.esperada));
    expect(await e.registroDecisiones.verificar(e.anclaInicial)).toMatchObject({ ok: true, n: 18 });
  });
  it('dos clics simultaneos marcan una sola vez', async () => {
    const e = await crearEstado();
    const rs = await Promise.all([marcarPagada(e, 'F-001', 'A', 'revisor-demo'), marcarPagada(e, 'F-001', 'B', 'revisor-demo')]);
    expect(rs.filter((r) => r.ok)).toHaveLength(1);
    expect(await e.registroPagos.verificar()).toMatchObject({ ok: true, n: 1 });
  });
  it('si falla la escritura no queda marcada', async () => {
    const e = await crearEstado();
    e.registroPagos.anadir = async () => { throw new Error('disco lleno'); };
    await expect(marcarPagada(e, 'F-001', 'TRX', 'revisor-demo')).rejects.toThrow();
    expect(e.pagos.size).toBe(0);
    expect(ordenDe(e, fila(e, 'F-001'))?.estado).toBe('EMITIDA');
  });
  it('referencia del banco: texto no vacio, hasta 64 caracteres, sin caracteres de control', async () => {
    expect(limpiarReferencia('x'.repeat(64))).toBe('x'.repeat(64));
    for (const mala of ['', '   ', 'x'.repeat(65), 'a\nb', 42, null, undefined, {}]) expect(limpiarReferencia(mala), String(mala)).toBeNull();
    const e = await crearEstado();
    expect(await marcarPagada(e, 'F-001', '', 'revisor-demo')).toMatchObject({ ok: false, codigo: 'REFERENCIA_INVALIDA' });
    expect(await marcarPagada(e, 'NO-EXISTE', 'TRX', 'revisor-demo')).toMatchObject({ ok: false, codigo: 'NO_ENCONTRADA' });
  });
});

describe('CSV del lote', () => {
  it('una fila por orden, encabezados claros y montos correctos', async () => {
    const e = await crearEstado();
    await resolver(e, 'F-005', 'APROBAR', 'revisor-demo');
    await marcarPagada(e, 'F-003', 'TRX-77', 'revisor-demo');
    const lista = ordenes(e);
    const filas = leerCsv(ordenesCsv(lista));
    expect(filas[0]).toEqual([...COLUMNAS_CSV]);
    expect(filas).toHaveLength(lista.length + 1);
    expect(lista).toHaveLength(5);
    const col = (n: (typeof COLUMNAS_CSV)[number]) => COLUMNAS_CSV.indexOf(n);
    const montos = Object.fromEntries(filas.slice(1).map((f) => [f[col('factura')], f[col('monto')]]));
    expect(montos).toEqual({ 'F-001': '6000.00', 'F-002': '8000000.00', 'F-003': '1200.00', 'F-004': '11000.00', 'F-005': '9800.00' });
    for (const f of filas.slice(1)) expect(f, f[0]).toHaveLength(COLUMNAS_CSV.length);
    const f3 = filas.find((f) => f[0] === 'F-003')!;
    expect([f3[col('estado')], f3[col('referencia_banco')], f3[col('riel')]]).toEqual(['MARCADA_PAGADA', 'TRX-77', 'Wire internacional (SWIFT)']);
    const f5 = filas.find((f) => f[0] === 'F-005')!;
    expect([f5[col('origen')], f5[col('aprobado_por')], f5[col('moneda')]]).toEqual(['Persona', 'revisor-demo', 'USD']);
  });
  it('el lote por pagar no trae las ordenes ya marcadas como pagadas (evita pagar dos veces)', async () => {
    const e = await crearEstado();
    await marcarPagada(e, 'F-002', 'TRX-9', 'revisor-demo');
    const lote = ordenesPorPagar(e);
    expect(lote.map((o) => o.factura_id)).toEqual(['F-001', 'F-003', 'F-004']);
    expect(lote.every((o) => o.estado === 'EMITIDA')).toBe(true);
    expect(leerCsv(ordenesCsv(lote)).map((f) => f[0])).not.toContain('F-002');
    expect(ordenes(e)).toHaveLength(4);
  });
  it('un lote vacio deja solo los encabezados', () => {
    expect(leerCsv(ordenesCsv([]))).toEqual([[...COLUMNAS_CSV]]);
  });
  it('escapa comillas y comas, y neutraliza formulas que vienen de una factura', () => {
    expect(celdaCsv('Rivas, Marcos')).toBe('"Rivas, Marcos"');
    expect(celdaCsv('dice "hola"')).toBe('"dice ""hola"""');
    expect(celdaCsv('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(celdaCsv('+1')).toBe(`"'+1"`);
    expect(celdaCsv('@SUM(A1)')).toBe(`"'@SUM(A1)"`);
    expect(celdaCsv(null)).toBe('""');
    // Toda celda va entre comillas: un ';' (separador de Excel en espanol) o un tabulador no la parte.
    expect(celdaCsv('ACME;=HYPERLINK("http://x")')).toBe('"ACME;=HYPERLINK(""http://x"")"');
    expect(celdaCsv('a\t=1')).toBe('"a\t=1"');
    expect(celdaCsv(980000)).toBe('"980000"');
  });
});

describe('rutas de ordenes y pagos', () => {
  const pedir = (cuerpo: unknown) => new Request('http://local/api/pagos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });

  it('POST /api/pagos rechaza FRENAR con 403 y el mismo patron que las aprobaciones', async () => {
    await reiniciarEstado();
    const r = await postPagos(pedir({ factura_id: 'F-006', referencia_banco: 'TRX' }));
    expect(r.status).toBe(403);
    expect(await r.json()).toMatchObject({ ok: false, codigo: 'SIN_ORDEN', error: expect.any(String) });
    const r2 = await postPagos(pedir({ factura_id: 'F-005', referencia_banco: 'TRX' }));
    expect(r2.status).toBe(403);
    expect((await postPagos(pedir({ factura_id: 'F-001', referencia_banco: 'x'.repeat(65) }))).status).toBe(400);
    // Un cuerpo que no se declara JSON (por ejemplo un formulario de otro sitio) se rechaza.
    const texto = new Request('http://local/api/pagos', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ factura_id: 'F-001', referencia_banco: 'TRX' }) });
    expect((await postPagos(texto)).status).toBe(415);
    expect((await obtenerEstado()).pagos.size).toBe(0);
  });
  it('GET /api/ordenes y el CSV reflejan lo marcado; restaurar limpia los pagos', async () => {
    await reiniciarEstado();
    const ok = await postPagos(pedir({ factura_id: 'F-001', referencia_banco: 'TRX-1' }));
    expect(ok.status).toBe(200);
    expect((await postPagos(pedir({ factura_id: 'F-001', referencia_banco: 'TRX-1' }))).status).toBe(409);
    const json = await (await getOrdenes()).json();
    expect(json).toMatchObject({ aviso: AVISO_ORDEN, n: 4 });
    expect(json.ordenes.find((o: { factura_id: string }) => o.factura_id === 'F-001')).toMatchObject({ estado: 'MARCADA_PAGADA' });
    const csv = await getCsv(new Request('http://local/api/ordenes/csv'));
    expect(csv.headers.get('content-type')).toMatch(/text\/csv/);
    expect(csv.headers.get('content-disposition')).toMatch(/attachment/);
    const lote = leerCsv((await csv.text()).replace(/^﻿/, ''));
    expect(lote).toHaveLength(4); // encabezados + 3 por pagar: F-001 ya se marco
    expect(lote.map((f) => f[0])).not.toContain('F-001');
    const todas = leerCsv((await (await getCsv(new Request('http://local/api/ordenes/csv?incluir=pagadas'))).text()).replace(/^﻿/, ''));
    expect(todas).toHaveLength(5);
    expect((await obtenerEstado()).pagos.size).toBe(1);

    expect((await postRestaurar()).status).toBe(200);
    const e = await obtenerEstado();
    expect(e.pagos.size).toBe(0);
    expect(await e.registroPagos.verificar()).toMatchObject({ ok: true, n: 0 });
    expect(ordenes(e).every((o) => o.estado === 'EMITIDA')).toBe(true);
    // Despues de restaurar se puede volver a marcar.
    expect((await postPagos(pedir({ factura_id: 'F-001', referencia_banco: 'TRX-2' }))).status).toBe(200);
    await reiniciarEstado();
  });
});
