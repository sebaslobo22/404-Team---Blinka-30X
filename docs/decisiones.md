# Bitácora de decisiones

Formato: fecha y hora (Caracas) · decisión · motivo · estado.

| Fecha | Decisión | Motivo | Estado |
|---|---|---|---|
| 16/10/2026 - 11:35 p.m. | La IA solo extrae y explica; decide un motor de reglas determinístico | Un pago indebido descalifica; el código es predecible y testeable, el modelo no | Tomada |
| 16/10/2026 - 11:35 p.m. | Ante la duda, ESCALAR | Fallar hacia el humano nunca rompe la regla de seguridad | Tomada |
| 16/10/2026 - 11:35 p.m. | Orden fijo de 8 reglas | Una sola regla decide | Reemplazada el 17/10 |
| 16/10/2026 - 11:35 p.m. | El texto de la factura es dato, nunca instrucción; salida del modelo validada con esquema | Aporte de Andrés: evitar manipulación y alucinación | Tomada (17/10) |
| 16/10/2026 - 11:35 p.m. | Fallas técnicas del modelo → ESCALAR con motivo registrado | Aporte de Andrés: observabilidad, sin fallas silenciosas | Tomada (17/10) |
| 16/10/2026 - 11:35 p.m. | Empresa ficticia Andina Labs Inc. y set de 11 facturas | Cubre los 5 casos trampa del brief + manipulación | Tomada (17/10) |
| 16/10/2026 - 11:35 p.m. | Stack, modelo y plan | — | Pendiente de "ok" |
| 17/10/2026 - 10:40 a.m. | Cierre: domingo 18/10 12:00 Colombia (1:00 p.m. Caracas), según el diagrama | Sebastián lo confirmó | Tomada |
| 17/10/2026 - 10:40 a.m. | Valores del diagrama del equipo: límite USD 5.000, tope mensual USD 12.000 | Vienen de la hoja del equipo; reemplazan los de la propuesta inicial | Tomada |
| 17/10/2026 - 10:40 a.m. | Se evalúan todas las comprobaciones y manda la más grave, en vez de "la primera que falla" | El registro muestra todos los motivos; igual de predecible | Tomada |
| 17/10/2026 - 10:40 a.m. | Beneficiario fuera de lista y duplicado → FRENAR; tope mensual → ESCALAR | Así lo define el diagrama del equipo | Reemplazada (presupuesto pasó a FRENAR) |
| 17/10/2026 - 10:40 a.m. | Se recortan R4 (presupuesto por categoría) y R8 (cuenta cambiada recientemente); se agrega "cuenta distinta a la registrada" | Ahorran modelo de datos; la cuenta distinta da la misma protección con 5 líneas | Tomada |
| 17/10/2026 - 10:40 a.m. | Montos solo como texto, en centavos enteros; conversión a USD redondea hacia arriba | Un número con decimales puede perder centavos; redondear hacia arriba nunca subestima | Tomada |
| 17/10/2026 - 10:40 a.m. | Doble detección de manipulación: aviso del lector + búsqueda de frases en el código | Si el lector es engañado, el código igual lo detecta | Tomada |
| 17/10/2026 - 10:40 a.m. | Gastado al iniciar el set: USD 8.000 | Cada trampa muestra solo su motivo | Reemplazada |
| 17/10/2026 - 10:40 a.m. | Pendiente: modelo de extracción (Qwen 3 8B local vs. modelo en la nube con visión) y stack de la pantalla | Falta el resultado de las pruebas con Qwen | Pendiente |
| 17/10/2026 - 10:48 a.m. | Presupuesto insuficiente → FRENAR (antes ESCALAR) | Sin dinero, aprobar no sirve; además sube la autonomía: el agente lo resuelve sin una persona | Tomada (Sebastián) |
| 17/10/2026 - 10:48 a.m. | Set reordenado: consultor (USD 5.200) primero; analítica sube a USD 3.000; gastado inicial USD 6.500 | Con presupuesto en FRENAR, el consultor salía FRENAR y perdíamos el caso "supera el límite → pide permiso" que el reto pide | Tomada |
| 17/10/2026 - 10:58 a.m. | Nueva comprobación: cuenta cambiada en las últimas 72 h → ESCALAR (caso F12) | Riesgo real n.º 1 de Blinka (BEC); lo resaltan los documentos de Joffre; 15 líneas de código | Tomada |
| 17/10/2026 - 10:58 a.m. | No adoptar: fuzzy match de beneficiario, bloquear facturas vencidas, muestreo aleatorio, umbral SARLAFT, stack de 6 herramientas de observabilidad | Bajan seguridad, autonomía o salen del alcance (detalle en `investigacion-joffre.md`) | Tomada |
| 17/10/2026 - 10:58 a.m. | No usar en el pitch afirmaciones no verificadas sobre la historia del patrocinador ni cifras sin fuente | El propio documento admite que no hay fuente; un dato tiene fecha futura | Propuesta al equipo |
| 17/10/2026 - 11:19 a.m. | Marco ejecutivo y roadmap definitivos (`marco-ejecutivo.md` + artefacto compartible) consolidan brief, diagrama, investigación de Joffre y ruta de Andrés | Una sola fuente de verdad del plan; las tareas con casillas siguen en la ruta de Andrés | Tomada |
| 17/10/2026 - 11:19 a.m. | Stack cerrado: Next.js + Vercel + Supabase (registro solo de insertar, plan B JSON con hash); demo público en replay | El motor ya está en JavaScript; Sebastián conoce Supabase y Vercel | Tomada |
| 17/10/2026 - 11:19 a.m. | Joffre pasa de "motor" a set ciego + suite adversarial; integración empieza sáb 7:00 p.m. | El motor ya está hecho; el set ciego no lo puede armar quien escribió las reglas | Tomada |
| 17/10/2026 - 12:18 p.m. | Repo canónico: `sebaslobo22/404-Team---Blinka-30X`; el motor real es `src/engine` (TS) con las defensas del motor JS portadas; el JS queda en `referencia/` | Dos agentes construyeron el mismo motor en paralelo; se fusionó sobre el que ya tenía ledger y app | Tomada (Sebastián) |
| 17/10/2026 - 12:18 p.m. | Zonas por persona (`docs/ZONAS.md`, CODEOWNERS) y centro de mando `/equipo` con contexto para agentes | Evitar choques entre los tres agentes; AI first: el agente lee `/equipo/contexto.md` antes de editar | Tomada |
| 17/10/2026 - 12:18 p.m. | `404team.vercel.app` sirve el producto en `/` y el centro de mando en `/equipo`; demo en replay; PIN compartido para escribir | Un solo proyecto Vercel; sin claves en el repo | Tomada |
| 17/10/2026 - 12:57 p.m. | Supabase del equipo conectado; migraciones aplicadas con `scripts/migrar.mjs` (cadena en `SUPABASE_DB_URL` del `.env`) | Sin depender del MCP, y repetible por cualquiera del equipo | Tomada |
| 17/10/2026 - 12:57 p.m. | `OPENROUTER_API_KEY` solo en `.env` local, no en Vercel | El demo público corre en replay sin ninguna clave de IA (decisión cerrada) | Tomada |
| 17/10/2026 - 1:24 p.m. | Pareja de lectura: Claude Haiku 5.5 + Gemini 3.1 Flash-Lite (antes Haiku + GPT-6 Luna) | Banco real sobre las 12 facturas: ambos 117/117 campos, empresas distintas, Gemini el más rápido (1,6 s). Luna 116/117 y 3,4 s. Medido sobre el mismo set en que se afinó el prompt: lo confirma el set ciego | Tomada (reemplaza la del marco) |
| 17/10/2026 - 1:24 p.m. | Imágenes: sin alerta `sin_texto_fuente`; pasan solo si dos lecturas de empresas distintas coinciden en todos los campos críticos, confianza ≥ 0,85 y nadie vio instrucciones ocultas | Si no, toda imagen escalaba y la autonomía se hundía. Riesgo residual documentado: la defensa literal no aplica a imágenes | Tomada |
| 17/10/2026 - 2:09 p.m. | Empresa ficticia única: **Aurora Cloud** (dev-set F-001…F-015 + defensas F-016…F-018). Andina Labs queda solo en `referencia/motor-js/` | Es la del producto de Andrés y la hoja del equipo; evita dos datasets en el set ciego y el video | Tomada (Sebastián) |
| 17/10/2026 - 2:27 p.m. | Pareja de lectura confirmada con Aurora: Gemini 3.1 Flash-Lite (161/161) + Claude Haiku 5.5 (159/161); GPT-6 Luna descartado (inventó datos en la imagen ilegible) | Banco sobre 18 facturas × 9 campos; empresas distintas; ambas ≤ 3 s | Tomada |
| 17/10/2026 - 2:45 p.m. | Se mantiene el plan gratuito de Vercel: solo Sebastián fusiona PRs con merge commit; GitHub deshabilita squash y rebase | Hobby bloquea despliegues de commits firmados por no-propietarios; el commit de fusión firmado por Sebastián sí publica (comprobado con PR #8 y #7) | Tomada |
| 17/10/2026 - 2:56 p.m. | Repositorio público (también es entregable del reto); auditado antes: sin claves ni PIN en el historial | Vercel Hobby bloqueaba los despliegues de commits de Andrés en repo privado; además el reto pide repo público | Tomada (Sebastián) |
| 17/10/2026 - 3:09 p.m. | Identidad visual propia del Equipo 404 (monocromo grafito; color solo para PAGAR/FRENAR/ESCALAR); se retira la paleta copiada de Blinka | El brief deja fuera "el diseño de la app de Blinka"; parecer su producto confunde al jurado y no puntúa | Tomada |
