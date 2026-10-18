<!-- Emitido: 18/10/2026 - 11:35 a.m. (Caracas, Venezuela). Investigación con agentes: 6 hallazgos verificados de 32. -->

# Especificación de movimiento de la landing /conoce

**Versión:** 18/10/2026 · **Alcance:** solo `/conoce`, sin librerías · **Destinatario:** desarrollador, 30 minutos.

**Cómo leer las fuentes.** `[F]` es un hallazgo verificado (lista en la sección 6). `[C]` es criterio del director de motion: no está en los hallazgos, así que hay que medirlo antes de darlo por bueno.

---

## 1. Principios

1. **El scroll es el reloj.** Cada efecto usa `animation-timeline: view()` o `scroll()`. El progreso de la animación es la posición del scroll, así que al subir se reproduce en reversa sin una línea de JS. [F: Chrome for Developers]
2. **El héroe nunca nace oculto.** Titular, subtítulo y primer botón van con `opacity:1` en el HTML. El héroe solo tiene efecto de salida (al bajar), no de entrada, para no retrasar el LCP. [F: web.dev Optimize LCP]
3. **Solo se animan `transform` y `opacity`.** Esas propiedades pueden correr fuera del hilo principal. Nada de `width`, `height`, `top` ni `margin`. [F: Chrome, con la corrección de la nota de verificación]
4. **Nada se mueve solo más de 5 s.** Lo ligado al scroll se detiene cuando el usuario se detiene. Cualquier bucle decorativo debe durar menos de 5 s o tener botón de pausa. [F: W3C 2.2.2, con la salvedad de que la mención a degradados y bucles es inferencia]
5. **Accesible primero.** El estado base del CSS es el final y legible. Las animaciones solo se añaden dentro de `prefers-reduced-motion: no-preference`. Sin parallax, sin autoplay, sin carruseles. [F: Universidad de Oregón vía W3C; las animaciones cortas de revelado pueden tocar WCAG 2.3.3 (AAA)]

---

## 2. Catálogo de efectos (de mayor a menor impacto visual por minuto)

### 0. Base común (3 min, va antes de todo)

**Reglas de oro**
- Todo el CSS de movimiento vive en un bloque `@media (prefers-reduced-motion: no-preference)`. Fuera de él, la página es estática y completa.
- `animation-timeline` se escribe **después** del shorthand `animation`, porque el shorthand lo resetea. La duración es `auto`. [F: Chrome]
- La curva dentro de una animación ligada al scroll es `linear`. La suavidad viene de usar un rango corto (por ejemplo `entry 0% entry 70%`). Las curvas con easing solo se usan en el fallback, que sí tiene tiempo.
- Soporte citado en el artículo de Chrome: Chrome/Edge 115, Firefox en Technology Preview a la fecha del artículo, Safari 26. Hay que confirmar el estado actual en caniuse el día de implementar. Por eso el fallback es obligatorio. [F]

**Inicializador `motion.ts`** (componente cliente de `/conoce`, llamado en un `useEffect`)

```ts
export function initMotion() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; // todo queda estático y final
  const root = document.documentElement;
  const vista = CSS.supports('animation-timeline: view()');
  const scroll = CSS.supports('animation-timeline: scroll()');
  if (!vista) root.classList.add('io');            // activa estilos de fallback

  if (!vista) {                                    // reveal y pasos reversibles
    const io = new IntersectionObserver(
      es => es.forEach(e => e.target.classList.toggle('is-in', e.isIntersecting)),
      { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el));

    const ip = new IntersectionObserver(
      es => es.forEach(e => e.target.classList.toggle('is-on',
        e.isIntersecting || e.boundingClientRect.top < 0)),
      { rootMargin: '0px 0px -40% 0px' });
    document.querySelectorAll('.paso').forEach(el => ip.observe(el));

    const tope = document.getElementById('tope');  // centinela del encabezado
    if (tope) new IntersectionObserver(([e]) =>
      root.classList.toggle('is-scrolled', !e.isIntersecting)).observe(tope);
  }
  if (!scroll) {                                   // barra de progreso
    let t = 0;
    addEventListener('scroll', () => { cancelAnimationFrame(t); t = requestAnimationFrame(() =>
      root.style.setProperty('--p', String(scrollY / Math.max(1, root.scrollHeight - innerHeight))));
    }, { passive: true });
  }
  initNumeros();                                   // ver efecto 7
}
```

Todo el JS suma menos de 3 KB gzip [C].

**Mapa rápido por sección** (los números de la prueba se suponen en "prueba"; si están en otra, mueve el atributo)

| Sección | Efectos |
|---|---|
| Hero | Palabras (salida), aurora de fondo, ECG al pie. Sin reveal de entrada. |
| Problema | Reveal con stagger |
| Cuatro pasos | Escena sticky, ECG en el encabezado, reveal del título |
| Decisiones ("Actúa cuando es seguro") | Reveal con stagger y marcadores que se encienden con `view()` |
| Prueba | Números que cuentan, reveal |
| Seguridad | Reveal con stagger |
| Canales | Reveal con stagger, halo del cursor y tilt opcional en tarjetas |
| Oferta | Reveal (escala suave), ECG de cierre |
| FAQ | Reveal con stagger corto |
| Pie | Reveal simple |
| Global | Barra de progreso, encabezado compacto |

---

### 1. Reveal reversible por sección con stagger
- **Dónde:** todas las secciones y sus tarjetas, excepto el héroe.
- **Al bajar:** el elemento sube 32 px y aparece mientras entra en pantalla. Los hijos con índice mayor empiezan un poco después.
- **Al subir:** se deshace solo, en reversa, porque el progreso es la posición del scroll.
- **Técnica:** CSS con `animation-timeline: view()` y `animation-range: entry`. El stagger se logra desplazando el rango con una variable `--i`: los hermanos entran en la misma posición de scroll, pero su rango empieza más tarde. [F: Chrome] El stagger por `--i` es adaptación [C].
- **Snippet:**

```html
<section data-reveal>
  <h2 data-reveal style="--i:0">…</h2>
  <article data-reveal style="--i:1">…</article>
  <article data-reveal style="--i:2">…</article>
</section>
```
```css
@keyframes rev { from { opacity:0; transform:translateY(32px);} to { opacity:1; transform:none;} }

@media (prefers-reduced-motion: no-preference) {
  @supports (animation-timeline: view()) {
    [data-reveal] {
      animation: rev linear both;
      animation-timeline: view();                       /* siempre después del shorthand */
      animation-range: entry calc(var(--i,0)*8%) entry calc(70% + var(--i,0)*4%);
    }
  }
  @supports not (animation-timeline: view()) {
    .io [data-reveal] { opacity:0; transform:translateY(32px);
      transition: opacity .6s cubic-bezier(.22,1,.36,1) calc(var(--i,0)*80ms),
                  transform .6s cubic-bezier(.22,1,.36,1) calc(var(--i,0)*80ms); }
    .io [data-reveal].is-in { opacity:1; transform:none; }
  }
}
```
- **Duración y curva:** nativo, `auto` y `linear` con rango corto. Fallback, 600 ms con `cubic-bezier(.22,1,.36,1)` y 80 ms de stagger.
- **Reduced motion:** el bloque no existe, así que todo se ve completo y estático. Sin soporte nativo, el fallback con IO hace toggle de `.is-in` en ambos sentidos, por eso también es reversible. Sin JS, nada queda oculto, porque `.io` solo lo añade el script.
- **Riesgo:** bajo. Solo `transform` y `opacity`. Un rango con `calc` y `var()` debe verificarse a ojo: si no se aplica, usar rangos fijos por clase `.d1`, `.d2`, `.d3`.
- **Regla de LCP:** nunca poner `data-reveal` sobre el héroe ni sobre lo que cae en el primer pantallazo. [F: web.dev LCP]
- **Fuente:** [F] Chrome for Developers.

### 2. Barra de progreso de lectura
- **Dónde:** global, fija arriba.
- **Al bajar y al subir:** crece y decrece 1:1 con el scroll.
- **Técnica:** `animation-timeline: scroll(root block)` con `scaleX`. [F: Chrome] Fallback con un listener pasivo en `rAF` que escribe `--p`.
- **Snippet:**

```html
<div class="lectura" aria-hidden="true"></div>
```
```css
.lectura { position:fixed; inset:0 0 auto 0; block-size:3px; z-index:60; pointer-events:none;
  background:linear-gradient(90deg,var(--violeta),var(--marino));
  transform-origin:0 50%; transform:scaleX(0); }
@keyframes grow { from{transform:scaleX(0)} to{transform:scaleX(1)} }
@supports (animation-timeline: scroll()) {
  .lectura { animation: grow linear both; animation-timeline: scroll(root block); }
}
@supports not (animation-timeline: scroll()) {
  .lectura { transform: scaleX(var(--p,0)); }
}
```
- **Duración y curva:** ligada al scroll, `linear`.
- **Reduced motion:** se mantiene porque es un indicador funcional 1:1 con el gesto del usuario, no un adorno [C]. Si el equipo prefiere ser estricto, envolverla en `no-preference`. Hay que decidirlo explícitamente.
- **Riesgo:** casi nulo. Una sola capa compuesta.
- **Fuente:** [F] Chrome.

### 3. Fondo aurora con desplazamiento ligado al scroll
- **Dónde:** detrás de toda la página (capa fija).
- **Al bajar y al subir:** los resplandores violeta, marino y gris azulado se desplazan unos 6 % y crecen un 8 %. Al subir regresan.
- **Técnica:** un `div` fijo y sobredimensionado con tres `radial-gradient`. Se anima solo `transform` con `scroll(root)`. No se anima `background-position` ni se usa `filter: blur`. No hay animación basada en tiempo, así que se detiene con el usuario y queda fuera del criterio 2.2.2. [F: W3C, con la salvedad de la nota]
- **Snippet:**

```css
.aurora { position:fixed; inset:-20% -10%; z-index:-1; pointer-events:none;
  background:
    radial-gradient(40% 35% at 20% 25%, var(--aur-violeta), transparent 70%),
    radial-gradient(35% 40% at 80% 20%, var(--aur-marino),  transparent 70%),
    radial-gradient(45% 40% at 55% 85%, var(--aur-gris),    transparent 70%); }
:root { --aur-violeta:rgb(124 92 255 / .14); --aur-marino:rgb(30 58 138 / .10); --aur-gris:rgb(100 116 139 / .12); }
@media (prefers-color-scheme:dark) { :root:not([data-theme="light"]) {
  --aur-violeta:rgb(124 92 255 / .28); --aur-marino:rgb(59 91 200 / .30); --aur-gris:rgb(100 116 139 / .18); } }
:root[data-theme="dark"] { --aur-violeta:rgb(124 92 255 / .28); --aur-marino:rgb(59 91 200 / .30); --aur-gris:rgb(100 116 139 / .18); }

@keyframes aur { from{transform:translate3d(0,-6%,0) scale(1)} to{transform:translate3d(0,6%,0) scale(1.08)} }
@media (prefers-reduced-motion:no-preference) {
  @supports (animation-timeline: scroll()) {
    .aurora { animation: aur linear both; animation-timeline: scroll(root block); }
  }
}
```
Los valores de color son orientativos: usar los tokens reales de la paleta.
- **Duración y curva:** ligada al scroll, `linear`.
- **Reduced motion y sin soporte:** queda el degradado estático.
- **Riesgo:** medio-bajo. Es una capa grande. Pasar axe o Lighthouse con el texto sobre el punto más claro de la aurora, porque Carmen necesita contraste AA. Si el contraste falla, bajar la opacidad.
- **Fuente:** [F] Chrome; W3C 2.2.2.

### 4. Línea de pulso (electrocardiograma) que se dibuja con el scroll
- **Dónde:** al pie del héroe, en el encabezado de "Cuatro pasos" y antes de la oferta.
- **Al bajar:** el trazo se dibuja de izquierda a derecha. **Al subir:** se "borra".
- **Técnica:** SVG con `pathLength="1"`, `stroke-dasharray:1` y `stroke-dashoffset` de 1 a 0 con `view()`. Fallback con IO que añade `.is-in` y una transición.
- **Snippet:**

```html
<svg class="ecg" viewBox="0 0 600 60" preserveAspectRatio="none" aria-hidden="true">
  <path pathLength="1" vector-effect="non-scaling-stroke"
        d="M0 30 H180 l12-24 l16 48 l14-40 l10 16 H600"/>
</svg>
```
```css
.ecg { inline-size:100%; block-size:48px; }
.ecg path { fill:none; stroke:var(--violeta); stroke-width:2; stroke-linecap:round;
  stroke-dasharray:1; stroke-dashoffset:0; }
@keyframes trazo { from{stroke-dashoffset:1} to{stroke-dashoffset:0} }
@media (prefers-reduced-motion:no-preference) {
  @supports (animation-timeline: view()) {
    .ecg path { animation: trazo linear both; animation-timeline: view(); animation-range: entry 10% cover 55%; }
  }
  @supports not (animation-timeline: view()) {
    .io .ecg path { stroke-dashoffset:1; transition: stroke-dashoffset 1.2s ease-out; }
    .io .ecg.is-in path { stroke-dashoffset:0; }
  }
}
```
Añadir `class="ecg" data-reveal` es opcional. Para el fallback, hacer `observe` también de `.ecg` en `initMotion` o ponerle `data-reveal`.
- **Duración y curva:** ligada al scroll. Fallback, 1,2 s (menos de 5 s).
- **Reduced motion:** la línea queda dibujada y completa.
- **Riesgo:** bajo-medio. `stroke-dashoffset` no es una propiedad de compositor [C]. Con un SVG diminuto es aceptable, pero limitar a 3 instancias y comprobar en Performance que no genere cuadros largos.
- **Fuente:** técnica de `view()` [F: Chrome]. El uso de `stroke-dashoffset` es [C].

### 5. Texto del héroe por palabras (salida ligada al scroll)
- **Dónde:** titular del héroe.
- **Al bajar:** las palabras se desvanecen y suben una tras otra a medida que el titular sale por arriba. **Al subir:** regresan en reversa.
- **Entrada al cargar:** el titular se pinta completo, visible y con `opacity:1` desde el primer cuadro. Como mucho, un deslizamiento de 8 px solo con `transform`, nunca con opacidad. Si el LCP empeora al medir, quitar la entrada y dejar solo la salida. [F: web.dev LCP, aplicado como regla; la guía no habla de opacity, es inferencia]
- **Técnica:** cada palabra es un `span` real (no se parte por letras, para no romper lectura ni lectores de pantalla). La salida usa `view()` con `animation-range: exit`.
- **Snippet:**

```tsx
<h1 className="hero__titulo">
  {palabras.map((p, i) => (
    <Fragment key={i}><span className="w" style={{'--i': i} as CSSProperties}><span className="wi">{p}</span></span>{' '}</Fragment>
  ))}
</h1>
```
```css
.w, .wi { display:inline-block; }
@keyframes w-sale { to { opacity:.15; transform:translateY(-18px); } }
@keyframes w-entra { from { transform:translateY(.3em); } }   /* sin opacidad */
@media (prefers-reduced-motion:no-preference) {
  .wi { animation: w-entra .5s cubic-bezier(.22,1,.36,1) backwards; animation-delay: calc(var(--i)*40ms); }
  @supports (animation-timeline: view()) {
    .w { animation: w-sale linear both; animation-timeline: view();
         animation-range: exit calc(var(--i)*3%) exit calc(55% + var(--i)*3%); }
  }
}
```
- **Duración y curva:** entrada 500 ms con `cubic-bezier(.22,1,.36,1)` y 40 ms entre palabras. Salida ligada al scroll.
- **Sin soporte nativo:** se omite la salida y queda solo la entrada. No se necesita IO.
- **Reduced motion:** titular estático.
- **Riesgo:** bajo si se mide el LCP. Nunca ocultar el titular con una clase `js-hidden`. [F: web.dev]
- **Fuente:** [F] web.dev LCP; Chrome (`exit`).

### 6. Encabezado que se compacta al bajar
- **Dónde:** barra superior global.
- **Al bajar:** aparece un fondo sólido con borde y el logo se reduce un 12 %. **Al subir:** vuelve al estado transparente y grande.
- **Técnica:** el alto del encabezado es **fijo** (64 px). Solo se anima la opacidad de un `::before` y el `transform` del logo, para no mover el layout (CLS = 0). Los botones **no** se escalan: el tamaño táctil se mantiene.
- **Snippet:**

```css
.cabecera { position:sticky; top:0; block-size:64px; z-index:50; }
.cabecera::before { content:""; position:absolute; inset:0; opacity:0; z-index:-1;
  background:var(--superficie); border-block-end:1px solid var(--borde); }
.cabecera .logo { transform-origin:left center; }
@keyframes cab-fondo { to { opacity:.94; } }
@keyframes cab-logo  { to { transform:scale(.88); } }
@media (prefers-reduced-motion:no-preference) {
  @supports (animation-timeline: scroll()) {
    .cabecera::before { animation:cab-fondo linear both; animation-timeline:scroll(root block); animation-range:0px 160px; }
    .cabecera .logo   { animation:cab-logo  linear both; animation-timeline:scroll(root block); animation-range:0px 160px; }
  }
  @supports not (animation-timeline: scroll()) {
    .cabecera::before, .cabecera .logo { transition: opacity .25s, transform .25s; }
    .is-scrolled .cabecera::before { opacity:.94; }
    .is-scrolled .cabecera .logo { transform:scale(.88); }
  }
}
```
Añadir `<div id="tope" style="position:absolute;top:0;height:1px;width:1px"></div>` al inicio del `<body>` para el fallback.
- **Duración y curva:** ligada a los primeros 160 px de scroll, `linear`. Fallback, 250 ms.
- **Reduced motion:** encabezado en su estado base. El fondo sólido puede quedar siempre visible para garantizar contraste.
- **Riesgo:** bajo. Evitar `backdrop-filter` por costo en móvil [C].
- **Fuente:** [F] Chrome (`scroll()`, rango en píxeles). Los valores son [C].

### 7. Números que cuentan (25 de 30, 0, 8 de 18, 728)
- **Dónde:** sección de prueba.
- **Al bajar:** al entrar en pantalla, el número sube de 0 al valor en 900 ms y **se queda** (no se reinicia al subir, como pidió el producto).
- **Técnica:** JS mínimo con IO y `requestAnimationFrame`. El valor final está **siempre** en el HTML, y una copia accesible lo lee entero. Solo se anima el primer número de "25 de 30" y de "8 de 18". El "0" no se anima: se muestra fijo y puede llevar un pequeño énfasis estático.
- **Snippet:**

```html
<span class="num">
  <span class="sr-only">25</span>
  <span aria-hidden="true" data-count data-fin="25">25</span>
</span> de 30
```
```css
.num [data-count] { font-variant-numeric: tabular-nums; display:inline-block; min-inline-size:2ch; }
.sr-only { position:absolute; inline-size:1px; block-size:1px; overflow:hidden; clip-path:inset(50%); white-space:nowrap; }
```
```ts
function initNumeros() {
  const els = document.querySelectorAll<HTMLElement>('[data-count]');
  const io = new IntersectionObserver((es, o) => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target as HTMLElement, fin = Number(el.dataset.fin), t0 = performance.now(), dur = 900;
    const paso = (t: number) => { const p = Math.min((t - t0) / dur, 1);
      el.textContent = String(Math.round(fin * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(paso); };
    requestAnimationFrame(paso); o.unobserve(el);
  }), { threshold: 0.6 });
  els.forEach(el => { if (Number(el.dataset.fin) > 0) { el.textContent = '0'; io.observe(el); } });
}
```
- **Duración y curva:** 900 ms, ease-out cúbico (menos de 5 s, no activa 2.2.2).
- **Reduced motion y sin JS:** el número final se ve de entrada (`initMotion` sale antes).
- **Riesgo:** bajo. `tabular-nums` y `min-inline-size` evitan saltos de layout (CLS). Los números están bajo el pliegue, así que no afectan el LCP.
- **Fuente:** técnica [C]. Duración respaldada por el límite de 5 s [F: W3C].

### 8. Escena sticky "Cuatro pasos" (el scroll ilumina paso a paso)
- **Dónde:** sección "Cuatro pasos" en escritorio. El mismo patrón sin sticky en "Actúa cuando es seguro".
- **Al bajar:** la sección queda anclada mientras se desplaza 320vh. Cada marcador de paso se enciende y una línea vertical crece. **Al subir:** se apagan en reversa.
- **No es secuestro del scroll:** el scroll sigue siendo nativo, a la misma velocidad. Solo se usa `position:sticky`. [C]
- **Técnica:** `view-timeline` con nombre en la sección, y cada marcador referencia ese timeline con rangos `contain`. El texto del paso **nunca** baja de contraste AA: lo que se enciende es el marcador, la barra y el número. En móvil, pantallas bajas o con zoom alto no hay sticky: la lista es normal y cada marcador se enciende con su propio `view()`.
- **Snippet:**

```html
<section class="pasos" id="pasos">
  <div class="pasos__escena">
    <h2 data-reveal>Cuatro pasos</h2>
    <ol class="pasos__lista">
      <li class="paso" style="--k:0"><span class="paso__marca">1</span><div>…</div></li>
      <li class="paso" style="--k:1"><span class="paso__marca">2</span><div>…</div></li>
      <li class="paso" style="--k:2"><span class="paso__marca">3</span><div>…</div></li>
      <li class="paso" style="--k:3"><span class="paso__marca">4</span><div>…</div></li>
    </ol>
    <div class="pasos__riel" aria-hidden="true"><i></i></div>
  </div>
</section>
```
```css
/* base: todo encendido y legible */
.paso__marca { opacity:1; transform:none; }
.pasos__riel i { display:block; block-size:100%; transform-origin:top; background:var(--violeta); }
@keyframes enciende { from { opacity:.25; transform:scale(.8); } to { opacity:1; transform:none; } }
@keyframes riel { from { transform:scaleY(0); } to { transform:scaleY(1); } }

@media (prefers-reduced-motion:no-preference) {
  @supports (animation-timeline: view()) {
    /* móvil, pantalla baja o zoom alto: sin sticky, cada paso se enciende al entrar */
    .paso__marca { animation: enciende linear both; animation-timeline: view(); animation-range: entry 20% cover 40%; }
  }
  @media (min-width:900px) and (min-height:620px) {
    @supports (animation-timeline: view()) {
      .pasos { view-timeline: --pasos block; block-size:320vh; }
      .pasos__escena { position:sticky; top:0; min-block-size:100svh; display:grid; align-content:center; }
      .paso__marca { animation: enciende linear both; animation-timeline: --pasos;
        animation-range: contain calc(var(--k)*22%) contain calc(var(--k)*22% + 18%); }
      .pasos__riel i { animation: riel linear both; animation-timeline: --pasos; animation-range: contain 0% contain 84%; }
    }
  }
  @supports not (animation-timeline: view()) {
    .io .paso__marca { opacity:.25; transform:scale(.8); transition: opacity .4s, transform .4s; }
    .io .paso.is-on .paso__marca { opacity:1; transform:none; }
  }
}
```
Importante: `contain` equivale al tramo en que la sección cubre el viewport, es decir, mientras está anclada. Validar esto en el navegador al implementar [C].
- **Duración y curva:** ligada al scroll, `linear`. Fallback, 400 ms.
- **Reduced motion:** todos los pasos encendidos y la sección en altura normal.
- **Riesgo:** medio. Es el efecto más complejo. No aplicar `content-visibility` a esta sección. El umbral `min-height:620px` y `min-width:900px` desactiva el sticky con zoom alto (Carmen): al ampliar al 200 % o 400 %, el viewport en píxeles CSS se encoge y la media query lo apaga [C].
- **Fuente:** `view-timeline` y rangos [F: Chrome, solo `view()` y `animation-range`]. El uso de `view-timeline` con nombre y de `contain` es extrapolación [C].

### 9. Tarjetas con halo que sigue al cursor, y tilt sutil (opcional)
- **Dónde:** tarjetas de canales, decisiones y seguridad. El halo **ya existe**: no se toca.
- **Tilt:** se extiende con una inclinación máxima de 3° en cada eje, solo con `(hover:hover) and (pointer:fine)`. No aplicar a tarjetas con texto largo ni en móvil. Es lo primero que se recorta si falta tiempo.
- **Regla clave:** el reveal va en el contenedor (`li`) y el tilt en la tarjeta interna `.card`, porque una animación sobre `transform` anula cualquier otro `transform` del mismo elemento.
- **Snippet:** (se suma al manejador del halo existente)

```ts
card.addEventListener('pointermove', e => {
  const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
  card.style.setProperty('--rx', (-y * 6).toFixed(2) + 'deg');
  card.style.setProperty('--ry', ( x * 6).toFixed(2) + 'deg');
});
card.addEventListener('pointerleave', () => { card.style.removeProperty('--rx'); card.style.removeProperty('--ry'); });
```
```css
@media (prefers-reduced-motion:no-preference) and (hover:hover) and (pointer:fine) {
  .card { transform: perspective(900px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg)); transition: transform .2s ease-out; }
}
```
- **Reduced motion:** sin tilt. El halo se mantiene porque lo mueve el propio usuario.
- **Riesgo:** bajo. Es solo `transform`.
- **Fuente:** [C].

---

## 3. Lo que NO se hace

| Qué | Por qué | Fuente |
|---|---|---|
| Secuestrar el scroll (cambiar su velocidad, forzar snap o bloquear la rueda) | Límite no negociable del encargo. El sticky de "Cuatro pasos" no lo viola porque el scroll sigue nativo. | [C] criterio del encargo |
| Parallax pesado (capas a distinta velocidad) | Se recomienda evitar el paralaje. La aurora se desplaza apenas un 6 % y no tiene capas independientes. | [F] Universidad de Oregón |
| Autoplay, carruseles automáticos, videos con autoplay | Sin control del usuario. | [F] Oregón; W3C 2.2.2 |
| Bucles decorativos de más de 5 s sin pausa (aurora "respirando" por tiempo) | Se exige pausa o menos de 5 s. Por eso la aurora va ligada al scroll y no a un reloj. | [F] W3C 2.2.2 (inferencia sobre degradados) |
| Parpadeos de más de 3 por segundo | Riesgo para usuarios sensibles. | [F] Oregón |
| Héroe con `opacity:0` esperando JS o animación; clase `js-hidden` en lo del primer pantallazo | Retrasa el LCP (element render delay). | [F] web.dev LCP (inferencia sobre opacity) |
| `content-visibility:auto` en el héroe | Afectaría al LCP. | [F] web.dev content-visibility |
| Animar `width`, `height`, `top`, `left`, `margin`, `box-shadow` o `filter` | Solo `transform` y `opacity` pueden ir fuera del hilo principal. | [F] Chrome (nota) |
| Escribir `animation-timeline` antes del shorthand `animation`, o fijar una duración con `view()` | El shorthand lo resetea. | [F] Chrome |
| Partir párrafos largos letra a letra | Daña la lectura y los lectores de pantalla. | [C] |
| Bajar el contraste del texto como parte de un efecto | Carmen (miopía severa). Se iluminan marcadores, no texto. | [C] |
| `will-change` global o más de una capa fija grande | Consume memoria en móvil. | [C] |
| Librerías de animación (GSAP, Framer Motion, etc.) | Límite del encargo. | [C] |

---

## 4. Presupuesto de rendimiento

**Límites** (los números son propuesta [C], salvo donde se indica)

| Concepto | Límite |
|---|---|
| JS añadido | Máximo 3 KB gzip, 0 dependencias |
| CSS añadido | Máximo 4 KB gzip |
| Propiedades animadas | `transform` y `opacity`. Única excepción: `stroke-dashoffset` en un máximo de 3 SVG pequeños |
| Capas fijas | Máximo 3: aurora, barra de progreso y encabezado |
| LCP | No empeorar frente a la línea base. El `element render delay` debe quedar cerca de cero, menos del 10 % del LCP (guía orientativa). [F: web.dev] Umbral general "bueno" de Core Web Vitals: 2,5 s (dato público, no está en los hallazgos de esta tanda) |
| CLS | 0 atribuible al motion. Alto del encabezado fijo, `tabular-nums` en números, `contain-intrinsic-size` en secciones. Umbral "bueno" general: 0,1 |
| INP | Menos de 200 ms (umbral general). Listeners `passive`, trabajo en `rAF` |

**Content-visibility:** aplicar a las secciones bajo el pliegue (problema, decisiones, prueba, seguridad, canales, oferta, FAQ, pie), con `contain-intrinsic-size` para evitar saltos del scrollbar. En el ejemplo de la guía, el render inicial pasó de 232 ms a 30 ms. Soporte: Chrome 85, Firefox 125, Safari 18. [F: web.dev]

```css
.seccion-baja { content-visibility:auto; contain-intrinsic-size:auto 800px; }
```
No aplicar al héroe ni a "Cuatro pasos" (sticky y rangos `contain`). Con animaciones `view()` dentro de secciones omitidas, comprobar que el rango siga correcto y probar en móvil real. [F: web.dev, con la cautela de la nota]

**Cómo medir**
1. **Línea base:** Lighthouse móvil, 3 corridas, mediana, antes del cambio. Repetir después.
2. **Performance en Chrome DevTools:** grabar un scroll completo de abajo arriba y comprobar que no hay "Layout" ni "Recalculate Style" repetidos en cada cuadro.
3. **Rendering:** activar "Layout Shift Regions" y "Paint flashing". No debe parpadear nada fuera de las zonas animadas.
4. **Consola, LCP y CLS en vivo:**

```js
new PerformanceObserver(l => l.getEntries().forEach(e => console.log('LCP', e.startTime|0, e.element)))
  .observe({type:'largest-contentful-paint', buffered:true});
new PerformanceObserver(l => l.getEntries().forEach(e => !e.hadRecentInput && console.log('CLS +', e.value)))
  .observe({type:'layout-shift', buffered:true});
```
5. **Dispositivo real:** un Android de gama media. Con tema claro y oscuro.
6. **Accesibilidad:** emular `prefers-reduced-motion: reduce` (todo estático y completo), zoom al 200 % y 400 % (sin sticky), axe/Lighthouse sobre la aurora y teclado completo.

---

## 5. Orden de implementación en 30 minutos

| Min | Bloque | Notas |
|---|---|---|
| 0 a 3 | Base: `motion.css`, `motion.ts`, bloque `no-preference`, `content-visibility` | Efecto 0 |
| 3 a 8 | Reveal con stagger (efecto 1) | Es el cambio más visible |
| 8 a 10 | Barra de progreso (efecto 2) | |
| 10 a 13 | Aurora (efecto 3) | Verificar contraste en claro y oscuro |
| 13 a 16 | ECG en 3 puntos (efecto 4) | |
| 16 a 19 | Hero por palabras (efecto 5) | Medir LCP |
| 19 a 21 | Encabezado compacto (efecto 6) | |
| 21 a 24 | Números (efecto 7) | |
| 24 a 30 | Escena sticky (efecto 8) | |

**Si falta tiempo, recortar en este orden:** tilt (efecto 9), encabezado compacto, entrada del héroe (dejar solo la salida), aurora, números.

**No se recorta nunca:** el reveal reversible, la barra de progreso, el bloque `prefers-reduced-motion`, el fallback con IO y la regla de que el héroe no nace oculto.

**Antes de dar por terminado:** probar bajar y subir en Chrome (nativo) y en un navegador sin soporte (fallback), reduced-motion activado, claro y oscuro, y comparar el LCP.

---

## 6. Fuentes

**Hallazgos verificados [F]**
1. Chrome for Developers, "Scroll-driven animations": https://developer.chrome.com/docs/css-ui/scroll-driven-animations (bidireccionalidad, `view()`/`scroll()`, `animation-range`, orden del shorthand, soporte, nota sobre el hilo principal).
2. web.dev, "Optimize LCP": https://web.dev/articles/optimize-lcp (element render delay, elemento oculto por JS u otro código; la conclusión sobre `opacity:0` es inferencia).
3. W3C, "Understanding SC 2.2.2 Pause, Stop, Hide": https://www.w3.org/WAI/WCAG21/Understanding/pause-stop-hide.html (5 s, inicio automático; los degradados animados son inferencia; las animaciones cortas por scroll pueden tocar 2.3.3, AAA).
4. web.dev, "content-visibility": https://web.dev/articles/content-visibility (232 ms a 30 ms, `contain-intrinsic-size`, soporte).
5. Universidad de Oregón, "Motion": https://digitalaccessibility.uoregon.edu/guidelines/motion (evitar paralaje, autoplay y carruseles automáticos; no parpadear más de 3 veces por segundo).

**Criterio del director de motion [C], sin hallazgo, validar al implementar:** técnica de números con IO y `rAF`, `stroke-dashoffset` del ECG, `view-timeline` con nombre y rangos `contain` del sticky, tilt, header compacto, presupuestos numéricos de JS/CSS, umbrales de Core Web Vitals (2,5 s, 0,1, 200 ms) y la regla anti scroll hijacking.