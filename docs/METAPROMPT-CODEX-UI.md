# Metaprompt para Codex — UI y UX transversal del sitio

> **Reemplazado** el 17/10/2026 por `docs/METAPROMPT-DISENO-V2.md` (sistema de diseño "Veredicto").

**Emitido:** 17/10/2026 - 2:25 p.m. (Caracas, Venezuela). Lo corre Sebastián, rama `sebastian/ui`.
Antes de pegarlo: `node scripts/equipo.mjs tomar app --agente codex-sebastian` y avisar a Andrés en el grupo.

> Copia TODO lo que está debajo de la línea y pégalo como primer mensaje en Codex, abierto en la raíz del repo `404-Team---Blinka-30X`.

---

Actúa como diseñador de producto y desarrollador front-end senior. Vas a unificar la interfaz y la experiencia de uso de este sitio Next.js 15 (App Router, TypeScript, CSS propio) para un hackathon que cierra en menos de 24 horas. Lee primero `CLAUDE.md`, `docs/ZONAS.md` y `docs/extraccion.md`. Después lee `app/layout.tsx`, `app/globals.css`, `app/team/equipo.css` y cada `page.tsx` bajo `app/`. No leas `src/engine`, `src/ledger` ni `src/extraccion`: no los vas a tocar y no los necesitas.

## 1. Qué es el sitio y para quién

Es un agente que lee facturas con IA y decide, con reglas en código, si **PAGAR**, **FRENAR** o **ESCALAR** cada una a una persona. Nunca mueve dinero. Lo evalúa un jurado con tres criterios: autonomía, seguridad (un pago indebido descalifica) y **explicabilidad**: cualquier persona de finanzas debe entender por qué se tomó cada decisión leyendo la pantalla, sin abrir el código. La interfaz es, por tanto, el argumento central: la claridad vale más que la cantidad de información.

Dos superficies, un solo lenguaje visual:
- **Producto** (`/`, `/facturas/[id]`, `/reglas`, `/cola`, `/registro`): lo que ve el jurado y un CFO.
- **Centro de mando** (`/team` y su CSS `app/team/equipo.css`): lo que usa el equipo. Hoy tiene su propio set de tokens `--eq-*`; debe quedar sobre los mismos tokens que el producto.

## 2. Por qué hacerlo así

Hoy las pantallas funcionan pero se construyeron por partes: dos paletas, dos familias tipográficas, tablas densas que muestran todo de golpe. El jurado tiene minutos. Queremos que en la primera pantalla entienda el estado en 5 segundos, y que cada dato adicional aparezca solo cuando lo pida (clic, despliegue, scroll). Menos carga cognitiva es más explicabilidad, y la explicabilidad es un tercio de la nota.

## 3. Dirección visual (no negociable, con margen de interpretación)

> **Corregido el 17/10/2026:** la primera versión pedía heredar la marca de Blinka y Codex copió su paleta exacta. El brief deja fuera "el diseño de la app de Blinka": no debemos parecer su producto. La identidad es propia del Equipo 404.

**Identidad propia, monocromo grafito.** Neutros cálidos (claro: fondo `#F5F5F2`, tinta `#18181B`; oscuro: fondo `#0E0E10`, tinta `#F2F2EF`) y acento grafito. **El único color de la interfaz es la semántica de decisión**: PAGAR verde, FRENAR rojo, ESCALAR ámbar, siempre con texto y forma (pastilla con etiqueta), nunca solo color. Prohibido usar colores, logo, textos o layout de blinka.co.

**Estética tipo iOS 26 / Liquid Glass, minimalista**: capas translúcidas con desenfoque (`backdrop-filter`) en cabecera, barra lateral y paneles flotantes, bordes de 1 px casi invisibles, sombras suaves y amplias, esquinas continuas, jerarquía por tamaño y peso más que por color. Úsalo con disciplina: el cristal en dos o tres elementos clave; el resto, plano y limpio.

Tokens en `app/globals.css` (`--bg`, `--superficie`, `--tinta`, `--tenue`, `--linea`, `--acento`, `--pagar`, `--frenar`, `--escalar` y sus `-suave`), compartidos con `/team`. Modo claro y oscuro completos, definidos solo en `:root`, `@media (prefers-color-scheme: dark)` y `[data-theme]`; ningún color literal dentro de componentes.

Tipografía: una sola familia sans (Inter desde Google Fonts, con `system-ui` de respaldo) y JetBrains Mono solo para números, códigos de factura y hashes, con `font-variant-numeric: tabular-nums`. Escala tipográfica fija de 6 tamaños. Títulos con `text-wrap: balance`.

## 4. Principios de experiencia

- **Revelado progresivo**: la primera pantalla de cada ruta muestra lo mínimo para decidir o entender (resumen, estado, siguiente acción). Todo detalle (reglas activadas, hechos, hash, lecturas de los modelos) vive en secciones plegables, paneles laterales o pasos que se abren a petición. Una sola sección abierta a la vez cuando sean excluyentes.
- **Cero cabina de avión**: máximo 3 números grandes por pantalla; nada de tablas de 8 columnas en móvil; filtros ocultos tras un botón.
- **Explicabilidad primero**: en `/facturas/[id]` la explicación en lenguaje humano va arriba, en una frase; las reglas aparecen como una lista de comprobaciones con ✓ / ✗ / "no evaluada" y una línea de detalle cada una; el JSON técnico al final, plegado.
- **Animación reactiva al scroll** (vertical, en ambos sentidos): las secciones entran con un desplazamiento y desvanecido suaves al cruzar el viewport y vuelven a su estado al salir; la cabecera de cristal se compacta al bajar y se expande al subir; los números grandes cuentan hacia su valor al aparecer. Implementa con `IntersectionObserver` + clases CSS y `scroll-timeline`/`animation-timeline: scroll()` donde el navegador lo soporte, con fallback. Duraciones 200–400 ms, curvas suaves, sin rebotes. **Todo se desactiva con `prefers-reduced-motion`.** Nada debe quedar invisible si el observer no dispara: el estado en reposo es visible.
- **Accesible**: contraste AA, foco visible, navegación por teclado en pestañas y plegables, `aria-expanded` en lo que se abre, etiquetas en formularios, tamaño táctil ≥ 44 px, idioma `es`.
- **Móvil real**: todo usable a 390 px sin scroll horizontal; las tablas pasan a tarjetas apiladas.
- **Estados**: cada lista tiene estado vacío con una frase útil; cada acción (aprobar, rechazar, guardar reglas) muestra confirmación inline y resultado; los errores dicen qué pasó y qué hacer.
- **Textos**: en español neutro, voz activa, sin jerga técnica a la vista. Los textos actuales son correctos en fondo; mejora la forma, no cambies el significado.

## 5. Qué hacer, en orden

1. **Sistema**: tokens, tipografía, espaciado (escala de 4 px), radios, sombras, capa de cristal, utilidades de animación. Un solo archivo `app/globals.css` (puedes dividir en `app/estilos/*.css` importados desde `layout.tsx`).
2. **Layout común**: cabecera de cristal con marca "Agente pagador · Equipo 404", navegación de 5 entradas y enlace discreto a `/team`; aviso "modo replay" compacto y descartable; pie mínimo.
3. **`/` (Decisiones)**: resumen en tres tarjetas (pagadas, frenadas, escaladas) más la tasa de autonomía como el único número grande; lista de facturas como tarjetas o filas compactas con pastilla de decisión y una línea de motivo; detalle al clic.
4. **`/facturas/[id]`**: explicación humana arriba; comprobaciones plegables; datos leídos de la factura; lecturas de los dos modelos y JSON al final, plegados.
5. **`/cola`**: solo lo que espera a una persona; aprobar/rechazar con confirmación inline y nota obligatoria; nunca mostrar botón de aprobar en una factura FRENADA.
6. **`/reglas`**: formulario agrupado por tema con explicación de una línea por regla y vista previa del efecto; guardar con versión visible.
7. **`/registro`**: línea de tiempo vertical con animación al scroll; cada entrada con decisión, hash corto y botón "verificar cadena"; detalle plegado.
8. **`/team`**: misma cabecera y tokens; conserva su estructura (tres hechos, puertas, tareas, zonas, bitácora) y su lógica; solo rediseña la piel y el plegado.
9. Pasada final de consistencia: mismos márgenes, mismas pastillas, mismos plegables en todas las rutas.

Haz commits pequeños por pantalla, en español, terminados en `Co-Authored-By: Codex <noreply@openai.com>`. No hagas push ni merges.

## 6. Qué NO hacer

- No toques `src/engine`, `src/ledger`, `src/extraccion`, `src/demo/estado.ts`, `supabase/`, `data/`, `tests/` (salvo añadir pruebas nuevas), `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.mjs`. Si crees que necesitas cambiar uno, detente y explica por qué.
- No instales dependencias: ni Tailwind, ni shadcn, ni librerías de animación o iconos. CSS propio, SVG inline y las APIs del navegador bastan.
- No cambies rutas, nombres de rutas de API, nombres de campos, ni el comportamiento de ninguna acción (aprobar, rechazar, guardar reglas, tomar zona). Cambias la piel y la disposición, no la lógica.
- No inventes datos ni textos de marketing; no uses nombres de clientes reales; no copies colores, logo, textos ni layout de blinka.co.
- No metas animaciones que bloqueen la lectura, autoplay, parallax agresivo ni efectos que dependan del cursor. Nada de `100vh` en portadas.
- No dejes colores literales en componentes, ni estilos inline salvo valores calculados.
- No borres la funcionalidad de modo oscuro ni el modo semilla de `/team`.
- No uses `git push --force`, `git add -A` en la raíz ni commits que incluyan `.env`, `.claude/` o `node_modules`.

## 7. Definición de hecho (pragmática)

Está hecho cuando todo esto es cierto y lo has comprobado tú:
1. `npm run typecheck`, `npm test` y `npm run build` pasan sin errores ni advertencias nuevas.
2. Las 6 rutas (`/`, `/facturas/F-005`, `/cola`, `/reglas`, `/registro`, `/team`) cargan en `npm run dev` y se ven coherentes en 390 px y en 1280 px, en claro y en oscuro (adjunta capturas de las 6 rutas × 2 anchos en `docs/capturas-ui/`).
3. En `/cola` se puede aprobar y rechazar una factura escalada, y una FRENADA no muestra botón de aprobar.
4. En `/reglas` se guarda un cambio y la nueva versión aparece en la siguiente decisión.
5. Con `prefers-reduced-motion: reduce` no hay animación y nada queda oculto.
6. Navegando solo con teclado se llega a todo plegable y botón, con foco visible.
7. Un `git diff --stat main` muestra cambios solo en `app/**` (más `docs/capturas-ui/` y pruebas nuevas).
8. Entregas un resumen de 15 líneas: qué cambiaste por ruta, qué decisiones de diseño tomaste, qué no pudiste verificar y qué recomendarías para después del hackathon.

Si en algún punto el tiempo no alcanza, prioriza en este orden: sistema de tokens → `/` → `/facturas/[id]` → `/cola` → `/registro` → `/reglas` → `/team` → animaciones de scroll. Una pantalla terminada vale más que seis a medias.
