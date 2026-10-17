# Recorrido guiado: evidencia y propuesta

**Emitido:** 17/10/2026 - 3:38 p.m. (Caracas, Venezuela). Investigación con agentes Sonnet: datos medidos, literatura de usabilidad, casos de startups, anti-patrones, verificación de fuentes y propuesta. Revisada y decidida por el integrador.

## Decisión del integrador

1. **El recorrido del usuario pasa de 13 a 4 pasos**, escritos en lectura fácil y centrados en la tarea (ver, abrir una factura, leer el motivo, decidir en la cola), con la tabla de la sección 4. Base: la completitud cae con el largo en todos los benchmarks (dirección consistente, cifras de proveedores) y NN/g no encontró beneficio de tutoriales iniciales largos.
2. **No se lanza solo:** la primera vez aparece una tarjeta pequeña "¿Quieres un recorrido de 1 minuto?" que no oscurece nada; después, botón fijo "Ver cómo funciona".
3. **Lo que sobra pasa a ayuda en el lugar** ("¿Qué es esto?" junto a cada término) y a estados vacíos, con los textos de la sección 5. Ningún aviso de seguridad depende de haber visto el recorrido.
4. **El recorrido actual se convierte en el recorrido del jurado**, accesible solo con `?recorrido=jurado` (fuera del menú del usuario), con autonomía, reglas, defensas y registro.
5. **Se implementa cuando se fusione el rediseño de Codex** (mismos archivos: `app/tour/`), con medición de eventos (sección 7).

**Etiquetas:** [dato medido] · [estudio cualitativo] · [caso documentado] · [opinión de proveedor] · [guía oficial]. Casi toda la cifra de "completitud" de tours viene de proveedores que venden tours (posible sesgo). Ningún informe define "completitud" igual, y ninguno tiene grupo de control. Sirve la dirección de la curva, no el decimal.

---

## 1. Qué dice la evidencia (8 viñetas)

1. **Menos pasos, más gente llega al final.** Con 1-2 pasos completa el 73 %, con 3-5 el 38 %, con 6-8 el 25 % y con 9 o más el 8 % (medianas, 256 tours, 464 empresas, 2026). Es correlación, no causa. [dato medido, proveedor] Produktly 2026: https://produktly.com/research/saas-onboarding-benchmarks-2026. **Confianza: media-alta en la dirección, media en los números.**
2. **Chameleon ve la misma curva.** 3 pasos 72 %, 7 pasos 16 %. Tampoco define "completitud" ni da n por tramo, y el propio proveedor pide leerlo como "direccional". [dato medido, proveedor] Chameleon 2022: https://www.chameleon.io/benchmark-report-2022; Chameleon 2025: https://www.chameleon.io/blog/mastering-product-tours. **Confianza: media.**
3. **El abandono mayor ocurre entre el paso 1 y el 2.** En tours de 5 pasos de Intercom ven el paso 2 el 47 % y el paso 5 el 34 % (tours con 100 o más usuarios). Pendo 2016 habla de cerca del 70 % que descarta tras el paso 1, pero sin muestra y con 10 años. [dato medido, proveedor] Intercom (sin año): https://www.intercom.com/help/en/articles/3027087-see-how-your-product-tours-are-performing; Pendo 2016: https://www.pendo.io/pendo-blog/state-walkthroughs-pendo/. **Confianza: media-alta (Intercom), baja-media (Pendo).** El primer paso tiene que servir por sí solo.
4. **Si el usuario inicia el tour, se completa mucho más.** 69 % iniciado por el usuario contra 23 % automático (Produktly 2026). Chameleon da 67 % por clic contra 31 % por retraso fijo (2025). Hay autoselección, porque quien hace clic ya quiere ayuda. [dato medido, proveedor] **Confianza: media.** La conclusión práctica no cambia: ofrecer, no forzar.
5. **Un tutorial inicial no mejora el resultado.** Con 70 personas y 4 apps iOS, el éxito fue 91 % con tutorial y 94 % sin (no significativo). La facilidad percibida fue 4,92 contra 5,49 (p = 0,047): quien leyó el tutorial sintió la tarea más difícil. El tiempo no difirió. Límite: apps simples, tutorial estático. [dato medido, independiente] NN/g 2020: https://www.nngroup.com/articles/mobile-tutorials/. **Confianza: media-alta.**
6. **La ayuda "tirada" (aparece cuando se necesita) supera a la "empujada".** Los tutoriales empujados interrumpen, se saltan y se olvidan. Es una síntesis sin muestra declarada; su respaldo cuantitativo es la viñeta 5. Apple HIG pide onboarding "rápido, divertido y opcional", interactivo, que no se repita si se saltó y que se pueda reencontrar. [estudio cualitativo + guía oficial] NN/g 2023: https://www.nngroup.com/articles/onboarding-tutorials/; Apple HIG 2024: https://developer.apple.com/design/human-interface-guidelines/onboarding. **Confianza: alta como principio, sin cifra.**
7. **Lo que sí movió resultados fue hacer la tarea real, no leer tooltips.** Superhuman quitó las lecciones de navegación y enseñó solo el camino mínimo. La activación pasó de 40 % a 50 %. Tooltips y checklists sueltos tuvieron "cero impacto", y una configuración obligatoria a pantalla completa subió la finalización de 30 % a más de 98 %. Lo cuenta quien lo construyó, sin experimento controlado, y su onboarding es humano y caro. [caso documentado] First Round 2025: https://review.firstround.com/superhuman-onboarding-playbook/. **Confianza: media-baja para trasladarlo.**
8. **El lenguaje simple y la accesibilidad no son opcionales para nuestros usuarios límite.** Reescribir un sitio en lenguaje simple subió el éxito de 46 % a 82 % en lectores de baja alfabetización (50 participantes, un solo sitio, 2005, antiguo). En mayores de 65 el éxito fue 55 % contra 74 % en jóvenes, y se culpan a sí mismos el 90 % de las veces (31 mayores, 2013). [dato medido, independiente] NN/g 2005: https://www.nngroup.com/articles/writing-for-lower-literacy-users/; NN/g 2013: https://www.nngroup.com/articles/usability-seniors-improvements/. WCAG 2.2 fija contraste 4,5:1, texto al 200 %, objetivos de al menos 24 px, nada que se cierre solo y foco no tapado: https://www.w3.org/TR/WCAG22/. **Confianza: media (muestras chicas y antiguas), alta (WCAG como norma).**

**No se usan:** "82 % descarta tooltips en 1,2 s" (no existe en NN/g), "123 % más finalización" (no se pudo leer la fuente), "+42 % adopción", "+30 % retención", "+50 % activación interactivo vs pasivo" (sin muestra ni método), "Forrester 2026" (sin enlace). Tampoco hay estudio con grupo de control de que un tour suba la activación, ni cifra publicada de tour con acción contra tour pasivo. Eso lo debemos medir nosotros.

---

## 2. Mejores y peores prácticas

| Mejores prácticas | Peores prácticas |
|---|---|
| 3 a 5 pasos como máximo para el recorrido principal | 10 o más pasos lineales de "siguiente, siguiente" |
| Lo inicia el usuario (botón "Ver cómo funciona") | Se lanza solo al entrar |
| Primer paso útil por sí solo | Primer paso de bienvenida vacío |
| El usuario hace una acción real, con datos de ejemplo | Explicar dónde está cada menú |
| Saltar visible, Esc funciona, se retoma, no reaparece | Sin salida, o repite tras saltarse |
| Ayuda junto al control y estados vacíos que enseñan | Todo explicado de golpe al inicio |
| Frases cortas y palabras del usuario | Jerga interna (autonomía, hash, replay) |
| Globo que no tapa lo que explica; nada se cierra solo | Globo sobre el control, o avance automático |
| Datos de ejemplo marcados y nada real se mueve | Mezclar ejemplo y realidad sin aviso |
| Guion de demo separado del tour del usuario | Tour que cuenta la historia del equipo ante el jurado |

---

## 3. Diagnóstico del tour actual de 13 pasos

La información del contenido de los pasos viene de un hallazgo de otro agente (archivo `app/tour/pasos.ts`: 13 pasos, 11 en móvil). No lo verifiqué yo.

| Práctica | Estado | Detalle |
|---|---|---|
| Longitud | Falla | 13 pasos. La evidencia de proveedores muestra 8-16 % de completitud en 7 o más pasos. Nadie mide 13: estamos fuera de todos los datos. |
| Público | Falla | Está escrito para el jurado: autonomía, comprobaciones, hash, modo replay. El usuario objetivo (finanzas, dueña de negocio, no técnica) no necesita eso para aprobar, rechazar o escalar. |
| Lenguaje | Falla | Jerga. No cumple el criterio de lectura fácil que exigen la administradora de 70 años y el niño de 12. |
| Tarea real | Falla | Explica la interfaz. No pide abrir una factura ni resolver una. |
| Quién inicia | Por verificar | Depende de si hoy se lanza solo. Si sí, falla. |
| Salir y retomar | Por verificar | Esc, "Saltar" visible y acceso permanente a "Ver guía". |
| Accesibilidad | Por verificar | Contraste, tamaño 200 %, objetivos 24 px, foco, burbuja en móvil a 320 px. |

---

## 4. Propuesta

### Número de pasos: **4**

Por qué 4: queda dentro del tramo donde la evidencia de proveedores no se desploma (3-5 pasos: 38 % o más, Chameleon 72-74 % con 3-4 pasos). Cubre las tres acciones que el usuario debe hacer (ver, decidir, resolver) más un cierre que lo deja autónomo. Menos de 4 omitiría la cola de aprobación, que es la tarea central. Más de 5 cae en el tramo malo. Es un criterio de diseño apoyado en la dirección de la curva, no un óptimo medido.

Va dentro de un **recorrido iniciado por el usuario** (botón "Ver cómo funciona", visible en todas las pantallas). No se lanza solo, salvo una oferta no bloqueante la primera vez (sección 6).

**Reglas de redacción:** frases de 15 palabras o menos, una idea por frase, palabras de uso diario. Se evita autonomía, comprobaciones, hash, replay, escalar sin explicar. Cada paso lleva botón "Siguiente" grande, "Saltar" visible y "Paso 1 de 4".

| # | Texto exacto | Elemento que enfoca | ¿Acción real? | Protección |
|---|---|---|---|---|
| 1 | **"Aquí ves tus facturas."** / "El sistema ya revisó cada una." / "Te dice si pagar, frenar o pedirte ayuda." | Resumen y lista de la pantalla Decisiones | No | Solo lectura. |
| 2 | **"Abre una factura para ver por qué."** / "Toca esta factura de ejemplo." | Primera fila de la lista (factura de ejemplo marcada) | **Sí**: abrir la factura | Factura marcada **"EJEMPLO"** de forma permanente. Abrirla no cambia nada. |
| 3 | **"Aquí está el motivo."** / "Lee la razón antes de decidir." / "Cada razón está escrita en palabras simples." | Bloque "Por qué" del detalle de la factura | No | Solo lectura. |
| 4 | **"Estas esperan tu respuesta."** / "Tú decides: aprobar, rechazar o pedir ayuda." / "Escribe una nota corta y confirma." | Cola de aprobación, con una factura de ejemplo | **Sí, opcional**: resolver la de ejemplo | Datos de ejemplo marcados. No se envía dinero ni nada real. Botón **"Deshacer"** visible tras confirmar. Cierre con "Listo. Puedes volver aquí cuando quieras: botón Ayuda." |

La nota obligatoria y la explicación visible antes de aprobar se mantienen: son la defensa contra aprobar sin leer.

Notas de lenguaje:
- "Escalar" se muestra al usuario como **"pedir ayuda"** o "pasar a otra persona". La palabra técnica ESCALAR queda en el motor, en el registro y en el pitch para el jurado, no en el tour.
- PAGAR, FRENAR y ESCALAR se acompañan siempre de un icono y un color, pero nunca solo por color.

### Accesibilidad del recorrido

- Texto de burbuja a 18 px como mínimo, contraste 4,5:1, usable a 200 % y a 320 px de ancho.
- Botones de al menos 44 × 44 px y separados.
- Nada avanza ni se cierra solo.
- El foco no queda tapado por la burbuja.
- Esc cierra el recorrido. Tab recorre la burbuja.
- Respeta `prefers-reduced-motion`.
- En móvil, la burbuja es una hoja inferior, y los pasos cuyo elemento no se ve se omiten.
- Cada paso se anuncia con texto (no solo con el resaltado).

---

## 5. Qué sale del tour y pasa a ayuda en el lugar

Estos textos son propuestas para validar. Son los 9 pasos que sobran más lo que el tour contaba con jerga. Cada uno va en un botón **"¿Qué es esto?"** junto al elemento, o en un estado vacío.

| Pasa a | Dónde | Texto exacto |
|---|---|---|
| Pista junto al título | Pantalla Reglas | "Aquí decides cuándo el sistema paga solo. Cambia un número y guarda." |
| Pista junto a cada regla | Reglas, cada campo | Ejemplo para límite: "Límite por pago: lo máximo que se paga sin preguntarte." |
| Pista junto al término | Detalle, "Cuenta reciente" | "El proveedor cambió su cuenta hace poco. Por seguridad, te preguntamos." |
| Pista junto al término | Detalle, "Duplicada" | "Esta factura se parece a otra que ya llegó." |
| Pista del registro | Pantalla Registro | "Aquí queda anotado todo lo que pasó. Nada se borra." |
| Estado vacío | Cola de aprobación sin pendientes | "No hay nada esperando. Cuando algo necesite tu ayuda, aparecerá aquí." |
| Estado vacío | Lista de decisiones sin facturas | "Aún no hay facturas. Cuando lleguen, aquí verás qué hizo el sistema." |
| Aviso en el lugar | Botón aprobar en la cola | "Revisa el motivo antes de aprobar." |
| Pista de resumen | Números de Decisiones | "Pagadas: el sistema las pagó. Frenadas: no se pagaron. Esperan: te toca decidir." |

**Se elimina del lenguaje de usuario:** autonomía, "comprobaciones", cadena de registro y "Verificar cadena", "modo replay", porcentajes de seguridad. Pasan al recorrido del jurado (sección 8).

**Principio de seguridad:** ningún aviso importante depende de haber visto el tour. La advertencia de que algo requiere a una persona debe estar en el lugar de la acción.

---

## 6. Cuándo se muestra y cómo se retoma

- **Primera visita:** al cargar la pantalla, una tarjeta pequeña, no bloqueante, abajo a la derecha: "¿Quieres un recorrido de 1 minuto?" con "Sí, mostrarme" y "Ahora no". No oscurece la pantalla. Si no responde, no insiste.
- **Botón permanente:** "Ayuda / Ver cómo funciona", siempre en el mismo lugar (WCAG 3.2.6) y en todas las pantallas.
- **Pantalla nueva:** al llegar la primera vez a Reglas o Registro, aparece solo el botón "¿Qué es esto?" resaltado, sin abrir nada.
- **Retomar:** se guarda el paso en que quedó (almacenamiento del navegador, con respaldo si no está disponible). Al volver: "Seguir en el paso 3" o "Empezar de nuevo".
- **No repetir:** si lo saltó o terminó, no reaparece solo.
- **Usuarios que vuelven:** nunca se les repite el recorrido. Una novedad futura sería una sola pista contextual.

---

## 7. Cómo medir si funciona (eventos simples)

La evidencia dice que no hay prueba de que el tour mejore la activación, así que se mide.

**Eventos:** `recorrido_ofrecido`, `recorrido_iniciado` (clic en "Sí"), `paso_visto` (con número), `recorrido_saltado` (con el paso), `recorrido_terminado`, `ayuda_abierta` (con el nombre de la pista), `primera_factura_abierta`, `primera_decision_con_nota`, `decision_deshecha`.

**Indicadores:**
- % que inicia el recorrido de los ofrecidos.
- % que lo termina de los que lo inician, y en qué paso se pierden.
- % que completa su primera decisión con nota, con y sin recorrido.
- Qué pistas "¿Qué es esto?" se abren más (revela qué es confuso).
- % que usa "Deshacer" (alto = miedo o confusión).

**Prueba con personas** (con poco tráfico el A/B no sirve: la tesis de Chalmers 2017 no halló diferencias con A/B de onboarding en pequeña escala, una sola empresa, confianza baja-media): 5 a 8 personas ajenas al proyecto, una tarea concreta ("encuentra por qué se frenó esta factura y pide ayuda en otra"), con y sin recorrido. Medir si lo logran y cuánto tardan. Incluir al menos a una persona mayor y a un adolescente. Es una verificación cualitativa, no estadística.

**Criterio de éxito sugerido** (propuesta nuestra, no sale de ninguna fuente): 7 de cada 10 completan el recorrido al iniciarlo, y quienes lo ven resuelven la primera decisión sin ayuda humana.

---

## 8. Recorrido aparte para el jurado

**Sí conviene**, porque son dos públicos con objetivos distintos. El jurado evalúa autonomía, seguridad y explicabilidad. El usuario quiere aprobar, rechazar o pedir ayuda.

La evidencia directa es escasa: no hallé estudios sobre jurados de hackathon. Lo respaldan consejos de inversores (Paul Graham, NextView 2026): contar primero qué hace el producto, ordenar por el problema y no por la pantalla, y tener copia local. Son opiniones. [opinión de inversor] https://paulgraham.com/investors.html; https://nextview.vc/blog/5-common-mistakes-founders-make-when-giving-demos-to-investors/.

**Cómo separarlos sin ensuciar el del usuario:**
- Una entrada distinta, por ejemplo la dirección `/jurado` o un parámetro `?modo=jurado`, nunca visible en el menú normal del usuario.
- Contenido propio: autonomía, las 11 comprobaciones, "deciden las reglas, no la IA", registro encadenado y "Verificar cadena", modo replay, la factura trampa F11 y F12.
- Misma interfaz, textos distintos, para que el jurado vea el producto real.
- Cada modo con su propia marca guardada, para que uno no oculte al otro.
- Guion del pitch (3 minutos) fuera de la app, en `docs/`.
- El tour del usuario nunca menciona al jurado.

---

## 9. Fuentes

**Datos medidos (proveedores):**
- Produktly 2026: https://produktly.com/research/saas-onboarding-benchmarks-2026
- Chameleon 2022: https://www.chameleon.io/benchmark-report-2022
- Chameleon 2024: https://www.chameleon.io/benchmark-report-24
- Chameleon 2025: https://www.chameleon.io/blog/mastering-product-tours y https://www.chameleon.io/benchmark-report
- Intercom (sin año): https://www.intercom.com/help/en/articles/3027087-see-how-your-product-tours-are-performing
- Pendo 2016: https://www.pendo.io/pendo-blog/state-walkthroughs-pendo/

**Independientes y guías:**
- NN/g 2020 (70 participantes): https://www.nngroup.com/articles/mobile-tutorials/
- NN/g 2023 (ayuda empujada vs tirada): https://www.nngroup.com/articles/onboarding-tutorials/
- NN/g 1998 (usuario activo): https://www.nngroup.com/articles/paradox-of-the-active-user/
- NN/g 2021 (estados vacíos): https://www.nngroup.com/articles/empty-state-interface-design/
- NN/g 2005 (baja alfabetización): https://www.nngroup.com/articles/writing-for-lower-literacy-users/
- NN/g 2013 (mayores): https://www.nngroup.com/articles/usability-seniors-improvements/
- Apple HIG 2024: https://developer.apple.com/design/human-interface-guidelines/onboarding
- WCAG 2.2: https://www.w3.org/TR/WCAG22/ (2.4.11 foco no oculto, 2.1.2 sin trampa de teclado, 1.4.10 reflow)
- W3C COGA 2021: https://www.w3.org/TR/coga-usable/

**Casos y opiniones:**
- Superhuman, First Round 2025: https://review.firstround.com/superhuman-onboarding-playbook/
- Duolingo, First Round 2017 (cerca de +20 % de usuarios activos diarios al mover el registro; sin muestra publicada): https://review.firstround.com/the-tenets-of-a-b-testing-from-duolingos-master-growth-hacker/
- Andersen et al., CHI 2012 (tutoriales solo ayudaron en el juego más complejo; +29 % máximo de tiempo de juego): https://grail.cs.washington.edu/projects/game-abtesting/chi2012/
- Chalmers 2017 (A/B de onboarding sin diferencias): https://odr.chalmers.se/items/56509b86-cf17-4c22-b4e8-86b7d3aef6c8/full
- Stripe, modo de prueba (patrón de práctica segura): https://docs.stripe.com/test-mode

**Qué no se pudo confirmar:** el informe Chameleon 2019 (PDF ilegible), la metodología de "completitud" de cualquier proveedor, la guía oficial de GOV.UK, las normas de lectura fácil, Material Design 3, el estudio de ToolClips (no leído), y cualquier medición de un tour de 13 pasos o de un caso cuantificado de "quitamos el tour".

**Pendiente de verificar en el código (diagnóstico de la sección 3):** quién lanza hoy el tour, si Esc y "Saltar" funcionan, y el cumplimiento de accesibilidad.

---

## Anexo · Verificación de las 10 afirmaciones clave


Abrí cada fuente primaria con WebFetch. Solo hice una pasada de lectura y no hice búsquedas adicionales.

| # | Afirmación | Fuente abierta | Muestra | ¿Proveedor? | Veredicto |
|---|---|---|---|---|---|
| 1 | Completitud por pasos: 1-2 = 73 %, 3-5 = 38 %, 6-8 = 25 %, 9+ = 8 % | [Produktly 2026](https://produktly.com/research/saas-onboarding-benchmarks-2026) | 464 empresas y 15,8 M interacciones (ene-jun 2026). Son 256 tours con al menos 50 usuarios iniciados: 45, 65, 84 y 62 por grupo. | Sí. Es una plataforma de onboarding y esta es su propia investigación. | **Confirmada, con matiz.** La propia página dice que es correlación: quien hace tours cortos puede diferir en otras cosas. La muestra sesga a SaaS pequeño y mediano. |
| 2 | Tour iniciado por el usuario 69 %, mixto 32 %, automático 23 % | Produktly 2026 | 34, 40 y 182 tours | Sí | **Confirmada, con matiz.** La fuente advierte que no prueba que pasar a inicio manual triplique la completitud, porque quien lo abre ya mostró interés. |
| 3 | Chameleon 2022: 72 % con 3 pasos y 16 % con 7 pasos | [Chameleon 2022](https://www.chameleon.io/benchmark-report-2022) | No declarada para estas cifras. El total es 58 M de tours en 12 meses. | Sí, vende tours. | **Confirmada, con matiz.** Las cifras están en la página, pero no define "completitud" ni da n por tramo. |
| 4 | Chameleon 2025: 4 pasos = 74 %, 7+ pasos = 16 %, clic = 67 % vs retraso fijo = 31 %, y la barra de progreso suma 12 % | [Chameleon, artículo](https://www.chameleon.io/blog/mastering-product-tours) y [reporte 2025](https://www.chameleon.io/benchmark-report) | Más de 550 M de interacciones, sin desglose | Sí | **Matizada.** En el artículo están 72 %, 74 %, 16 %, 67 % y 31 %. En el reporte sí aparece el 12 % del indicador de progreso. Pero el 67 % es de tours por clic, no por lanzador. Tampoco define "completitud" ni da fechas. El propio artículo dice tratarlo como "direccional". |
| 5 | Chameleon 2025: "2-3 veces" más con tour activado por el usuario y el 1 % superior con 5 pasos o menos | [Chameleon reporte 2025](https://www.chameleon.io/benchmark-report) | 550 M | Sí | **Matizada.** El texto dice 2-3 veces para tours activados por el usuario o con espera inteligente, no solo por el usuario. Los 5 pasos del 1 % superior son datos de 2024. Tampoco define "completitud". |
| 6 | Chameleon 2024: 5 pasos = 21,6 %, promedio = 33,5 %, lanzados por el usuario desde un checklist = 64 % | [Chameleon 2024](https://www.chameleon.io/benchmark-report-24) | Casi 300 M de interacciones de 2023. Sin n por cifra. | Sí | **Confirmada, con matiz.** El informe da dos totales de tours que no concilia (15,96 M y casi 40 M), y llama al 64 % "conversión" y también "completitud". |
| 7 | Intercom: tours de 5 pasos, pasos 2 a 5 vistos por 47, 40, 37 y 34 %. Completitud mediana 34 %. | [Intercom, ayuda](https://www.intercom.com/help/en/articles/3027087-see-how-your-product-tours-are-performing) | Tours activos de 2 a 5 pasos con 100 o más usuarios únicos. Sin año ni número de tours. | Sí, aunque no vende tours como único producto. | **Confirmada.** El criterio de muestra es claro. Falta fecha y el total de tours. |
| 8 | Pendo 2016: cerca del 70 % descarta tras el paso 1, y 1-3 pasos completan cerca de 30 %. Con más de 10 pasos baja a la mitad o menos. | [Pendo, 5/10/2016](https://www.pendo.io/pendo-blog/state-walkthroughs-pendo/) | "Gama amplia de empresas", sin n | Sí | **Matizada.** Confirmo el 70 % tras el paso 1 y el 30 % para 1-3 pasos. Para más de 10 pasos el artículo dice "casi 2 veces menos" en un lugar y "menos de la mitad" en otro. No dice que "se reduce a la mitad". Los gráficos por paso son imágenes. Tiene 10 años y no tiene n. |
| 9 | NN/g 2020: 70 personas, 4 apps iOS. Éxito 91 % con tutorial vs 94 % sin. Facilidad 4,92 vs 5,49 (p = 0,047). Tiempo 93,5 s vs 85,2 s (no significativo). | [NN/g, Kendrick 2020](https://www.nngroup.com/articles/mobile-tutorials/) | 70 personas (35 y 35), 4 apps de iPhone, 5 % de pruebas excluidas | No, es independiente. | **Confirmada.** Todas las cifras coinciden. Es un tutorial estático en apps simples y el tiempo excluye la lectura. Los autores avisan que puede no generalizarse. |
| 10 | NN/g 2023: los tutoriales "empujados" interrumpen, se saltan, se olvidan y no mejoran el desempeño | [NN/g, Laubheimer 2023](https://www.nngroup.com/articles/onboarding-tutorials/) | Ninguna. El artículo cita "nuestros estudios" sin n. | No | **Confirmada, con matiz.** La afirmación está tal cual, pero es una síntesis cualitativa sin muestra declarada. Su respaldo cuantitativo es el estudio de 2020 (fila 9). |

Dos claims de otros informes que también abrí:

- **Superhuman** ([First Round, Vohra 2025](https://review.firstround.com/superhuman-onboarding-playbook/)): **confirmada.** Más de 65 % migró su correo completo. La asistencia opcional fue 15 % (frente a 100 % cuando era obligatoria). Los tooltips y checklists tuvieron "cero impacto". La configuración a pantalla completa subió la finalización de 30 % a más del 98 %. La activación pasó de 40 % a 50 %. Es un caso documentado por el propio responsable, no un experimento controlado.
- **Andersen et al., CHI 2012** ([proyecto UW](https://grail.cs.washington.edu/projects/game-abtesting/chi2012/)): **matizada.** Confirmo más de 45.000 jugadores, 8 diseños y 3 juegos. Los tutoriales ayudaron en el juego más complejo, con hasta +29 % de tiempo de juego. "Hasta" es un máximo. La página no dice que ese juego sea Foldit. El +75 % de progreso no está en la página, así que no lo uses.

**Cifras que no encontré y que conviene no usar:**

- El "123 % más de finalización" atribuido al reporte de Chameleon 2019. No pude abrir esa fuente.
- La afirmación de "NN/g 2024: 82 % descarta tooltips en 1,2 s". El informe de referencia ya la marcó como inexistente en NN/g, y yo no la encontré en NN/g.
- Los "+42 % de adopción", "+30 % de retención" y "+50 % de activación" de UserGuiding y Userpilot. No tienen fuente primaria.

**Conclusión:** La dirección es firme: menos pasos y tours que el usuario inicia completan más, y un tutorial largo de bienvenida no mejora el desempeño. Esto lo apoyan seis fuentes de proveedores que no coinciden entre sí en los decimales. También lo apoyan un experimento independiente (NN/g 2020, 70 personas, solo apps simples de iOS) y la síntesis de NN/g 2023, que no declara muestra. Las cifras exactas no son firmes: ningún informe define "completitud" y la autoselección infla los tours iniciados por el usuario. Tampoco existe evidencia con grupo de control de que un tour suba la activación. Para decidir, sirve el umbral práctico de unos 5 pasos o menos, no los decimales.
