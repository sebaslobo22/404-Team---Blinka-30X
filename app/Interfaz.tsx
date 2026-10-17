'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BotonTour } from './tour/BotonTour';
const enlaces = [['/', 'Decisiones'], ['/cola', 'Cola humana'], ['/reglas', 'Reglas'], ['/registro', 'Registro']] as const;
export function Cabecera() {
  const ruta = usePathname();
  const [tema, setTema] = useState('sistema');
  const [compacta, setCompacta] = useState(false);
  useEffect(() => {
    try { const t = localStorage.getItem('404-tema') ?? 'sistema'; setTema(t); if (t !== 'sistema') document.documentElement.dataset.theme = t; } catch { /* respaldo del sistema */ }
    const releer = () => { try { setTema(localStorage.getItem('404-tema') ?? 'sistema'); } catch { /* respaldo del sistema */ } };
    window.addEventListener('tema:cambio', releer);
    let anterior = window.scrollY;
    const scroll = () => { const y = window.scrollY; setCompacta(y > 80 && y > anterior); anterior = y; };
    window.addEventListener('scroll', scroll, { passive: true });
    return () => { window.removeEventListener('scroll', scroll); window.removeEventListener('tema:cambio', releer); };
  }, []);
  function cambiar() {
    const t = tema === 'light' ? 'dark' : tema === 'dark' ? 'sistema' : 'light';
    setTema(t);
    if (t === 'sistema') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t === 'light' ? 'light' : 'dark';
    try { localStorage.setItem('404-tema', t); } catch { /* tema en memoria */ }
    window.dispatchEvent(new Event('tema:cambio'));
  }
  return <header className={`cabecera${compacta ? ' compacta' : ''}`}>

    <div className="contenedor cabecera-interior">
      <Link className="marca" href="/">Agente pagador <span className="marca-equipo">· Equipo 404</span></Link>

      <nav className="nav" aria-label="Principal">{enlaces.map(([href, texto]) => <Link key={href} href={href} aria-current={(href === '/' ? ruta === '/' || ruta.startsWith('/facturas/') : ruta === href) ? 'page' : undefined}>{texto}</Link>)}</nav>

      <div className="acciones"><BotonTour /><Link href="/team" aria-current={ruta === '/team' ? 'page' : undefined}>Equipo</Link><button className="btn tema" onClick={cambiar} aria-label={`Tema ${tema === 'light' ? 'claro' : tema === 'dark' ? 'oscuro' : 'del sistema'}. Cambiar tema`}>◐</button></div>
    </div>
  </header>;
}
export function AvisoReplay() {
  const [visible, setVisible] = useState(true);
  const ruta = usePathname();
  if (!visible || ruta.startsWith('/team')) return null;
  return <aside className="aviso-demo">
    <div className="contenedor">
      <p><strong>Modo replay</strong> · Datos ficticios y lecturas de muestra. Nunca mueve dinero.</p>
      <button className="btn" aria-label="Cerrar aviso de modo replay" onClick={() => setVisible(false)}>×</button></div>
  </aside>;
}
export function Movimiento() {
  const ruta = usePathname();
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    if (media.matches || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => entries.forEach(e => e.target.classList.toggle('revelada', e.isIntersecting)), { threshold: .08 });
    document.querySelectorAll('main section, main article, .timeline li').forEach(e => observer.observe(e));
    return () => { observer.disconnect(); document.querySelectorAll('.revelada').forEach(e => e.classList.remove('revelada')); };
  }, [ruta]);
  return null;
}
export function Contador({ valor }: { valor: number ;}) {
  const [actual, setActual] = useState(valor);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    const nodo = document.getElementById('autonomia'); if (!nodo) return;
    let frame = 0;
    const ob = new IntersectionObserver(es => { if (!es[0]?.isIntersecting) return; ob.disconnect(); const inicio = performance.now(); const pintar = (t: number) => { const p = Math.min(1, (t - inicio) / 320); setActual(p === 1 ? valor : Math.round(valor * p)); if (p < 1) frame = requestAnimationFrame(pintar); }; frame = requestAnimationFrame(pintar); });
    ob.observe(nodo); return () => { ob.disconnect(); cancelAnimationFrame(frame); };
  }, [valor]);
  return <span id="autonomia"><span className="sr-only">{valor}%</span><span aria-hidden="true">{actual}%</span></span>;
}
