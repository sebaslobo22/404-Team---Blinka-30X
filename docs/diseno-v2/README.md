# Diseño v2 · Papel y tinta

Inicio: 17/10/2026, 3:30 p. m. Caracas. Rama: `sebastian/diseno-v2`. SHA inicial: `218b37ee68e410360954bbaf110b82d0b599cae7`. Árbol limpio al comenzar.

## Estado

Sistema y seis pantallas implementados y verificados con las salvedades de este documento. Sebastián confirmó que la reserva `app` de `codex-diseno` corresponde a este chat. El recorrido y la barra lateral sí existen en esta base, tras la integración de la PR #10.

## Comprobaciones iniciales

- `npm run build`: pasa.
- `npm run typecheck`: pasa, ejecutado después del build.
- `npm test`: 369 pasan, una omitida; 11 archivos de pruebas en verde.

## Dirección

Papel mate y tinta cálida. Texto de 18 px por defecto, mínimos de 16 px, tamaños relativos al sistema. Veredicto → razones → evidencia. Un título con la pregunta de cada pantalla. Tres grupos de facturas, con las que necesitan ayuda primero. Navegación lateral amplia por defecto y cuatro destinos al pie en móvil. Tamaño de letra persistente en ambos.

Los valores sugeridos de texto secundario y bordes se ajustaron para cumplir los contrastes solicitados. Las medidas finales se detallan abajo.

## Capacidades comprobadas por lectura

Graphify se consultó antes de leer `src/demo/estado.ts` y `src/demo/traza.ts`. El índice consultado describe `ff92ed8`, anterior al SHA inicial; las firmas y fragmentos locales relevantes se comprobaron después. No se modificó `src/`.

El generador existente `crearEstado` produce un estado aislado en memoria con el motor real. Permite comparar reglas propuestas sin reemplazar el estado de la sesión. El guardado existente sí reconstruye el conjunto de decisiones y elimina las aprobaciones; la pantalla debe explicarlo antes de confirmar.

## Datos y límites

- La API actual de aprobación no recibe una nota. No se añadirá un campo que el servidor no guarda ni se afirmará que la nota queda registrada.
- El producto usa lecturas de muestra; los dos resultados reales de los modelos no llegan a estas pantallas.
- Hay texto original y fragmentos detectados que pueden resaltarse. No hay un enlace al archivo original dentro de la fila de producto.
- No hay fecha de vencimiento en la información que presenta la página actual. Se puede ordenar la cola por el monto convertido a USD que ya calculó el motor.
- La verificación de la cadena detecta ciertos cambios contra su punto de control. No demuestra que nadie haya modificado jamás el registro. El sello debe explicar ese alcance.
- La edición de proveedores permitidos sigue pendiente en los requisitos. Se conservarán las capacidades existentes sin crear altas o bajas ficticias.
- Las pruebas de cinco segundos y de tareas sin ayuda con personas reales requieren participantes. La inspección del diseñador y la automatización se documentarán como tales.
- Los índices de legibilidad calculados automáticamente se distinguirán de una evaluación humana de comprensión.

## Qué cambió

- `/`: pregunta clara, resumen real, tres cifras y tres carriles. «Te necesita» abre primero. F-016 aparece entre los primeros siete para que el recorrido pueda señalarla. «Ver más» conserva el resto; la tabla se pide de forma explícita.
- `/facturas/[id]`: veredicto, razones abiertas con los fallos primero y evidencia en un panel. Aprobar o rechazar se hace aquí si sigue pendiente; jamás se ofrece para una frenada.
- `/cola`: solo pendientes, por monto normalizado a USD descendente. La revisión incluye nota y confirmación con monto. Al resolver, el estado se anuncia y la tarjeta sale de la lista.
- `/reglas`: oraciones editables, ayuda cotidiana y vista previa con el motor existente. La comparación usa un estado separado y no escribe en la sesión. El guardado y el restablecimiento conservan sus APIs y efectos anteriores, con confirmación.
- `/registro`: fechas reales del registro en hora de Caracas; siete entradas iniciales y «Ver más». La huella se abre como evidencia. La revisión informa «No se detectaron cambios», sin prometer una inmutabilidad que no puede demostrar.
- `/team`: mismos datos, puertas, autenticación, tiempo real y modo semilla. Se preservó la guarda de modo público. Las personas viven tras «Ver más del equipo»; se traducen dos términos de las notas sin alterar lo guardado.

## Diseño y accesibilidad

Inter, pesos 400/600, cuerpo 1,125 rem y escala de seis tamaños: 1, 1,125, 1,5, 2, 2,5 y 3 rem. No se usa texto inferior a 1 rem. Interlineado 1,6. JetBrains Mono queda para montos, códigos y huellas. Todas las hojas tienen fondo sólido; no hay texto sobre cristal. Las sombras se limitan al panel y al recorrido.

A, A+ y A++ guardan el tamaño en el navegador: 100 %, 125 % y 150 % de la raíz. La barra amplia es la predeterminada. La compacta conserva palabras para que nada dependa de pasar el ratón. En móvil se usan cuatro destinos inferiores. Con A++ esa navegación entra en el flujo antes del contenido para que no tape texto al ampliar.

Se midieron los tokens finales con luminancia relativa sRGB: mínimo **8,26:1 en texto** y **3,40:1 en bordes/controles**. Las 24 combinaciones están en [contraste.json](contraste.json). Los grises sugeridos se oscurecieron en claro y aclararon en oscuro para cumplir AAA. Los estados tienen texto e icono propio: círculo con marca, mano y persona.

Los paneles usan `dialog` nativo: teclado, Escape y retorno al botón de apertura comprobados. Los plegables son nativos. En la cola solo una revisión se abre a la vez. Todos los objetivos visibles de las seis rutas midieron al menos 48 × 48 px; se recorrieron con Tab y foco sólido. [Evidencia de accesibilidad](accesibilidad.json). Los controles del servidor de desarrollo se ocultaron durante estas comprobaciones y las capturas.

No hay entradas automáticas, contador animado ni recorrido que se abra solo. El movimiento queda para el foco del recorrido y la salida de una tarjeta resuelta. `prefers-reduced-motion` elimina las transiciones. Se comprobaron los **13 pasos de escritorio y 12 de móvil**, con objetivo presente en cada paso que lo declara. Se corrigió el scroll dentro de la evidencia; no bastaba con desplazar la página. [Prueba de escritorio](pruebas-funcionales.json) · [Prueba móvil](recorrido-movil.json).

## Revisión de cinco segundos

Esta es una **inspección heurística del diseñador**, no una prueba con Carmen, Mateo o participantes reales. No se puede afirmar comprensión en cinco segundos sin esas personas.

| Pantalla | Qué permite entender primero | Siguiente acción visible | Revisión propia |
|---|---|---|---|
| Decisiones | Qué pasó y cuántos cobros piden ayuda | Revisar pendientes | La pregunta y la acción aparecen antes del detalle |
| Factura | Qué decidió y qué dato causó la decisión | Revisar este pago, si corresponde; razones abiertas | Veredicto y monto juntos |
| Cola | Qué cobros necesitan una respuesta | Revisar este pago | Se excluyen frenadas y ya resueltas |
| Reglas | Qué topes usa el agente | Editar un valor y guardar tras revisar | Cada campo explica el efecto en una frase |
| Registro | Qué se guardó y si se detectaron cambios | Comprobar ahora | Fechas y veredictos antes de huellas |
| Equipo | Cómo va el trabajo y qué falta | Una de las cuatro puertas | Tres hechos y puertas antes de personas y tareas |

El límite de siete se aplica a las entradas de cada lista activa; las cifras de resumen se limitan a tres. Las razones muestran siete comprobaciones antes de «Ver más». La búsqueda del texto visible inicial no encontró `R1`–`R8`, `hash`, `replay`, `JSON` ni `extracción` fuera de evidencia. [Auditoría de texto](auditoria.json). Los datos operativos originales del equipo pueden contener nombres de herramientas y términos propios del proyecto; no se reescribieron tareas ni acuerdos.

## Las tres tareas

Las tareas se hicieron en navegador por automatización, **no como estudio de personas sin ayuda**. Los recuentos incluyen clics de navegación, foco del campo y confirmación; teclear y hacer scroll no suman clics.

1. **Por qué se frenó F-006**: desde `/`, abrir «Frenadas» (1); abrir «F-006» (2). Se lee que el cobro ya figura entre los pagos; las razones están abiertas. [Captura](tarea-1-factura-frenada.png).
2. **Aprobar con nota**: desde `/cola`, abrir «Revisar este pago» (1); enfocar y escribir la nota (2); confirmar el monto (3). Se comprueba nota vacía, petición pendiente, resultado y retirada de la lista. [Antes](tarea-2-confirmar-pago.png) · [Resultado](tarea-2-pago-aprobado.png). La nota no persiste porque el contrato existente no la recibe; la pantalla lo dice.
3. **Subir el límite a USD 6.000 y mirar qué cambia**: desde `/`, abrir «Tus reglas» (1); enfocar y editar el primer campo (2). La vista previa llega sola tras el cambio y no guarda nada. [Captura](tarea-3-limite-6000-vista-previa.png). Después se probó guardar con confirmación y se comprobó la nueva versión en la siguiente decisión generada por el flujo existente.

También se probó rechazar una escalada y verificar ambas cadenas. Las mutaciones fueron solo contra `localhost:3000`, cuyo producto usa el singleton en memoria; se restauró al terminar. Las pruebas de interfaz no escribieron en datos operativos compartidos de `/team`.

## Prueba Carmen: tamaño y reflujo

Se generaron **48 capturas normales**: seis rutas × 390/1280 px × claro/oscuro × preferencia de barra amplia/compacta. A 390 px la barra lateral está oculta; las dos preferencias producen la misma navegación móvil. Se añadieron **24 capturas con A++** en [zoom/](zoom/): seis rutas × 200/400 % × dos temas. Se revisaron las imágenes, no solo su generación.

**Método exacto:** emulación de reflujo equivalente a partir de una ventana de 1280 px: viewport CSS de 640 px con DPR 2 para 200 %, y 320 px con DPR 4 para 400 %. A++ conserva una raíz de 24 px. No es una prueba del comando de zoom de la interfaz del navegador ni de hardware real. Esa validación manual queda pendiente.

Las 72 combinaciones devolvieron HTTP 200, cero errores de página y cero desbordamientos horizontales. La portada a 400 % tuvo un desbordamiento por los resúmenes; se corrigió. La navegación fija con A++ podía tapar texto; ahora se reacomoda en el flujo. Los bloques y campos se revisaron a una columna. [Matriz completa](matriz.json).

### Índice de capturas

Las siguientes vistas usan la barra amplia. La [matriz](matriz.json) enlaza también las variantes compactas y de zoom.

| Ruta | 390 claro | 390 oscuro | 1280 claro | 1280 oscuro |
|---|---|---|---|---|
| Inicio | [Ver](decisiones-390-claro-ampliada.png) | [Ver](decisiones-390-oscuro-ampliada.png) | [Ver](decisiones-1280-claro-ampliada.png) | [Ver](decisiones-1280-oscuro-ampliada.png) |
| Factura | [Ver](factura-F-005-390-claro-ampliada.png) | [Ver](factura-F-005-390-oscuro-ampliada.png) | [Ver](factura-F-005-1280-claro-ampliada.png) | [Ver](factura-F-005-1280-oscuro-ampliada.png) |
| Cola | [Ver](cola-390-claro-ampliada.png) | [Ver](cola-390-oscuro-ampliada.png) | [Ver](cola-1280-claro-ampliada.png) | [Ver](cola-1280-oscuro-ampliada.png) |
| Reglas | [Ver](reglas-390-claro-ampliada.png) | [Ver](reglas-390-oscuro-ampliada.png) | [Ver](reglas-1280-claro-ampliada.png) | [Ver](reglas-1280-oscuro-ampliada.png) |
| Registro | [Ver](registro-390-claro-ampliada.png) | [Ver](registro-390-oscuro-ampliada.png) | [Ver](registro-1280-claro-ampliada.png) | [Ver](registro-1280-oscuro-ampliada.png) |
| Equipo | [Ver](team-390-claro-ampliada.png) | [Ver](team-390-oscuro-ampliada.png) | [Ver](team-1280-claro-ampliada.png) | [Ver](team-1280-oscuro-ampliada.png) |

## Prueba Mateo: legibilidad

Medición **local y reproducible**, sin enviar textos a terceros. El revisor automático rechazó pegar el contenido en un analizador público por la salida de datos. Se usó [medir.py](medir.py), con la variante `206,84 − 60 × sílabas/palabras − 1,02 × palabras/frases`. La segmentación considera los saltos entre bloques de interfaz; las sílabas se estiman con reglas de vocales, diptongos e hiatos. Nombres propios y préstamos pueden producir errores. Por ello son **estimaciones automáticas**, no puntuaciones certificadas ni prueba de comprensión.

La [herramienta pública consultada](https://tryclew.io/es/herramientas/analizador-legibilidad-texto) describe esa variante y el análisis en el navegador. La [investigación de Blanco y Gutiérrez](https://scielo.isciii.es/scielo.php?pid=S1135-57272002000400007&script=sci_arttext) contextualiza el uso de fórmulas y sus límites; las implementaciones difieren en cómo segmentan y cuentan.

| Pantalla | Fernández-Huerta estimado |
|---|---:|
| Decisiones | 84,76 |
| Factura F-005 | 87,38 |
| Cola | 83,27 |
| Reglas | 87,69 |
| Registro | 87,84 |
| Equipo | 86,75 |

El corpus completo y los recuentos se conservan en [legibilidad.json](legibilidad.json). Las explicaciones técnicas exactas siguen disponibles en evidencia. Las ayudas cotidianas de reglas explican límite por pago, tope mensual, proveedor, cobro repetido, margen y cuenta nueva. Una revisión editorial con lectores reales sigue siendo necesaria.

## Reproducción

No se instalaron dependencias. Se comprobó primero con `npm run dev`; las últimas capturas de zoom usan `npm run start` tras el build final. Con un servidor local activo, definir `PLAYWRIGHT_MODULE` con la ruta de un Playwright ya disponible y ejecutar los scripts `.cjs` de esta carpeta. `verificar.cjs` muta y restaura únicamente el producto local; **ejecutarlo antes de capturar**. `capturar.cjs` y `auditar.cjs` son de lectura. `lenguaje.cjs` comprueba moneda explícita y la presentación de datos ausentes sin sustituir las pruebas del motor.

## Cierre

- `npm run typecheck`: pasa.
- `npm test`: 369 pasan, una omitida; 11 archivos de pruebas en verde, igual que al inicio.
- `npm run build`: pasa. Sin errores ni advertencias nuevas.
- Flujos locales: aprobar, rechazar, nota, confirmación, espera, reglas y siguiente versión, cadena y recorrido pasan.
- Modo público: `/` devuelve 200 sin enlace a Equipo; `/team`, `/api/team/contexto` y `/team/contexto.md` devuelven 404. Modo semilla: `/team` devuelve 200 con aviso de datos de muestra. [Resultados](modos.json).
- Sin cambios en archivos protegidos. Cambios propios limitados a `app/**` y `docs/diseno-v2/**`; `main` local coincide con el SHA inicial. Sin push ni merge.
- Pendientes: zoom manual del navegador, prueba con lectores reales y persistencia de notas, que requiere otro contrato de servidor.

Commits de implementación: `b122ae0`, `2062e43`, `2acdb1c`, `4703844`, `da33924`, `057e1d7`, `878bfbb`, `e53ff99`. Todos incluyen la coautoría solicitada. El último commit de documentación incorpora las capturas y esta evidencia.

Coordinación: reservas de `app`, `app/team` y `docs` con el agente `codex-diseno`, mediante el comando oficial. `app` y `app/team` se liberaron al cerrar la implementación; `docs` se libera después del commit de evidencia. No genera cambios en archivos del repositorio.

Después del hackathon: validar con Carmen y Mateo, guardar las notas en servidor y conectar archivo original y lecturas reales. Conservar los contratos mediante una migración explícita y pruebas del flujo completo.
