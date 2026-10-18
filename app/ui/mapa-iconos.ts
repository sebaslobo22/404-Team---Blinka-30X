// Mapa único: qué ícono lleva cada cosa. Sin JSX, para poder probarlo ("nada sin cara").
export const NOMBRES_ICONO = [
  'marca', 'decisiones', 'cola', 'reglas', 'registro', 'equipo', 'recorrido', 'tema', 'colapsar',
  'campana', 'mano', 'check-circulo', 'guion', 'check', 'x', 'deshacer', 'pregunta', 'carpeta', 'info', 'flecha-salida', 'volver',
  'persona', 'edificio', 'tarjeta', 'banco', 'banco-reloj', 'monedas', 'balanza', 'velocimetro', 'calendario-limite', 'calendario',
  'billetera', 'duplicado', 'lista-check', 'ojos', 'ojo', 'escudo-alerta', 'escudo-check', 'documento-tachado', 'calculadora', 'triangulo-alerta',
  'documento', 'imagen', 'correo', 'chat', 'tabla', 'etiqueta', 'huella', 'vacio', 'tamano-letra', 'tarea', 'zona', 'reloj', 'acuerdo',
  'agente', 'vivo', 'bandera', 'codigo',
] as const;
export type NombreIcono = (typeof NOMBRES_ICONO)[number];

/** Un objeto por código de regla / comprobación del motor. */
export const ICONO_REGLA: Record<string, NombreIcono> = {
  R1: 'velocimetro', R2: 'edificio', R3: 'calendario-limite', R4: 'billetera', R5: 'duplicado', R6: 'balanza', R7: 'lista-check', R8: 'banco-reloj',
  EXTRACCION: 'ojos', INYECCION: 'escudo-alerta', CONFIANZA: 'ojo', REGISTRO: 'tarjeta', ESQUEMA: 'triangulo-alerta',
  EN_VIVO: 'vivo',
};
export const iconoDeRegla = (codigo: string): NombreIcono => ICONO_REGLA[codigo] ?? 'lista-check';

/** Alertas del lector (prefijo antes de ':'). */
export const ICONO_ALERTA: Record<string, NombreIcono> = {
  lector_fallo: 'triangulo-alerta', lecturas_difieren: 'ojos', moneda_ambigua: 'monedas', monto_formato_invalido: 'monedas',
  moneda_formato_invalido: 'lista-check', fecha_formato_invalido: 'calendario', no_es_cobro: 'documento-tachado',
  aritmetica_no_cuadra: 'calculadora', imagen_confianza_baja: 'ojo', imagen_instrucciones_detectadas: 'escudo-alerta',
  instruccion_oculta_en_documento: 'escudo-alerta', no_literal: 'ojos', modelo_no_esperado: 'agente',
};
export const ETIQUETA_ALERTA: Record<string, string> = {
  lector_fallo: 'El lector falló', lecturas_difieren: 'Los dos modelos leyeron distinto', moneda_ambigua: 'La moneda no es clara',
  monto_formato_invalido: 'El monto no se pudo leer', moneda_formato_invalido: 'La moneda no se pudo leer', fecha_formato_invalido: 'La fecha no se pudo leer',
  no_es_cobro: 'No es un cobro', aritmetica_no_cuadra: 'Las cuentas no cuadran', imagen_confianza_baja: 'La imagen se lee con duda',
  imagen_instrucciones_detectadas: 'Órdenes ocultas en la imagen', instruccion_oculta_en_documento: 'Órdenes ocultas en el documento', no_literal: 'Un dato no aparece en el texto',
  modelo_no_esperado: 'Respondió un modelo distinto al pedido',
};
export const prefijoAlerta = (a: string) => a.split(':')[0]!;
export const iconoDeAlerta = (a: string): NombreIcono => ICONO_ALERTA[prefijoAlerta(a)] ?? 'triangulo-alerta';
export const etiquetaDeAlerta = (a: string) => ETIQUETA_ALERTA[prefijoAlerta(a)] ?? 'Alerta del lector';

export const ICONO_DECISION = { PAGAR: 'check-circulo', FRENAR: 'mano', ESCALAR: 'campana' } as const satisfies Record<string, NombreIcono>;
export const ICONO_ESTADO_TRAZA: Record<string, NombreIcono> = { CUMPLE: 'check-circulo', FRENAR: 'x', ESCALAR: 'x', NO_EVALUADA: 'guion', NO_APLICA: 'guion' };

/** Ícono por tipo de archivo original (por extensión). */
export function iconoDeArchivo(nombre: string | undefined | null): NombreIcono {
  const e = (nombre ?? '').toLowerCase().split('.').pop();
  return e === 'pdf' ? 'documento' : e === 'png' || e === 'jpg' || e === 'jpeg' ? 'imagen' : e === 'eml' ? 'correo' : e === 'txt' ? 'chat' : 'documento';
}

/** Riesgos de la portada: etiqueta corta con palabra visible. */
export const RIESGO: Record<string, { etiqueta: string; icono: NombreIcono }> = {
  R8: { etiqueta: 'Cuenta cambiada', icono: 'banco-reloj' }, INYECCION: { etiqueta: 'Órdenes ocultas', icono: 'escudo-alerta' },
  R5: { etiqueta: 'Cobro repetido', icono: 'duplicado' }, R6: { etiqueta: 'No cuadra con lo acordado', icono: 'balanza' },
  R1: { etiqueta: 'Supera el límite', icono: 'velocimetro' }, R3: { etiqueta: 'Tope del mes superado', icono: 'calendario-limite' },
  R4: { etiqueta: 'Presupuesto agotado', icono: 'billetera' }, CONFIANZA: { etiqueta: 'Lectura dudosa', icono: 'ojo' },
  R2: { etiqueta: 'Proveedor no autorizado', icono: 'edificio' }, R7: { etiqueta: 'Datos incompletos', icono: 'lista-check' },
  REGISTRO: { etiqueta: 'Nombre no coincide', icono: 'tarjeta' }, EXTRACCION: { etiqueta: 'Alerta del lector', icono: 'ojos' },
  ESQUEMA: { etiqueta: 'Error del sistema', icono: 'triangulo-alerta' },
};
