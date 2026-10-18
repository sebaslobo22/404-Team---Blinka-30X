import { describe, expect, it } from 'vitest';
import { aprobadorDe, contextoDeEmpresa, ID_DEMO, normalizarCodigo, nuevoCodigo, type Empresa } from '../src/telegram/empresas';
import { manejarUpdate } from '../src/telegram/manejador';
import { callback, crearDepsPrueba, DUENO, extractorCon, JURADO, lecturaClon, llamarFalso, mensajeArchivo, mensajeTexto, PNG } from './telegram-ayudas';

// Personas de prueba (ids de Telegram ficticios). En chat privado, chat_id = usuario_id.
const ANA = 201; // duena de la empresa A
const BETO = 202; // equipo de A
const CARLA = 301; // duena de la empresa B

const PROVEEDOR = '/proveedor FIC-PE-001 ACC-PE-0001 Luz Andina S.A.C.';

async function preparar() {
  const d = crearDepsPrueba({ extraer: extractorCon(llamarFalso({ lectura: lecturaClon() }).llamar) });
  d.telegram.archivos.set('fac', { bytes: PNG });
  for (const p of [ANA, BETO, CARLA, JURADO, DUENO]) await manejarUpdate(mensajeTexto(p, '/start'), d);
  await manejarUpdate(mensajeTexto(ANA, '/crear Panadería La Esquina'), d);
  await manejarUpdate(mensajeTexto(CARLA, '/crear Taller Los Andes'), d);
  const codigoA = /PULSO-[A-Z2-9]{6}/.exec(d.telegram.ultimo(ANA)!.texto)![0];
  return { d, codigoA };
}

const facturas = (d: Awaited<ReturnType<typeof preparar>>['d']) => [...d.almacen.facturas.values()];

describe('onboarding de empresas por comandos', () => {
  it('/start deja a la persona en la demo y /crear la vuelve dueña con un código', async () => {
    const { d, codigoA } = await preparar();
    expect((await d.almacen.miembroDe(JURADO))!.empresa_id).toBe(ID_DEMO);
    const ana = (await d.almacen.miembroDe(ANA))!;
    expect(ana.rol).toBe('DUENO');
    expect((await d.almacen.empresa(ana.empresa_id))!.codigo).toBe(codigoA);
    expect(d.telegram.ultimo(ANA)!.texto).toMatch(/Creé «Panadería La Esquina»/);
  });
  it('un segundo /crear no crea otra empresa: devuelve la misma', async () => {
    const { d, codigoA } = await preparar();
    const antes = d.almacen.empresas.size;
    await manejarUpdate(mensajeTexto(ANA, '/crear Otra Cosa'), d);
    expect(d.almacen.empresas.size).toBe(antes);
    expect(d.telegram.ultimo(ANA)!.texto).toContain(codigoA);
  });
  it('/unirme con el código lleva al equipo; un código falso o el de la demo no', async () => {
    const { d, codigoA } = await preparar();
    await manejarUpdate(mensajeTexto(BETO, `/unirme ${codigoA.toLowerCase()}`), d);
    const beto = (await d.almacen.miembroDe(BETO))!;
    expect(beto.rol).toBe('EQUIPO');
    expect(beto.empresa_id).toBe((await d.almacen.miembroDe(ANA))!.empresa_id);
    await manejarUpdate(mensajeTexto(JURADO, '/unirme PULSO-ZZZZZZ'), d);
    expect(d.telegram.ultimo(JURADO)!.texto).toMatch(/no existe/);
    await manejarUpdate(mensajeTexto(JURADO, '/unirme PULSO-DEMO22'), d);
    expect(d.telegram.ultimo(JURADO)!.texto).toMatch(/no existe/);
  });
  it('la dueña no se cambia de empresa con /unirme ni /demo (la dejaría sin quien apruebe)', async () => {
    const { d } = await preparar();
    const antes = (await d.almacen.miembroDe(ANA))!.empresa_id;
    const codigoB = (await d.almacen.empresa((await d.almacen.miembroDe(CARLA))!.empresa_id))!.codigo;
    await manejarUpdate(mensajeTexto(ANA, `/unirme ${codigoB}`), d);
    await manejarUpdate(mensajeTexto(ANA, '/demo'), d);
    expect((await d.almacen.miembroDe(ANA))!.empresa_id).toBe(antes);
    expect(d.telegram.ultimo(ANA)!.texto).toMatch(/Eres el dueño/);
  });
  it('los comandos de empresa no funcionan en un grupo', async () => {
    const { d } = await preparar();
    await manejarUpdate(mensajeTexto(-900, '/crear Grupo SA', { desde: JURADO, tipo: 'group' }), d);
    expect(d.telegram.ultimo(-900)?.texto ?? '').toMatch(/start|chat privado/);
  });
  it('solo la dueña agrega proveedores y fija el límite', async () => {
    const { d, codigoA } = await preparar();
    await manejarUpdate(mensajeTexto(BETO, `/unirme ${codigoA}`), d);
    await manejarUpdate(mensajeTexto(BETO, PROVEEDOR), d);
    expect(d.telegram.ultimo(BETO)!.texto).toMatch(/solo lo puede hacer el dueño/);
    await manejarUpdate(mensajeTexto(BETO, '/limite 25000'), d);
    expect(d.telegram.ultimo(BETO)!.texto).toMatch(/solo lo puede hacer el dueño/);
    await manejarUpdate(mensajeTexto(JURADO, PROVEEDOR), d);
    expect(d.telegram.ultimo(JURADO)!.texto).toMatch(/solo lo puede hacer el dueño/);

    await manejarUpdate(mensajeTexto(ANA, PROVEEDOR), d);
    const idA = (await d.almacen.miembroDe(ANA))!.empresa_id;
    expect(await d.almacen.proveedores(idA)).toEqual([{ id_fiscal: 'FIC-PE-001', cuenta: 'ACC-PE-0001', nombre: 'Luz Andina S.A.C.', desde: '2026-10-17' }]);
    await manejarUpdate(mensajeTexto(ANA, '/limite 1234'), d);
    expect(d.telegram.ultimo(ANA)!.texto).toMatch(/Elige uno/);
    await manejarUpdate(mensajeTexto(ANA, '/limite 10000'), d);
    expect((await d.almacen.empresa(idA))!.limite_pago_usd_centavos).toBe(1_000_000);
  });
});

describe('las facturas no se mezclan entre empresas', () => {
  it('una empresa nueva frena a un proveedor que no está en SU lista, aunque Aurora sí lo tenga', async () => {
    const { d, codigoA } = await preparar();
    await manejarUpdate(mensajeTexto(BETO, `/unirme ${codigoA}`), d);
    await manejarUpdate(mensajeArchivo(BETO, 'fac', { foto: true }), d);
    const f = facturas(d)[0]!;
    expect(f.empresa_id).toBe((await d.almacen.miembroDe(ANA))!.empresa_id);
    expect(f.decision).toBe('FRENAR');
    expect(f.razones.map((r) => r.regla)).toContain('R2');
    // Nadie recibe botones para aprobar una frenada.
    expect(d.telegram.enviados.some((e) => e.botones?.length)).toBe(false);
  });
  it('con el proveedor agregado escala, y el aviso con botones le llega a SU dueña, no al de la demo', async () => {
    const { d, codigoA } = await preparar();
    await manejarUpdate(mensajeTexto(BETO, `/unirme ${codigoA}`), d);
    await manejarUpdate(mensajeTexto(ANA, PROVEEDOR), d);
    await manejarUpdate(mensajeArchivo(BETO, 'fac', { foto: true }), d);
    const f = facturas(d)[0]!;
    expect(f.decision).toBe('ESCALAR');
    expect(f.decision).not.toBe('PAGAR');
    const conBotones = d.telegram.enviados.filter((e) => e.botones?.length);
    expect(conBotones.map((e) => e.chat)).toEqual([ANA]);
    expect(d.telegram.a(DUENO).some((t) => /aprobación/.test(t))).toBe(false);
    expect(d.telegram.ultimo(BETO)!.texto).toMatch(/dueño de «Panadería La Esquina»/);
  });
  it('solo la dueña de ESA empresa aprueba: ni la de otra empresa, ni el de la demo, ni el equipo', async () => {
    const { d, codigoA } = await preparar();
    await manejarUpdate(mensajeTexto(BETO, `/unirme ${codigoA}`), d);
    await manejarUpdate(mensajeTexto(ANA, PROVEEDOR), d);
    await manejarUpdate(mensajeArchivo(BETO, 'fac', { foto: true }), d);
    const f = facturas(d)[0]!;
    for (const intruso of [CARLA, DUENO, BETO]) {
      await manejarUpdate(callback(`a:${f.id}`, { desde: intruso }), d);
      expect((await d.almacen.obtenerFactura(f.id))!.estado_resolucion).toBe('PENDIENTE');
    }
    await manejarUpdate(callback(`a:${f.id}`, { desde: ANA }), d);
    expect((await d.almacen.obtenerFactura(f.id))!.estado_resolucion).toBe('APROBADA');
    expect(d.telegram.ultimo(BETO)!.texto).toMatch(/aprobada por el dueño \(orden simulada/);
  });
  it('la demo sigue igual: la aprueba TELEGRAM_DUENO_ID', async () => {
    const { d } = await preparar();
    await manejarUpdate(mensajeArchivo(JURADO, 'fac', { foto: true }), d);
    const f = facturas(d)[0]!;
    expect(f.empresa_id).toBe(ID_DEMO);
    expect(f.decision).toBe('ESCALAR');
    expect(d.telegram.enviados.filter((e) => e.botones?.length).map((e) => e.chat)).toEqual([DUENO]);
    await manejarUpdate(callback(`a:${f.id}`, { desde: ANA }), d);
    expect((await d.almacen.obtenerFactura(f.id))!.estado_resolucion).toBe('PENDIENTE');
  });
  it('una factura sin empresa (anterior a la migración) no la aprueba nadie', async () => {
    const { d } = await preparar();
    const id = await d.almacen.guardarFactura({ chat_id: JURADO, empresa_id: ID_DEMO, update_id: 9, decision: 'ESCALAR', decision_motor: 'ESCALAR', razones: [], resumen: { beneficiario: null, numero_factura: null, monto_centavos: null, moneda: null }, estado_resolucion: 'PENDIENTE' });
    d.almacen.facturas.get(id)!.empresa_id = null;
    await manejarUpdate(callback(`a:${id}`, { desde: DUENO }), d);
    expect((await d.almacen.obtenerFactura(id))!.estado_resolucion).toBe('PENDIENTE');
  });
});

describe('reglas puras de empresas', () => {
  const empresa = (o: Partial<Empresa> = {}): Empresa => ({ id: 'e1', nombre: 'X', codigo: 'PULSO-ABCDEF', es_demo: false, dueno_chat_id: 5, dueno_usuario_id: 5, limite_pago_usd_centavos: 500000, ...o });
  it('aprobadorDe: demo → TELEGRAM_DUENO_ID; empresa → su dueño; sin empresa o sin dueño → nadie', () => {
    expect(aprobadorDe(empresa({ es_demo: true, dueno_chat_id: null, dueno_usuario_id: null }), 777)).toEqual({ usuarioId: 777, chatId: 777 });
    expect(aprobadorDe(empresa({ es_demo: true }), null)).toBeNull();
    expect(aprobadorDe(empresa(), 777)).toEqual({ usuarioId: 5, chatId: 5 });
    expect(aprobadorDe(empresa({ dueno_usuario_id: null }), 777)).toBeNull();
    expect(aprobadorDe(null, 777)).toBeNull();
  });
  it('códigos: PULSO- y 6 caracteres sin ambiguos; se aceptan sin prefijo y en minúsculas', () => {
    for (let i = 0; i < 50; i++) expect(nuevoCodigo()).toMatch(/^PULSO-[A-HJ-NP-Z2-9]{6}$/);
    expect(normalizarCodigo(' pulso-7kq2mx ')).toBe('PULSO-7KQ2MX');
    expect(normalizarCodigo('7KQ2MX')).toBe('PULSO-7KQ2MX');
    expect(normalizarCodigo('PULSO-0O1I00')).toBeNull();
  });
  it('el contexto de una empresa solo trae sus proveedores, sin acuerdos ni historial inventados', () => {
    const c = contextoDeEmpresa([{ id_fiscal: 'A', cuenta: '1', nombre: 'A SA', desde: '2026-10-18' }, { id_fiscal: 'A', cuenta: '2', nombre: 'A SA', desde: '2026-10-18' }], new Date('2026-10-18T10:00:00Z'));
    expect(c.beneficiarios).toEqual([{ id_fiscal: 'A', nombre: 'A SA', cuentas: [{ cuenta: '1', desde: '2026-10-18' }, { cuenta: '2', desde: '2026-10-18' }] }]);
    expect(c.acuerdos).toEqual([]);
    expect(c.historial).toEqual([]);
  });
});

describe('reglas de una empresa propia', () => {
  it('no hereda el tope mensual de la empresa de ejemplo', async () => {
    const { reglasDeEmpresa, TOPE_MENSUAL_SIN_DEFINIR } = await import('../src/telegram/empresas');
    const base = { limite_pago_usd_centavos: 500000, tope_mensual_usd_centavos: 1200000 } as unknown as Parameters<typeof reglasDeEmpresa>[0];
    const r = reglasDeEmpresa(base, { limite_pago_usd_centavos: 2500000 } as Parameters<typeof reglasDeEmpresa>[1]);
    expect(r.limite_pago_usd_centavos).toBe(2500000);
    expect(r.tope_mensual_usd_centavos).toBe(TOPE_MENSUAL_SIN_DEFINIR);
  });
});
