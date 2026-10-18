/**
 * Movimiento de /conoce. El CSS hace casi todo (animation-timeline ligado al scroll, reversible).
 * Este archivo cubre lo que CSS no puede: el respaldo para navegadores sin animation-timeline,
 * los números que cuentan y la inclinación sutil de las tarjetas.
 * Con "reducir movimiento" no hace nada y la página queda estática y completa.
 */
export function initMotion(): () => void {
  const limpiar: Array<() => void> = [];
  try {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
    const raiz = document.documentElement;
    const vista = CSS.supports('animation-timeline: view()');
    const scroll = CSS.supports('animation-timeline: scroll()');
    const hayIO = typeof IntersectionObserver !== 'undefined';

    if (!vista && hayIO) {
      raiz.classList.add('io');
      limpiar.push(() => raiz.classList.remove('io'));
      // Respaldo reversible: la clase se pone al entrar y se quita al salir.
      const ioRev = new IntersectionObserver(
        (es) => es.forEach((e) => e.target.classList.toggle('is-in', e.isIntersecting)),
        { rootMargin: '0px 0px -10% 0px', threshold: 0.08 },
      );
      document.querySelectorAll('[data-reveal], .ecg:not(.ecg-hero)').forEach((el) => ioRev.observe(el));
      const ioPaso = new IntersectionObserver(
        (es) => es.forEach((e) => e.target.classList.toggle('is-on', e.isIntersecting || e.boundingClientRect.top < 0)),
        { rootMargin: '0px 0px -40% 0px' },
      );
      document.querySelectorAll('.paso').forEach((el) => ioPaso.observe(el));
      limpiar.push(() => { ioRev.disconnect(); ioPaso.disconnect(); });
    }
    if (!scroll) {
      if (hayIO) {
        raiz.classList.add('io');
        const tope = document.getElementById('tope');
        if (tope) {
          const ioTope = new IntersectionObserver(([e]) => raiz.classList.toggle('is-scrolled', !e!.isIntersecting));
          ioTope.observe(tope);
          limpiar.push(() => { ioTope.disconnect(); raiz.classList.remove('is-scrolled'); });
        }
      }
      let t = 0;
      const alScroll = () => {
        cancelAnimationFrame(t);
        t = requestAnimationFrame(() => raiz.style.setProperty('--p', String(scrollY / Math.max(1, raiz.scrollHeight - innerHeight))));
      };
      addEventListener('scroll', alScroll, { passive: true });
      alScroll();
      limpiar.push(() => { removeEventListener('scroll', alScroll); cancelAnimationFrame(t); });
    }
    limpiar.push(initNumeros(), initInclinacion());
  } catch { /* sin movimiento: la página sigue completa */ }
  return () => limpiar.forEach((f) => f());
}

/** Los números cuentan una sola vez al entrar en pantalla (900 ms, ease-out). El valor final siempre está en el HTML. */
function initNumeros(): () => void {
  if (typeof IntersectionObserver === 'undefined') return () => {};
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-count]'));
  const alto = innerHeight;
  const dec = (el: HTMLElement) => Number(el.dataset.dec ?? 0);
  const texto = (v: number, d: number) => v.toFixed(d).replace('.', ',');
  const finales = new Map<HTMLElement, string>();
  let raf = 0;
  const io = new IntersectionObserver((es, o) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    const el = e.target as HTMLElement;
    o.unobserve(el);
    const fin = Number(el.dataset.fin), d = dec(el), t0 = performance.now(), dur = 900;
    const paso = (t: number) => {
      const p = Math.min((t - t0) / dur, 1);
      el.textContent = p < 1 ? texto(fin * (1 - Math.pow(1 - p, 3)), d) : finales.get(el)!;
      if (p < 1) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
  }), { threshold: 0.6 });
  for (const el of els) {
    if (!(Number(el.dataset.fin) > 0) || el.getBoundingClientRect().top < alto) continue;
    finales.set(el, el.textContent ?? '');
    el.textContent = texto(0, dec(el));
    io.observe(el);
  }
  return () => { io.disconnect(); cancelAnimationFrame(raf); finales.forEach((t, el) => { el.textContent = t; }); };
}

/** Inclinación de las tarjetas: máximo 3 grados, solo con cursor fino. */
function initInclinacion(): () => void {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return () => {};
  const tarjeta = (e: Event) => (e.target as Element | null)?.closest?.<HTMLElement>('.conoce .tarjeta[data-tarjeta]') ?? null;
  const mover = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const c = tarjeta(e);
    if (!c) return;
    const r = c.getBoundingClientRect();
    c.style.setProperty('--rx', `${(-((e.clientY - r.top) / r.height - 0.5) * 6).toFixed(2)}deg`);
    c.style.setProperty('--ry', `${(((e.clientX - r.left) / r.width - 0.5) * 6).toFixed(2)}deg`);
  };
  const salir = (e: PointerEvent) => {
    const c = tarjeta(e);
    if (c && !c.contains(e.relatedTarget as Node | null)) { c.style.removeProperty('--rx'); c.style.removeProperty('--ry'); }
  };
  document.addEventListener('pointermove', mover, { passive: true });
  document.addEventListener('pointerout', salir, { passive: true });
  return () => { document.removeEventListener('pointermove', mover); document.removeEventListener('pointerout', salir); };
}
