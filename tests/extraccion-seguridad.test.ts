import { afterEach, describe, expect, it, vi } from 'vitest';
import reglas from '../docs/reglas-R1-R8.json';
import dataset from '../data/dev-set.json';
import { decidir } from '../src/engine/decide';
import { cargarConfig } from '../src/engine/config';
import type { Contexto } from '../src/engine/types';
import { alertasAritmetica, alertasTipoDocumento, tiposPorMarcas } from '../src/extraccion/defensas';
import { combinar, extraerFactura, validarLectura, type DetalleLectura, type Lectura } from '../src/extraccion/extraer';
import { centavosATexto, montoFirmadoACentavos } from '../src/extraccion/monto';

const cfg = cargarConfig(reglas);
const TEXTO = 'TALLER ORINOCO C.A.\nRIF FIC-VE-003\nFactura TO-0003\nFecha 2026-10-07\nTotal USD 1.200,00\nCuenta ACC-VE-0003';
const lectura = (o: Partial<Lectura> = {}): Lectura => ({
  beneficiario: 'Taller Orinoco C.A.', id_fiscal: 'FIC-VE-003', cuenta: 'ACC-VE-0003', monto: '1200.00', moneda: 'USD',
  moneda_explicita: true, fecha: '2026-10-07', fecha_vencimiento: null, numero_factura: 'TO-0003', categoria: 'Operaciones',
  confianza: 0.95, instrucciones_detectadas: false, ...o,
});
const detalle = (modelo: string, datos: Lectura): DetalleLectura => ({
  modelo, modelo_servido: modelo, ok: true, datos, tokens_entrada: 1, tokens_salida: 1, costo_usd: 0, ms: 1,
});
const dos = (a: Partial<Lectura> = {}, b: Partial<Lectura> = {}) => [detalle('m/a', lectura(a)), detalle('n/b', lectura(b))];
const MODELOS = ['m/a', 'n/b'] as const;
const leer = (texto: string, a: Partial<Lectura> = {}, b: Partial<Lectura> = {}) => combinar({ texto }, dos(a, b), MODELOS).factura;

/** Pasa la factura por el motor con un contexto de ejemplo. */
function motor(f: ReturnType<typeof leer>) {
  const ctx = structuredClone(dataset.contexto) as unknown as Contexto;
  return decidir('X', { ...f, id_fiscal: 'FIC-VE-003', beneficiario: 'Taller Orinoco C.A.', cuenta: 'ACC-VE-0003', categoria: 'Operaciones' }, ctx, cfg);
}

// ---------------------------------------------------------------------------------------------
// 1. Documentos que no son un cobro
// ---------------------------------------------------------------------------------------------
describe('brecha 1: tipo de documento', () => {
  it.each(['nota_credito', 'proforma', 'cotizacion', 'recibo', 'estado_de_cuenta', 'otro'])('el modelo dice %s -> no_es_cobro', (tipo) => {
    expect(leer(TEXTO, { tipo_documento: tipo }).alertas).toContain(`no_es_cobro:${tipo}`);
  });

  it('basta con UNA de las dos lecturas', () => {
    expect(leer(TEXTO, {}, { tipo_documento: 'proforma' }).alertas).toContain('no_es_cobro:proforma');
    expect(leer(TEXTO, { tipo_documento: 'recibo' }, {}).alertas).toContain('no_es_cobro:recibo');
  });

  it.each([
    ['NOTA DE CRÉDITO No. 5', 'nota_credito'],
    ['Nota de credito', 'nota_credito'],
    ['Credit Note 77', 'nota_credito'],
    ['FACTURA PROFORMA', 'proforma'],
    ['Pro forma invoice', 'proforma'],
    ['Cotización válida 15 días', 'cotizacion'],
    ['Quote #12', 'cotizacion'],
    ['Recibo de pago', 'recibo'],
    ['Payment receipt', 'recibo'],
    ['Estado de cuenta al 30/09', 'estado_de_cuenta'],
  ])('marca en el texto %j -> no_es_cobro:%s aunque el modelo diga factura', (marca, tipo) => {
    const f = leer(`${TEXTO}\n${marca}`, { tipo_documento: 'factura' }, { tipo_documento: 'factura' });
    expect(f.alertas).toContain(`no_es_cobro:${tipo}`);
  });

  it('la deteccion por texto no depende del modelo (sin tipo_documento tambien dispara)', () => {
    expect(leer(`${TEXTO}\nNota de crédito`).alertas).toContain('no_es_cobro:nota_credito');
  });

  it.each(['factura', 'cuenta_de_cobro', null, undefined])('tipo normal %s NO dispara', (tipo) => {
    const f = leer(TEXTO, { tipo_documento: tipo }, { tipo_documento: tipo });
    expect(f.alertas).toEqual([]);
  });

  it('palabras parecidas no disparan (quoted, cuenta, recibido)', () => {
    expect(tiposPorMarcas('He quoted el servicio. Cuenta ACC-1. Recibido conforme. Factura de cuenta de cobro')).toEqual([]);
  });

  it('el tipo desconocido que no esta en la lista es un fallo de esquema (falla cerrada)', () => {
    expect(validarLectura(lectura({ tipo_documento: 'pagare' })).ok).toBe(false);
    expect(validarLectura(lectura({ tipo_documento: 'factura' })).ok).toBe(true);
    expect(validarLectura(lectura()).ok).toBe(true); // campo ausente = no evaluado
  });

  it('alertasTipoDocumento sobre imagen (sin texto) solo usa lo que dijo el modelo', () => {
    expect(alertasTipoDocumento(undefined, ['cotizacion', 'factura'])).toEqual(['no_es_cobro:cotizacion']);
    expect(alertasTipoDocumento(undefined, ['factura', null])).toEqual([]);
  });

  it('el motor ESCALA un documento que no es cobro (baseline limpia vs con alerta)', () => {
    const limpia = motor(leer(TEXTO));
    const nota = motor(leer(`${TEXTO}\nNota de crédito`));
    expect(nota.decision).not.toBe('PAGAR');
    expect(nota.razones.map((r) => r.regla)).toContain('EXTRACCION');
    expect(limpia.razones.map((r) => r.regla)).not.toContain('EXTRACCION');
  });
});

// ---------------------------------------------------------------------------------------------
// 2. Chequeo aritmetico
// ---------------------------------------------------------------------------------------------
describe('brecha 2: aritmetica del desglose', () => {
  it('montoFirmadoACentavos / centavosATexto', () => {
    expect(montoFirmadoACentavos('-12.50')).toBe(-1250n);
    expect(montoFirmadoACentavos('+3')).toBe(300n);
    expect(montoFirmadoACentavos('1,5')).toBeNull();
    expect(montoFirmadoACentavos(5)).toBeNull();
    expect(centavosATexto(-1250n)).toBe('-12.50');
    expect(centavosATexto(5n)).toBe('0.05');
  });

  it('sin desglose no se evalua (sin alerta)', () => {
    expect(leer(TEXTO).alertas).toEqual([]);
    expect(leer(TEXTO, { subtotal: null, impuestos: null, descuento: null, lineas: null }).alertas).toEqual([]);
    expect(leer(TEXTO, { subtotal: '900.00' }).alertas).toEqual([]); // subtotal sin impuestos: no se evalua
  });

  it('lineas que suman el total: sin alerta; lineas que no: alerta', () => {
    const buenas = [{ descripcion: 'A', monto: '700.00' }, { descripcion: 'B', monto: '500.00' }];
    expect(leer(TEXTO, { lineas: buenas }, { lineas: buenas }).alertas).toEqual([]);
    const malas = [{ descripcion: 'A', monto: '700.00' }, { descripcion: 'B', monto: '400.00' }];
    expect(leer(TEXTO, { lineas: malas }).alertas?.some((a) => a.startsWith('aritmetica_no_cuadra:lineas_1100.00_vs_total_1200.00'))).toBe(true);
  });

  it('lineas contra el subtotal cuando hay subtotal', () => {
    const lineas = [{ descripcion: 'A', monto: '1000.00' }];
    expect(alertasAritmetica({ monto: '1200.00', subtotal: '1000.00', lineas })).toEqual([]);
    expect(alertasAritmetica({ monto: '1200.00', subtotal: '1100.00', lineas })[0]).toContain('vs_subtotal_1100.00');
  });

  it('subtotal - descuento + impuestos = total', () => {
    const ok = { monto: '1200.00', subtotal: '1100.00', descuento: '100.00', impuestos: [{ nombre: 'IVA', monto: '200.00' }] };
    expect(alertasAritmetica(ok)).toEqual([]);
    expect(alertasAritmetica({ ...ok, monto: '1250.00' })[0]).toContain('aritmetica_no_cuadra:subtotal_menos_descuento_mas_impuestos_1200.00_vs_total_1250.00');
  });

  it('retenciones (impuesto negativo) restan', () => {
    const d = { monto: '1000.00', subtotal: '1100.00', impuestos: [{ nombre: 'IVA', monto: '176.00' }, { nombre: 'ReteFuente', monto: '-276.00' }] };
    expect(alertasAritmetica(d)).toEqual([]);
    expect(alertasAritmetica({ ...d, monto: '1276.00' })).toHaveLength(1);
  });

  it('impuestos vacios con subtotal distinto del total: alerta', () => {
    expect(alertasAritmetica({ monto: '1200.00', subtotal: '1000.00', impuestos: [] })).toHaveLength(1);
    expect(alertasAritmetica({ monto: '1000.00', subtotal: '1000.00', impuestos: [] })).toEqual([]);
  });

  it('tolerancia de 1 centavo por renglon, no mas', () => {
    const imp = [{ nombre: 'IVA', monto: '19.99' }];
    // 1 + 1 impuesto = 2 renglones -> tolerancia 2 centavos
    expect(alertasAritmetica({ monto: '119.99', subtotal: '100.00', impuestos: imp })).toEqual([]);
    expect(alertasAritmetica({ monto: '120.01', subtotal: '100.00', impuestos: imp })).toEqual([]);
    expect(alertasAritmetica({ monto: '120.02', subtotal: '100.00', impuestos: imp })).toHaveLength(1);
    // 3 lineas -> tolerancia 3 centavos
    const lineas = ['10.00', '10.00', '10.00'].map((monto) => ({ descripcion: 'x', monto }));
    expect(alertasAritmetica({ monto: '30.03', lineas })).toEqual([]);
    expect(alertasAritmetica({ monto: '30.04', lineas })).toHaveLength(1);
  });

  it('un importe ilegible dentro de un desglose dado es alerta (falla cerrada)', () => {
    expect(alertasAritmetica({ monto: '100.00', lineas: [{ descripcion: 'x', monto: '1.000,00' }] })).toEqual(['aritmetica_no_cuadra:desglose_ilegible']);
    expect(alertasAritmetica({ monto: '100.00', subtotal: 'abc', impuestos: [] })).toEqual(['aritmetica_no_cuadra:desglose_ilegible']);
  });

  it('montos grandes sin perder centavos (BigInt)', () => {
    const d = { monto: '9007199254740.99', lineas: [{ descripcion: 'a', monto: '9007199254740.98' }, { descripcion: 'b', monto: '0.01' }] };
    expect(alertasAritmetica(d)).toEqual([]);
    expect(alertasAritmetica({ ...d, monto: '9007199254741.99' })).toHaveLength(1);
  });

  it('validarLectura rechaza desgloses mal formados', () => {
    expect(validarLectura(lectura({ lineas: [{ descripcion: 'x', monto: 5 as unknown as string }] })).ok).toBe(false);
    expect(validarLectura(lectura({ impuestos: 'IVA' as unknown as [] })).ok).toBe(false);
    expect(validarLectura(lectura({ subtotal: 12 as unknown as string })).ok).toBe(false);
    expect(validarLectura(lectura({ subtotal: '1000.00', impuestos: [{ nombre: 'IVA', monto: '200.00' }], descuento: null, lineas: null })).ok).toBe(true);
  });

  it('el motor ESCALA cuando la aritmetica no cuadra (baseline limpia vs con alerta)', () => {
    const limpia = motor(leer(TEXTO, { subtotal: '1000.00', impuestos: [{ nombre: 'IVA', monto: '200.00' }] }));
    const mala = motor(leer(TEXTO, { subtotal: '1000.00', impuestos: [{ nombre: 'IVA', monto: '100.00' }] }));
    expect(mala.decision).not.toBe('PAGAR');
    expect(mala.razones.map((r) => r.regla)).toContain('EXTRACCION');
    expect(limpia.razones.map((r) => r.regla)).not.toContain('EXTRACCION');
  });
});

// ---------------------------------------------------------------------------------------------
// 3. Fallo del modelo -> ESCALAR (fetch simulado, sin red)
// ---------------------------------------------------------------------------------------------
describe('brecha 3: fallo del modelo con fetch simulado', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
  const respuesta = (l: unknown) => new Response(JSON.stringify({ model: 'x', choices: [{ message: { content: typeof l === 'string' ? l : JSON.stringify(l) } }], usage: { prompt_tokens: 1, completion_tokens: 1 } }), { status: 200 });
  /** fetch falso: la funcion decide la respuesta segun el modelo pedido. */
  function simular(f: (modelo: string) => Response | Promise<Response>) {
    vi.stubEnv('OPENROUTER_API_KEY', 'sk-prueba-1234567890');
    const fetchFalso = vi.fn(async (_u: unknown, init?: { body?: string }) => f(JSON.parse(init?.body ?? '{}').model));
    vi.stubGlobal('fetch', fetchFalso);
    return fetchFalso;
  }
  const correr = () => extraerFactura({ texto: TEXTO }, { replay: false, modelos: ['anthropic/a', 'google/b'] });
  const esFallo = (r: Awaited<ReturnType<typeof correr>>, contiene?: string) => {
    expect(r.factura.monto_centavos).toBeNull();
    expect(r.factura.beneficiario).toBeNull();
    expect(r.factura.id_fiscal).toBeNull();
    expect(r.factura.numero_factura).toBeNull();
    expect(r.factura.alertas?.length).toBeGreaterThan(0);
    expect(r.factura.alertas?.every((a) => a.startsWith('lector_fallo:'))).toBe(true);
    if (contiene) expect(r.factura.alertas?.join(' ')).toContain(contiene);
    const d = motor(r.factura);
    expect(d.decision).toBe('ESCALAR');
  };

  it('control: con respuestas buenas el simulador devuelve factura limpia', async () => {
    simular(() => respuesta(lectura()));
    const r = await correr();
    expect(r.factura.alertas).toEqual([]);
    expect(r.factura.monto_centavos).toBe(120000);
  });

  it.each([[500, 'http_500'], [429, 'http_429']])('HTTP %s en ambos modelos -> lector_fallo:%s', async (status, motivo) => {
    const f = simular(() => new Response('error', { status }));
    esFallo(await correr(), motivo);
    expect(f).toHaveBeenCalled();
  });

  it('tiempo agotado (abort) -> lector_fallo ... timeout', async () => {
    simular(() => { throw Object.assign(new Error('aborted'), { name: 'AbortError' }); });
    esFallo(await correr(), 'timeout');
  });

  it('error de red -> lector_fallo ... red', async () => {
    simular(() => { throw new TypeError('fetch failed'); });
    esFallo(await correr(), 'red');
  });

  it('JSON invalido -> lector_fallo ... json_invalido', async () => {
    simular(() => respuesta('esto no es json'));
    esFallo(await correr(), 'json_invalido');
  });

  it('JSON que no cumple el esquema -> lector_fallo ... esquema', async () => {
    simular(() => respuesta({ monto: '10.00' }));
    esFallo(await correr(), 'esquema_campo_');
  });

  it('monto numerico (no texto) -> lector_fallo ... esquema_campo_monto', async () => {
    simular(() => respuesta({ ...lectura(), monto: 1200.5 }));
    esFallo(await correr(), 'esquema_campo_monto');
  });

  it('monto con formato raro como texto -> monto null + alerta (nunca un monto adivinado) y el motor no paga', async () => {
    simular(() => respuesta({ ...lectura(), monto: '1.200,00' }));
    const r = await correr();
    expect(r.factura.monto_centavos).toBeNull();
    expect(r.factura.alertas).toContain('monto_formato_invalido');
    expect(motor(r.factura).decision).not.toBe('PAGAR');
  });

  it('una lectura llega y la otra falla -> campos null y lector_fallo del que fallo', async () => {
    simular((modelo) => (modelo === 'google/b' ? new Response('x', { status: 500 }) : respuesta(lectura())));
    const r = await correr();
    esFallo(r, 'google/b=http_500');
    expect(r.lecturas.filter((l) => l.ok)).toHaveLength(1);
  });

  it('una lectura llega y la otra devuelve JSON invalido', async () => {
    simular((modelo) => (modelo === 'anthropic/a' ? respuesta('basura') : respuesta(lectura())));
    esFallo(await correr(), 'anthropic/a=json_invalido');
  });

  it('sin clave de API -> lector_fallo ... sin_clave y jamas toca la red', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', '');
    const f = vi.fn();
    vi.stubGlobal('fetch', f);
    esFallo(await correr(), 'sin_clave');
    expect(f).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------------------------
// Todas las alertas nuevas -> nunca PAGAR
// ---------------------------------------------------------------------------------------------
describe('las alertas nuevas nunca terminan en PAGAR', () => {
  const casos: [string, () => ReturnType<typeof leer>][] = [
    ['no_es_cobro (modelo)', () => leer(TEXTO, { tipo_documento: 'cotizacion' })],
    ['no_es_cobro (texto)', () => leer(`${TEXTO}\nCredit note`)],
    ['aritmetica_no_cuadra (lineas)', () => leer(TEXTO, { lineas: [{ descripcion: 'x', monto: '1.00' }] })],
    ['aritmetica_no_cuadra (impuestos)', () => leer(TEXTO, { subtotal: '1000.00', impuestos: [] })],
    ['lector_fallo', () => combinar({ texto: TEXTO }, [detalle('m/a', lectura()), { ...detalle('n/b', lectura()), ok: false, datos: undefined, error: 'http_500' }], MODELOS).factura],
  ];
  it.each(casos)('%s', (nombre, hacer) => {
    const f = hacer();
    const prefijo = nombre.split(' ')[0] as string;
    expect(f.alertas?.some((a) => a.startsWith(prefijo))).toBe(true);
    const d = motor(f);
    expect(d.decision).not.toBe('PAGAR');
    expect(d.razones.map((r) => r.regla)).toContain('EXTRACCION');
  });
});
