import { beforeAll, describe, expect, it } from 'vitest';
import { comprobaciones } from '../src/engine';
import type { ResultadoDecision } from '../src/engine';
import { crearEstado } from '../src/demo/estado';
import type { EstadoDemo } from '../src/demo/estado';
import { ICONO_ALERTA, ICONO_REGLA, NOMBRES_ICONO, RIESGO, iconoDeAlerta, iconoDeArchivo, etiquetaDeAlerta, prefijoAlerta } from '../app/ui/mapa-iconos';
import { NOMBRES_DEFINIDOS } from '../app/ui/iconos';

let estado: EstadoDemo;
beforeAll(async () => { estado = await crearEstado(); });

// Prefijos que el lector puede emitir (src/extraccion/extraer.ts y defensas.ts).
const ALERTAS_DEL_LECTOR = ['lector_fallo', 'lecturas_difieren', 'moneda_ambigua', 'monto_formato_invalido', 'moneda_formato_invalido', 'fecha_formato_invalido',
  'no_es_cobro', 'aritmetica_no_cuadra', 'imagen_confianza_baja', 'imagen_instrucciones_detectadas', 'no_literal', 'instruccion_oculta_en_documento'];

describe('nada sin cara: cada comprobación y cada alerta tienen ícono', () => {
  it('todos los códigos que devuelve comprobaciones() tienen ícono real', () => {
    const codigos = new Set<string>();
    for (const f of estado.filas) for (const c of comprobaciones(f.resultado, estado.config)) codigos.add(c.codigo);
    // Un error interno agrega ESQUEMA y deja las demás sin evaluar.
    const roto = { decision: 'ESCALAR', razones: [], hechos: { error_interno: true } } as unknown as ResultadoDecision;
    for (const c of comprobaciones(roto, estado.config)) codigos.add(c.codigo);
    expect(codigos.size).toBeGreaterThanOrEqual(13);
    for (const c of codigos) {
      expect(ICONO_REGLA[c], c).toBeDefined();
      expect(NOMBRES_ICONO, c).toContain(ICONO_REGLA[c]);
      expect(RIESGO[c], c).toBeDefined();
    }
  });
  it('R1 a R8 tienen ícono', () => { for (let i = 1; i <= 8; i++) expect(ICONO_REGLA[`R${i}`]).toBeDefined(); });
  it('cada alerta del lector (y las que hay en el set) tiene ícono y frase', () => {
    const vistas = new Set(ALERTAS_DEL_LECTOR);
    for (const f of estado.filas) for (const a of f.factura.alertas ?? []) vistas.add(prefijoAlerta(a));
    for (const a of vistas) {
      expect(ICONO_ALERTA[a], a).toBeDefined();
      expect(NOMBRES_ICONO).toContain(iconoDeAlerta(a));
      expect(etiquetaDeAlerta(`${a}:x`)).not.toBe('Alerta del lector');
    }
  });
  it('los tipos de archivo tienen ícono', () => {
    expect(iconoDeArchivo('a.pdf')).toBe('documento'); expect(iconoDeArchivo('a.png')).toBe('imagen');
    expect(iconoDeArchivo('a.eml')).toBe('correo'); expect(iconoDeArchivo('a.txt')).toBe('chat');
  });
  it('todo nombre del mapa tiene su dibujo y no hay dibujos huérfanos', () => {
    expect([...NOMBRES_DEFINIDOS].sort()).toEqual([...NOMBRES_ICONO].sort());
  });
});
