# Metaprompt — Sistema de diseño "Veredicto" (rediseño total de la interfaz)

**Emitido:** 17/10/2026 - 3:13 p.m. (Caracas, Venezuela). Reemplaza a `docs/METAPROMPT-CODEX-UI.md`.
Lo corre Sebastián en Codex, rama `sebastian/diseno-v2`, **después** de fusionar la PR del tour guiado y la barra lateral.
Antes de pegarlo: `node scripts/equipo.mjs tomar app --agente codex-diseno` y avisar a Andrés.

> Copia TODO lo que está debajo de la línea y pégalo como primer mensaje en Codex, abierto en la raíz del repo `404-Team---Blinka-30X`.

---

Eres diseñador de producto e ingeniero front-end senior. Vas a crear un **lenguaje y sistema de diseño nuevo** para toda la interfaz de este sitio Next.js 15 (App Router, TypeScript, CSS propio) y a aplicarlo de punta a punta. Puedes rehacer layouts, componentes y jerarquía por completo. Lo que no puedes cambiar es la lógica: rutas, datos, acciones y reglas siguen igual.

Lee primero, en este orden: `docs/brief-blinka.md` (el reto), `docs/requisitos.md` (qué exige y dónde se cumple), `CLAUDE.md`, `docs/ZONAS.md`. Después lee `app/layout.tsx`, `app/globals.css`, `app/tour/*` y cada `page.tsx` bajo `app/` con sus componentes. Para entender qué datos tiene cada pantalla, usa Graphify antes de leer código de `src/` (`graphify_file_neighbors` con `symbols_only:true`, repo `sebaslobo22/404-Team---Blinka-30X`), y no modifiques nada en `src/`.

## 1. El problema que resuelve el diseño

El producto es un agente que lee facturas con IA y decide, con reglas en código, si **paga**, **frena** o **escala** cada una a una persona. Nunca mueve dinero. Lo usan dos tipos de persona:
- **Una persona de finanzas** (CFO o analista) que quiere saber en segundos qué pasó con sus facturas y qué le toca a ella.
- **Un jurado** que en pocos minutos evalúa tres cosas: **autonomía** (cuánto decide bien sola la máquina), **seguridad** (un solo pago indebido descalifica) y **explicabilidad** (cualquiera entiende cada decisión sin abrir el código).

Ninguno de los dos es técnico ni tiene paciencia. Si la primera pantalla parece una cabina de avión, perdimos. La interfaz es el argumento del proyecto.

## 1b. Para quién diseñamos: las dos personas límite

Diseña para estas dos personas. Si ellas pueden usarla sin ayuda, cualquiera puede.

- **Carmen, 70 años, administradora de una empresa familiar.** Tiene miopía severa: lee con la pantalla cerca, sube el zoom del navegador al 200 % y se cansa con letras pequeñas, grises claros o fondos con transparencias. Desconfía de lo que no entiende y teme "romper algo".
- **Mateo, 12 años, tiene un puesto de chucherías y limonada.** Entiende "le pagué a mi proveedor de limones" pero no "beneficiario", "conciliación" ni "presupuesto por categoría". Lee rápido y salta lo largo. Aprende tocando.

Consecuencias obligatorias para todo el diseño:
1. **Texto grande por defecto.** Cuerpo mínimo 18 px (1.125 rem), veredicto 22–24 px, nada por debajo de 16 px (ni etiquetas, ni pies, ni cifras monoespaciadas). Interlineado 1.6. Todo en `rem` para respetar el tamaño de letra del sistema.
2. **Contraste AAA (7:1) en todo el texto**, no solo en el veredicto. Nada de gris claro sobre blanco para información. El cristal translúcido nunca va detrás de texto: si hay cristal, el texto se apoya en una superficie sólida.
3. **Zoom 200 % sin perder nada y 400 % sin scroll horizontal** (contenido que se reacomoda a una columna). Ninguna información depende de pasar el mouse por encima.
4. **Objetivos táctiles de 48 × 48 px mínimo**, separados entre sí. Botones con texto, no solo icono. En la barra lateral, la versión ampliada (icono + palabra) es la predeterminada.
5. **Foco de teclado muy visible** (anillo de 3 px con contraste alto) y nada que se mueva solo.
6. **Control "Tamaño de letra" (A · A+ · A++)** siempre a mano en la barra lateral y en la cabecera móvil; se recuerda en el navegador.
7. **Lectura fácil.** Frases de 15 palabras o menos, una idea por frase, palabras de todos los días. Usa el diccionario de la sección 7 y, la primera vez que aparece un concepto, una explicación de una línea con un ejemplo cotidiano ("Límite por pago: el máximo que el agente paga solo, sin preguntarte. Como si tu hijo pudiera comprar hasta 5 dólares sin pedirte permiso."). Objetivo: índice de legibilidad Fernández-Huerta ≥ 80 en los textos de la interfaz.
8. **Nada da miedo:** toda acción importante se puede deshacer en la misma pantalla durante unos segundos ("Aprobada. Deshacer") o pide confirmación con palabras claras ("Sí, aprobar este pago de USD 9.800").
9. **Iconos que se entienden sin leer:** pagada = ✓ en círculo verde, frenada = mano/alto en rojo, te necesita = persona/campana en ámbar; siempre con su palabra al lado.

## 2. La idea central: cada decisión es un veredicto en tres capas

Todo el sistema se construye sobre un único patrón, que se repite en cada pantalla para que el usuario lo aprenda una sola vez:

1. **Veredicto** (siempre visible): una frase en lenguaje humano que dice qué se decidió y por qué, con la cifra que importa.
   *"Pagamos USD 1.600 a Luz Andina. Cumple todas las reglas."*
   *"Frenamos esta factura: Luz Andina ya cobró la F-001 este mes."*
   *"Te necesitamos: el monto (USD 9.800) supera tu límite de USD 5.000 por pago."*
2. **Razones** (un clic: "¿Por qué?"): la lista de comprobaciones, cada una como frase corta con ✓, ✕ o "no aplica". Primero las que fallaron.
3. **Evidencia** (otro clic: "Ver evidencia"): el documento original con lo detectado resaltado, los datos que leyó la IA, la versión de reglas y la huella del registro (hash).

Este patrón **es** la explicabilidad. Si un elemento de la interfaz no encaja en una de las tres capas, probablemente sobra.

## 3. Principios (en orden de prioridad cuando choquen)

1. **Una pregunta por pantalla.** Cada pantalla responde una sola pregunta y la escribe como título: "¿Qué pasó con mis facturas?", "¿Qué necesita mi aprobación?", "¿Cuáles son mis reglas?", "¿Qué quedó registrado?".
2. **Primero lo que me toca.** Lo que requiere acción humana va arriba y es lo único con color de acción. Lo resuelto se lee tranquilo.
3. **Frases antes que tablas.** Por defecto no hay tablas: hay listas de veredictos que se leen como oraciones. La vista de tabla existe solo como opción ("Ver como tabla") para quien la pida.
4. **Presupuesto de carga cognitiva por pantalla** (obligatorio): como máximo **1 acción principal**, **3 cifras grandes**, **7 elementos visibles** antes de "Ver más", **0 términos técnicos** a la vista (nada de "R1", "hash", "replay", "JSON", "extracción"; esos van en la capa de evidencia, con su traducción).
5. **El color es significado, nunca decoración.** Verde = pagada, rojo = frenada, ámbar = te necesita. Todo lo demás en neutros. Cada color va siempre acompañado de texto y de forma (icono + palabra); quien no distingue colores debe entender igual.
6. **Revelar a petición.** Todo detalle se abre cuando el usuario lo pide (clic, despliegue, scroll) y se cierra igual de fácil. Nada aparece de golpe.
7. **El movimiento explica, no adorna.** Se anima solo para mostrar de dónde viene y a dónde va algo (una capa que se despliega, una factura que pasa de "te necesita" a "pagada" al aprobarla). Duraciones 180–320 ms. Todo se apaga con `prefers-reduced-motion`.
8. **Nada da miedo.** Ninguna acción es irreversible sin confirmación en la misma pantalla. FRENAR nunca muestra un botón de aprobar. Los errores dicen qué pasó y qué hacer, sin culpas.

## 4. Lenguaje visual

**Identidad propia del Equipo 404.** Prohibido usar colores, logo, textos o layout de blinka.co: el brief deja fuera "el diseño de la app de Blinka" y no debemos parecer su producto.

- **Concepto material:** papel y tinta. Superficies claras y mates como hojas de un expediente ordenado; la información "se apila" en capas (veredicto → razones → evidencia) que se despliegan como hojas que salen de una carpeta. Un toque de cristal translúcido solo en elementos flotantes (barra lateral, panel de evidencia, burbuja del tour), nunca en el contenido.
- **Color:** neutros cálidos (claro: fondo `#F5F5F2`, superficie `#FFFFFF`, tinta `#18181B`, tenue `#5E5D58`, línea `#E2E1DC`; oscuro: fondo `#0E0E10`, superficie `#1A1A1D`, tinta `#F2F2EF`, tenue `#A3A29C`, línea `#2F2F34`) y un acento grafito. Los únicos colores saturados son los tres de decisión, con versión suave para fondos. Defínelos como tokens en `:root`, en `@media (prefers-color-scheme: dark)` y en `[data-theme]`; ningún color literal en componentes. Contraste AAA (7:1) en todo el texto; AA (3:1) en bordes y controles.
- **Tipografía:** una sans de alta legibilidad pensada para baja visión (Atkinson Hyperlegible o Inter, desde Google Fonts, con `system-ui` de respaldo; formas de letras inconfundibles: I/l/1, O/0) y una monoespaciada solo para cifras alineadas, códigos de factura y huellas (`font-variant-numeric: tabular-nums`). Escala de 6 tamaños que empieza en 16 px; cuerpo 18 px; veredicto 22–24 px; pesos 400 y 600 (nada de pesos finos).
- **Espacio:** escala de 4 px; mucho aire; ancho de lectura máximo ~65 caracteres en frases largas.
- **Iconos:** un set propio en SVG inline, trazo fino y uniforme; un icono por cada estado de decisión y por cada destino de navegación.
- **Forma:** radios generosos y consistentes (tarjetas 16 px, controles 12 px, píldoras 999 px); sombras amplias y suaves solo en lo que flota.

## 5. Componentes del sistema (créalos una vez, úsalos en todo)

| Componente | Para qué |
|---|---|
| `Veredicto` | La frase de decisión con su icono de estado, la cifra clave y el botón "¿Por qué?". Es la unidad de toda lista. |
| `Razones` | Lista de comprobaciones como frases con ✓/✕/no aplica; las fallidas primero; cada una con una línea de detalle. |
| `Evidencia` | Panel lateral (escritorio) u hoja inferior (móvil) con documento resaltado, datos leídos, versión de reglas y huella. Traduce cada término técnico. |
| `Carril` | Agrupa veredictos por estado: "Te necesita", "Frenadas", "Pagadas". Muestra el conteo y colapsa. |
| `Cifra` | Número grande con su frase de contexto ("44 % decidido sin intervención humana"). Máximo 3 por pantalla. |
| `ReglaEnFrase` | Editor de reglas escrito como oraciones con el valor editable dentro: *"Pídeme permiso para todo pago mayor a [USD 5.000]."* *"Avísame si una factura no cuadra con lo acordado por más de [2 %]."* *"Frena si un proveedor repite el mismo cobro en [30] días."* Cada cambio muestra qué pasaría ("Con este cambio, 2 facturas pasarían de pagadas a te necesita") antes de confirmar. |
| `Accion` | Botón principal único por pantalla; secundarios como texto. Aprobar/rechazar con nota obligatoria y confirmación en línea. |
| `Vacio` | Estado vacío con una frase útil y la siguiente acción ("No hay nada esperando tu aprobación. Todo está decidido."). |
| `Aviso` | Mensaje discreto de contexto (modo demostración con datos ficticios), descartable. |

Integra los componentes que ya existen: **el tour guiado con foco** (`app/tour/`) y **la barra lateral de escritorio** se conservan y se re-visten con el nuevo sistema; actualiza los anclajes `data-tour` a los nuevos elementos y revisa que los 12+ pasos sigan cayendo sobre lo correcto.

## 6. Arquitectura de pantallas

Navegación: barra lateral en escritorio (≥ 1024 px), barra inferior de 4 destinos en móvil. Máximo 4 destinos principales más "Equipo" y "Ver recorrido" al pie.

1. **`/` — "¿Qué pasó con mis facturas?"**: arriba, una frase resumen ("De 18 facturas, pagamos 4, frenamos 4 y 10 te necesitan.") y como máximo 3 cifras (autonomía, coincidencia con lo esperado, pendientes). Debajo, tres `Carril`, con "Te necesita" primero y abierto. Cada factura es un `Veredicto`.
2. **`/facturas/[id]` — "¿Por qué decidimos esto?"**: el `Veredicto` grande arriba, las `Razones` abiertas, la `Evidencia` a un clic. Si está pendiente, la `Accion` de aprobar/rechazar aquí mismo.
3. **`/cola` — "¿Qué necesita mi aprobación?"**: solo veredictos en ámbar, del más urgente al menos (mayor monto o vencimiento más cercano primero). Aprobar/rechazar con nota, sin salir de la lista; al resolverse, la tarjeta se desliza fuera con su nuevo estado.
4. **`/reglas` — "¿Cuáles son mis reglas?"**: todas las reglas como `ReglaEnFrase`, agrupadas en "Cuánto puedo pagar", "A quién le pago", "Qué reviso de cada factura". Vista previa del efecto antes de guardar; versión visible después.
5. **`/registro` — "¿Qué quedó registrado?"**: línea de tiempo de veredictos con fecha y hora; arriba, un sello "Registro íntegro: nadie lo ha modificado" que se obtiene al verificar la cadena (botón "Comprobar ahora"). La huella técnica, solo en evidencia.
6. **`/team`**: aplica el mismo sistema (tokens, tipografía, componentes de lista y aviso) sin cambiar su lógica ni su estructura de puertas.

## 7. Lenguaje (microcopy)

- Español neutro, segunda persona, voz activa, frases de menos de 20 palabras.
- Diccionario obligatorio en la interfaz visible: PAGAR → "Pagada" / "Pagamos"; FRENAR → "Frenada" / "Frenamos"; ESCALAR → "Te necesita" / "Necesitamos tu aprobación"; regla R1 → "límite por pago"; R2 → "proveedor autorizado"; R5 → "cobro repetido"; R6 → "no cuadra con lo acordado"; R8 → "cuenta bancaria cambiada hace poco"; INYECCION → "la factura intenta dar órdenes"; CONFIANZA → "no se leyó con claridad". Los códigos técnicos solo aparecen en la capa de evidencia, al lado de su traducción.
- Cifras con formato local (USD 1.600, COP 8.000.000) y moneda siempre escrita.

## 8. Qué NO hacer

- No toques `src/`, `supabase/`, `data/`, `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.mjs`, `middleware.ts`. No cambies rutas, rutas de API, nombres de campos ni el comportamiento de ninguna acción. Si crees que hace falta un dato que la página no recibe, no lo inventes: anótalo en tu reporte.
- No instales dependencias (ni Tailwind, ni librerías de componentes, iconos o animación).
- No inventes cifras ni textos de marketing; no uses datos reales; no copies nada de blinka.co.
- No pongas tablas como vista por defecto, ni más de una acción principal por pantalla, ni términos técnicos a la vista.
- No uses animación decorativa, parallax, autoplay ni efectos que dependan del cursor. Nada debe quedar invisible si una animación no corre.
- No rompas el tour, la barra lateral, el modo oscuro, el modo demostración ni la guarda de modo público de `/team`.
- No uses `git add -A`, `git push --force` ni commits con `.env`, `.claude/` o `node_modules`. Commits pequeños por componente o pantalla, en español, terminados en `Co-Authored-By: Codex <noreply@openai.com>`. Sin push ni merge.

## 9. Definición de hecho

Está hecho cuando todo esto es cierto y lo comprobaste tú:
1. **Prueba de los 5 segundos:** en cada pantalla, una persona como Carmen o Mateo que la ve por primera vez puede decir en 5 segundos qué pregunta responde y qué tiene que hacer. Documenta tu verificación pantalla por pantalla en `docs/diseno-v2/README.md`.
2. **Presupuesto cumplido:** ninguna pantalla supera 1 acción principal, 3 cifras grandes y 7 elementos visibles antes de "Ver más"; ningún término técnico fuera de la capa de evidencia (busca con `grep` "R1", "hash", "replay", "JSON" en el texto visible).
3. **Tres tareas sin ayuda**, que describes paso a paso con capturas: (a) "Encuentra por qué se frenó la factura F-006"; (b) "Aprueba una factura que te necesita, con una nota"; (c) "Sube tu límite por pago a USD 6.000 y mira qué cambia antes de guardar". Cada una en 3 clics o menos.
4. `npm run typecheck`, `npm test` y `npm run build` pasan; las pruebas existentes siguen en verde.
5. Las 6 rutas se ven coherentes en 390 px y 1280 px, en claro y oscuro, colapsada y ampliada la barra lateral (capturas en `docs/diseno-v2/`).
6. Accesibilidad: navegación completa con teclado y foco visible; contraste AAA en todo el texto, con los valores calculados en el README; `prefers-reduced-motion` sin animación y sin nada oculto.
6b. **Prueba Carmen:** con el navegador al 200 % y el control en "A++", las 6 pantallas se leen y se usan sin scroll horizontal y sin texto cortado; al 400 % todo se reacomoda a una columna. Capturas en `docs/diseno-v2/zoom/`.
6c. **Prueba Mateo:** los textos visibles de cada pantalla, pegados en un medidor de legibilidad, dan Fernández-Huerta ≥ 80 (deja la cifra por pantalla en el README); ningún concepto aparece sin su explicación cotidiana la primera vez.
7. El tour recorre todos sus pasos sobre los elementos nuevos sin quedarse colgado.
8. `git diff --stat main` muestra cambios solo en `app/**` y `docs/diseno-v2/`.
9. Entregas un resumen de 15 líneas: qué cambiaste, qué decisiones de diseño tomaste, qué datos faltaron y qué no pudiste verificar.

**Si el tiempo no alcanza, prioriza en este orden** y entrega lo terminado: tokens y componentes base → `/` → `/facturas/[id]` → `/cola` → `/reglas` → `/registro` → `/team` → animaciones. Una pantalla impecable vale más que seis a medias. Límite: entregar antes de las 9:00 p.m. hora de Caracas.
