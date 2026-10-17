# Agente que paga por la empresa (Equipo 404, Hackathon 30X, reto Blinka)

Un agente que lee facturas y decide **PAGAR**, **FRENAR** o **ESCALAR** segun reglas de politica configurables. Registra y explica cada decision. **Nunca mueve dinero**: su salida es una instruccion de pago que otro sistema ejecutaria.

## Principio de diseno

El modelo de lenguaje lee y explica, nunca decide. La decision la toma una funcion pura de reglas, probada con tests. Ante duda o excepcion, ESCALAR (falla cerrada).

## Cómo funciona: de la factura a la decisión

Diagrama completo, editable en FigJam: **https://www.figma.com/board/Z35gyUNofAP7wy2AWshTI6**
(la misma versión está abajo y GitHub la dibuja sola). Detalle de cada rama, clientes posibles y brechas: [`docs/mapa-escenarios.md`](docs/mapa-escenarios.md).

Siete hitos, de izquierda a derecha: **1 · Entrada** → **2 · Lectura con IA** (dos modelos de empresas distintas) → **3 · Validación sin IA** → **4 · Reglas de la empresa** → **5 · Decisión** (manda la falla más grave) → **6 · La persona decide** (solo si se escala) → **7 · Salidas**. Verde = PAGAR, rojo = FRENAR (no se puede aprobar), ámbar = ESCALAR (te necesita). Línea punteada = hoja de ruta, aún no existe.

```mermaid
flowchart LR
  subgraph H1["Hito 1 · Entrada"]
    direction TB
    C1["Subir o arrastrar archivo"]
    C2["Reenviar correo a un buzón (hoja de ruta)"]
    C3["API o conector (hoja de ruta)"]
    C4["Lote Excel o CSV (hoja de ruta)"]
    F1["PDF con texto"]
    F2["PDF escaneado"]
    F3["Foto o captura"]
    F4["Correo .eml"]
    F5["Chat de WhatsApp"]
    F6["XML fiscal CFDI, DIAN, SUNAT, NF-e (hoja de ruta)"]
    F7["Nota de crédito, proforma o recibo"]
    C1 --> F1
    C1 --> F2
    C1 --> F3
    C1 --> F4
    C1 --> F5
    C2 --> F4
    C3 --> F6
    C4 --> F6
  end
  subgraph H2["Hito 2 · Lectura con IA"]
    direction TB
    L1["Lectura A: Claude Haiku 5.5"]
    L2["Lectura B: Gemini 3.1 Flash-Lite"]
    L3{"¿Las dos lecturas coinciden en monto, moneda, beneficiario y cuenta?"}
    L1 --> L3
    L2 --> L3
  end
  subgraph H3["Hito 3 · Validación sin IA"]
    direction TB
    V1{"¿Cada dato aparece tal cual en el documento?"}
    V2{"¿Trae texto que intenta dar órdenes?"}
    V3{"¿Confianza de lectura igual o mayor a 85 %?"}
    V4{"¿Moneda escrita y datos completos?"}
    V5{"¿Es una factura de cobro y no una nota de crédito o proforma?"}
    V6{"¿Las líneas suman el total?"}
    V1 --> V2 --> V3 --> V4 --> V5 --> V6
  end
  subgraph H4["Hito 4 · Reglas de la empresa"]
    direction TB
    R2{"R2 · ¿Proveedor y cuenta autorizados?"}
    RG{"¿El nombre coincide con el registrado?"}
    R8{"R8 · ¿La cuenta cambió hace 72 h o menos?"}
    R5{"R5 · ¿Cobro repetido en 30 días?"}
    R6{"R6 · ¿Cuadra con lo acordado ±2 %?"}
    R1{"R1 · ¿Supera el límite por pago?"}
    R3{"R3 · ¿Supera el tope mensual del proveedor?"}
    R4{"R4 · ¿Alcanza el presupuesto de la categoría?"}
    R2 --> RG --> R8 --> R5 --> R6 --> R1 --> R3 --> R4
  end
  subgraph H5["Hito 5 · Decisión: manda la falla más grave"]
    direction TB
    D1(["PAGAR: cumple todas las reglas"])
    D2(["FRENAR: no se puede aprobar"])
    D3(["ESCALAR: te necesita"])
  end
  subgraph H6["Hito 6 · La persona decide"]
    direction TB
    P0["El sistema prepara: diferencia calculada, factura anterior, cuenta previa, recomendación en una frase"]
    P1["Aprobar con nota"]
    P2["Rechazar con nota"]
    P3["Pedir corrección al proveedor (hoja de ruta)"]
    P4["Decidir luego (hoja de ruta)"]
    P0 --> P1
    P0 --> P2
    P0 --> P3
    P0 --> P4
  end
  subgraph H7["Hito 7 · Salidas"]
    direction TB
    S1["Instrucción de pago: nunca mueve dinero"]
    S2["Explicación en lenguaje humano"]
    S3["Registro encadenado e inalterable"]
    S4["Tablero: pagadas, frenadas, pendientes y por qué"]
    S5["Export CSV y notificaciones (hoja de ruta)"]
  end
  F1 --> L1
  F1 --> L2
  F3 --> L1
  F3 --> L2
  F4 --> L1
  F4 --> L2
  F5 --> L1
  F5 --> L2
  F2 -->|"hoy no se lee: escala"| D3
  F7 -->|"se detecta y escala"| D3
  F6 -->|"se leerá con código, sin IA"| V1
  L3 -->|"sí"| V1
  L3 -->|"no o error del modelo"| D3
  V1 -->|"no"| D3
  V2 -->|"sí"| D3
  V3 -->|"no"| D3
  V4 -->|"no"| D3
  V5 -->|"no"| D3
  V6 -->|"no cuadra"| D3
  V6 -->|"todo bien"| R2
  R2 -->|"no autorizado"| D2
  RG -->|"distinto"| D3
  R8 -->|"cambió hace poco"| D3
  R5 -->|"repetido"| D2
  R6 -->|"no cuadra"| D3
  R1 -->|"supera"| D3
  R3 -->|"supera"| D3
  R4 -->|"no alcanza"| D2
  R4 -->|"todo cumple"| D1
  D1 --> S1
  D3 --> P0
  P1 -->|"se revisa de nuevo el presupuesto"| S1
  P2 --> S3
  D2 --> S3
  S1 --> S3
  S3 --> S2
  S3 --> S4
  S4 --> S5
  classDef ruta stroke-dasharray: 6 4,stroke:#9A9A93,color:#6B6B66
  classDef pagar fill:#E3F4EA,stroke:#1F7A4C,color:#14532D
  classDef frenar fill:#FBE4E2,stroke:#B02E24,color:#7F1D1D
  classDef escalar fill:#FBEFD6,stroke:#9A5B00,color:#713F12
  class C2,C3,C4,F6,P3,P4,S5 ruta
  class D1 pagar
  class D2 frenar
  class D3 escalar
```

## Estado

En construccion. Cierre de la entrega: domingo 2026-10-18, 12:00 m. hora Colombia.

## Contenido

- [`docs/brief-blinka.md`](docs/brief-blinka.md): texto oficial del reto. [`docs/requisitos.md`](docs/requisitos.md): cada exigencia, dónde se cumple y cómo se prueba.
- [`docs/mapa-escenarios.md`](docs/mapa-escenarios.md): clientes posibles, entradas, salidas y decisiones, con el diagrama de flujo.
- [`docs/flujo-y-pasos.md`](docs/flujo-y-pasos.md): ruta de trabajo en 6 pasos con sus puertas de salida.
- [`docs/reglas-R1-R8.json`](docs/reglas-R1-R8.json): las 8 reglas de politica y su precedencia.
- [`docs/esquemas/`](docs/esquemas/): contratos JSON entre piezas (factura extraida, decision, instruccion de pago).
- [`docs/diagrama-flujo-cronologia.html`](docs/diagrama-flujo-cronologia.html): diagrama de flujo y cronologia (abrir en el navegador).

## Seguridad

- Datos 100% ficticios. Ninguna clave en el repositorio.
- Las claves van solo en variables de entorno (ver `.env.example`).
- El demo publico corre en modo replay, sin ninguna clave desplegada.
- El texto de una factura es dato no confiable, nunca instruccion.
- Las reglas son politica interna de pago de una empresa ficticia, no normativa legal.

## Motor de reglas (paso 2)

`src/engine/`: funcion pura `decidir(facturaId, factura, contexto, config)` que devuelve PAGAR, FRENAR o ESCALAR con razones, hechos y explicacion por plantilla. Dinero en centavos enteros, conversion a USD redondeando hacia arriba, ante error interno ESCALAR.

```
npm install
npm test          # 277 tests: motor, set F-001 a F-018, propiedades, registro, lector y estado de la demo
npm run typecheck
```

Las propiedades comparan el motor con un oraculo independiente escrito con BigInt: el motor decide PAGAR si y solo si el oraculo lo permite. Ademas se verifica que nunca lanza error, que es determinista, que no modifica sus entradas y que toda cifra de la explicacion sale de los hechos del motor.

Supuestos pendientes de confirmar con el dataset del equipo: una cuenta nueva debe estar registrada en la lista de beneficiarios con su fecha de alta (una cuenta no registrada se frena por R2; una registrada hace menos de 3 dias escala por R8); la tolerancia de R6 aplica en ambos sentidos; sin presupuesto configurado para la categoria se escala.

## Set de desarrollo (F-001 a F-015)

`data/dev-set.json` es la salida simulada del extractor para las 15 facturas del Sheet del equipo, y `tests/dataset.test.ts` las corre en orden contra el motor: 4 PAGAR, 4 FRENAR y 7 ESCALAR, con las reglas esperadas en cada caso. Los beneficiarios, acuerdos, presupuestos y tasas salen del Sheet. Los numeros de factura, las fechas, la fecha de alta de la cuenta de F-011, el pago previo de nomina de F-013 y la alerta de F-009 los fijamos nosotros para poder ejecutar el caso.

Este set lo disenamos nosotros: pasarlo no prueba que el agente generalice. Eso lo mide el set ciego, armado por otra persona y congelado antes de ver los resultados.

## Registro con hash encadenado (paso 4)

`src/ledger/`: cada decision se anade a un registro donde el hash de cada entrada incluye el de la anterior (SHA-256 sobre JSON canonico). `verificarCadena` detecta cambios de una decision, de un monto o de cualquier campo, entradas borradas, insertadas o reordenadas. Las escrituras se serializan y, si el almacen no puede escribir, la llamada falla y la decision no debe publicarse.

Es evidencia de manipulacion, no inmutabilidad: quien controle el almacen puede reescribir toda la cadena con hashes recalculados, y recortar el final no se nota. Eso solo lo delata un ancla (numero de entradas y hash de la ultima) guardada aparte, que `Registro.ancla()` produce y `verificar(ancla)` comprueba.

Para Supabase, `supabase/migrations/0001_registro.sql` crea la tabla con triggers que bloquean UPDATE, DELETE y TRUNCATE y que exigen indice consecutivo y hash previo correcto. **No esta probada contra un Postgres real**: antes de confiar en ella hay que correr su bloque de verificacion manual en una base de pruebas. El esquema de una entrada esta en `docs/esquemas/registro.schema.json`.

## Pantallas (modo replay)

```
npm run dev      # http://localhost:3000
npm run build && npm start
```

- `/` Decisiones: las 18 facturas (F-001 a F-018) con decisión, reglas activadas y estado de aprobación.
- `/facturas/F-0xx` Detalle con la traza de las reglas y las defensas, la explicación, el registro y la instrucción de pago.
- `/cola` Cola de aprobación, solo para ESCALAR. Las facturas FRENAR aparecen sin botón y el servidor rechaza (403) cualquier intento de aprobarlas.
- `/reglas` Reglas editables. Guardar crea una nueva versión, vuelve a evaluar las 18 facturas y borra las aprobaciones de la sesión.
- `/registro` Registro encadenado, verificación y una simulación de manipulación para mostrar que se detecta.

El modo replay no llama a ningún modelo: las lecturas de las facturas están guardadas en `data/dev-set.json` y son de muestra. El estado vive en la memoria del servidor: en un despliegue sin servidor cada instancia tiene el suyo y todos los visitantes comparten el de su instancia. Un visitante puede reiniciar o cambiar las reglas para los demás.

## Defensas visibles en la traza

El detalle de cada factura (`/facturas/F-0xx`) muestra, además de R1 a R8, las tres defensas del motor con su resultado (Cumple, No cumple (ESCALAR), No evaluada o No aplica) y la cifra o evidencia que las explica:

- **Instrucciones ocultas en la factura** (`INYECCION`): cuántos fragmentos detectó el motor y cuáles. Si la factura trae `texto_fuente`, se muestra en un bloque aparte con los fragmentos detectados resaltados. Es dato, nunca instrucción. Caso de ejemplo: `/facturas/F-016`.
- **Confianza de la lectura** (`CONFIANZA`): la confianza reportada frente al mínimo exigido. Si el lector no la reportó, dice «Sin dato de confianza (el lector no la reportó)». Caso de ejemplo: `/facturas/F-017`.
- **Nombre coincide con el registro** (`REGISTRO`): el ID fiscal y la cuenta existen pero el nombre leído no es el registrado. Va como «No aplica» si R2 no encontró la cuenta, porque no hay nombre con el cual comparar. Caso de ejemplo: `/facturas/F-018`.

Las tres terminan en ESCALAR: llegan a la cola y una persona decide. Aprobar emite una instrucción de pago con origen `PERSONA`; sin esa aprobación no sale ninguna. FRENAR sigue sin aprobación posible, y si R7 corta la evaluación, las demás reglas aparecen como «No evaluada».

En la pantalla de decisiones, «Coinciden con la decisión esperada» (18 de 18) se calcula sobre el set de desarrollo con el que se afinaron las reglas: no mide generalización. Eso lo mide el set ciego.

