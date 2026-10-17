# Flujo de trabajo del MVP

Hora de Colombia. Cierre: domingo 2026-10-18, 12:00.

| # | Paso | Entrega | Puerta de salida |
|---|---|---|---|
| 0 | Decisiones del equipo (tope 45 min) | Stack, roles, integrador, editor del video, responsable del set ciego | Preguntas bloqueantes respondidas |
| 1 | Contratos (tope 45 min) | Esquemas JSON y reglas R1 a R8 | Los tres leyeron los esquemas |
| 2 | Nucleo sin IA | Motor de reglas puro, tests de propiedades, dataset F-001 a F-015 | 15 de 15 casos dan la decision esperada |
| 3 | Extraccion | Doble pasada con LLM, validaciones deterministas, modo replay | Set completo corre de punta a punta, extracciones guardadas |
| 4 | Registro y pantalla | Registro solo de anadir, tabla de decisiones, reglas editables, cola de aprobacion solo para ESCALAR | Una decision viaja de factura a registro a pantalla; alterar un registro se detecta o bloquea |
| 5 | Endurecer y entregar | Suite adversarial, set ciego, README, video, demo publico en replay | Tres enlaces verificados desde un navegador sin sesion |

Despues del paso 1, los pasos 2, 3 y 4 avanzan en paralelo contra los esquemas.

## Defensas deterministas contra facturas envenenadas

La doble pasada no frena una inyeccion (las dos lecturas pueden coincidir en el dato envenenado). Fuera del LLM: la suma de las lineas debe cuadrar con el total, el monto se relee con regex, el proveedor debe estar en la lista permitida, y una frase con forma de instruccion dentro de la factura fuerza ESCALAR. No existe ningun endpoint que mueva dinero.

## Si falta tiempo, se corta en este orden

1. Nomina como escenario completo (queda un caso de pago doble)
2. Modo en vivo en el demo publico (queda en el video)
3. Canales de imagen, correo y chat (queda texto y PDF)
4. Adaptador tipo QuickBooks (queda archivo de entrada con ese formato)
5. Refinamientos de la cola de aprobacion (queda aprobar y rechazar con registro)
6. Hash encadenado (queda triggers que bloquean UPDATE y DELETE)

Nunca se corta: motor de reglas y tests, FRENAR sin boton de aprobar, claves fuera del repo.
