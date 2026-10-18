// Textos del botón "i" de cada tarjeta de la portada. Un solo archivo para revisar el tono de una vez.
// Cada ayuda: qué es, y por qué te importa. Dos frases. Sin siglas, sin nombres de regla, sin cifras nuevas.
export interface Ayuda { que: string; porque: string }

export const AYUDAS: Record<string, Ayuda> = {
  anillo: { que: 'Reparte todas las facturas según lo que Pulso hizo con cada una.', porque: 'Así ves de un vistazo cuántas pagó, cuántas frenó y cuántas esperan tu respuesta.' },
  'te-necesitan': { que: 'Facturas que Pulso no quiso decidir solo y dejó esperando tu respuesta.', porque: 'Mientras no las revises, no se pagan.' },
  frenadas: { que: 'Facturas que Pulso no deja pagar porque rompen una regla de tu empresa.', porque: 'Ninguna se puede aprobar: hay que corregir la causa.' },
  pagadas: { que: 'Facturas que cumplieron todas tus reglas y quedaron con pago autorizado.', porque: 'Pulso decide, pero no envía dinero: el pago lo haces tú.' },
  'decidido-sin-ti': { que: 'La parte de las facturas que Pulso resolvió sin pedirte nada, ya sea pagando o frenando.', porque: 'Frenar un cobro dudoso también es una buena decisión y también cuenta.' },
  protegimos: { que: 'El valor de los cobros que Pulso frenó antes de que salieran de tu cuenta.', porque: 'Es dinero que no se pagó por algo que no cumplía tus reglas.' },
  dinero: { que: 'Reparte el valor de las facturas según lo que pasó con cada una.', porque: 'Te dice cuánto dinero está seguro, cuánto quedó frenado y cuánto espera tu decisión.' },
  'pagado-solo': { que: 'Valor de las facturas que Pulso autorizó sin pedirte ayuda.', porque: 'Cumplían todas tus reglas, así que no hacía falta molestarte.' },
  'frenado-protegido': { que: 'Valor de las facturas que Pulso frenó por romper una regla.', porque: 'Ese dinero se queda en tu cuenta hasta que se corrija la causa.' },
  'espera-decision': { que: 'Valor de las facturas que esperan tu respuesta.', porque: 'Es lo que tienes en juego si las dejas sin revisar.' },
  'pagadas-solas': { que: 'Facturas que Pulso autorizó sin pedirte nada, con el valor que suman.', porque: 'Es el trabajo que ya no tienes que hacer a mano.' },
  coinciden: { que: 'Cuántas decisiones de Pulso son las mismas que se esperaban en esta prueba.', porque: 'Falta probar con facturas nuevas, así que no es una garantía para el futuro.' },
  'costo-lectura': { que: 'Lo que costó que dos inteligencias artificiales leyeran todas las facturas.', porque: 'Es la suma real de las lecturas grabadas.' },
  llegaron: { que: 'Todas las facturas que entraron a Pulso, en el formato en que llegaron.', porque: 'Es el punto de partida: de aquí sale todo lo demás.' },
  leimos: { que: 'Facturas que se leyeron con dos modelos de inteligencia artificial y salieron con los datos completos.', porque: 'Si los dos leen lo mismo, hay más seguridad de que el dato es correcto.' },
  reglas: { que: 'Cada factura se compara con las reglas de tu empresa, una por una.', porque: 'Las decide un programa fijo, no la inteligencia artificial, así que siempre responde igual.' },
  pagamos: { que: 'Facturas que cumplieron todas las reglas y Pulso dejó con pago autorizado.', porque: 'Son las que no te hicieron perder tiempo.' },
  frenamos: { que: 'Facturas que Pulso detuvo porque rompen una regla de tu empresa.', porque: 'Ninguna se puede aprobar: hay que corregir la causa.' },
  preguntamos: { que: 'Facturas donde Pulso no estuvo seguro y te pide que decidas tú.', porque: 'Es mejor preguntar que pagar algo dudoso.' },

  'riesgo-R1': { que: 'Facturas cuyo monto pasa el límite que fijaste para un pago.', porque: 'Un cobro así necesita que una persona lo mire antes de pagarlo.' },
  'riesgo-R2': { que: 'Facturas de empresas que no están en tu lista de proveedores.', porque: 'Pagar a alguien que no conoces es una forma común de fraude.' },
  'riesgo-R3': { que: 'Facturas que, sumadas a lo ya pagado, pasan el tope que fijaste para el mes.', porque: 'Evita que el gasto crezca sin que lo notes.' },
  'riesgo-R4': { que: 'Facturas de un área que ya no tiene presupuesto para ese cobro.', porque: 'Pagarlas rompería el plan de gasto de tu empresa.' },
  'riesgo-R5': { que: 'Facturas que parecen un cobro que ya se había recibido antes.', porque: 'Pagar dos veces lo mismo es un error que casi nunca se recupera.' },
  'riesgo-R6': { que: 'Facturas cuyo valor o condiciones no coinciden con lo que se acordó con el proveedor.', porque: 'Pueden ser un error de cobro o un intento de cobrar de más.' },
  'riesgo-R7': { que: 'Facturas a las que les falta algún dato que Pulso necesita para decidir.', porque: 'Sin ese dato no se puede comprobar nada, así que se piden a una persona.' },
  'riesgo-R8': { que: 'Facturas que piden pagar a una cuenta bancaria distinta de la que el proveedor tenía hace poco.', porque: 'Cambiar la cuenta es una táctica habitual para desviar el dinero.' },
  'riesgo-INYECCION': { que: 'Facturas que traían texto escondido intentando darle órdenes al asistente.', porque: 'Pulso lo lee como dato, nunca lo obedece, y te lo muestra marcado.' },
  'riesgo-CONFIANZA': { que: 'Facturas que la inteligencia artificial leyó con poca seguridad, por ejemplo por una imagen borrosa.', porque: 'Si el dato no está claro, es mejor que lo confirme una persona.' },
  'riesgo-REGISTRO': { que: 'Facturas cuyo nombre no coincide con el que figura en el registro del proveedor.', porque: 'Puede ser un error de escritura o alguien haciéndose pasar por otro.' },
  'riesgo-EXTRACCION': { que: 'Facturas donde el lector automático avisó de un problema al leerlas.', porque: 'Es una señal para revisar el documento antes de confiar en lo que se leyó.' },
  'riesgo-ESQUEMA': { que: 'Facturas que no se pudieron procesar por un fallo interno.', porque: 'Por precaución Pulso no decide nada con ellas y te las deja para revisar.' },
};

/** Texto de ayuda de una tarjeta; null si la clave no existe (la prueba lo impide). */
export const ayudaDe = (clave: string): Ayuda | null => AYUDAS[clave] ?? null;
