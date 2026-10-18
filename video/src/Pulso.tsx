import React from 'react';
import { AbsoluteFill, Easing, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';

const { fontFamily } = loadFont('normal', { weights: ['400', '500', '600', '700', '800'], subsets: ['latin', 'latin-ext'] });

const FPS = 30;
const C = {
  fondo: '#050D1C', marino: '#0A2540', superficie: '#133459', tinta: '#F6F9FC', tenue: '#B4C3D6',
  acento: '#A99DFE', pagar: '#3DDC97', frenar: '#FF5C7A', escalar: '#FFB547', firmaDesde: '#635BFF', firmaHasta: '#00D4FF',
};
const URL = 'equipo404.produfy.co';

const sp = (f: number, d = 0) => spring({ frame: f - d, fps: FPS, config: { damping: 14, stiffness: 170 } });
const lin = (f: number, a: number, b: number, from = 0, to = 1) =>
  interpolate(f, [a, b], [from, to], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

// ---------- Piezas base ----------
const Pop: React.FC<{ desde?: number; dy?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ desde = 0, dy = 32, style, children }) => {
  const f = useCurrentFrame();
  const s = sp(f, desde);
  return <div style={{ opacity: Math.min(1, s * 1.4), transform: `translateY(${(1 - s) * dy}px) scale(${0.92 + 0.08 * s})`, ...style }}>{children}</div>;
};

const Centro: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', flexDirection: 'column', padding: '0 140px', ...style }}>{children}</AbsoluteFill>
);

const H: React.CSSProperties = { fontSize: 112, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.04, color: C.tinta };

const Aviso: React.FC = () => (
  <div style={{ position: 'absolute', right: 34, bottom: 22, fontSize: 18, fontWeight: 500, color: C.tenue, opacity: 0.6 }}>Datos ficticios · Pulso no mueve dinero</div>
);

const LineaPulso: React.FC<{ ancho?: number; desde?: number }> = ({ ancho = 760, desde = 0 }) => {
  const f = useCurrentFrame();
  const p = lin(f, desde, desde + 18);
  const t = ((f - desde) % 24) / 24;
  const late = 1 + 0.04 * Math.max(0, Math.sin(Math.min(1, t * 3) * Math.PI));
  return (
    <svg width={ancho} height={ancho * 0.18} viewBox="0 0 900 160" style={{ overflow: 'visible', transform: `scale(${late})` }}>
      <defs>
        <linearGradient id="firma" x1="0" x2="1">
          <stop offset="0" stopColor={C.firmaDesde} stopOpacity="0" /><stop offset="0.2" stopColor={C.firmaDesde} />
          <stop offset="0.8" stopColor={C.firmaHasta} /><stop offset="1" stopColor={C.firmaHasta} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0 80 H330 L365 80 L392 34 L424 136 L456 12 L486 112 L508 80 H900" fill="none" stroke="url(#firma)" strokeWidth={6}
        strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p}
        style={{ filter: `drop-shadow(0 0 ${10 + 14 * (late - 1) * 25}px rgba(99,91,255,0.7))` }} />
    </svg>
  );
};

/** Captura con Ken Burns. */
const Pantalla: React.FC<{ src: string; dur: number; foco?: [number, number]; zoom?: [number, number]; marco?: { x: number; y: number; w: number; h: number; desde: number; color?: string } }> = ({ src, dur, foco = [50, 40], zoom = [1.02, 1.14], marco }) => {
  const f = useCurrentFrame();
  const s = interpolate(f, [0, dur], zoom, { extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad) });
  const pm = marco ? sp(f, marco.desde) : 0;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#0A2540' }}>
      <div style={{ position: 'absolute', inset: 0, transformOrigin: `${foco[0]}% ${foco[1]}%`, transform: `scale(${s})` }}>
        <Img src={staticFile(src)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        {marco ? <div style={{ position: 'absolute', left: `${marco.x}%`, top: `${marco.y}%`, width: `${marco.w}%`, height: `${marco.h}%`, borderRadius: 12, border: `4px solid ${marco.color ?? C.acento}`, opacity: pm, transform: `scale(${1.06 - 0.06 * pm})`, boxShadow: `0 0 0 9999px rgba(5,13,28,${0.45 * pm}), 0 0 40px ${marco.color ?? C.acento}` }} /> : null}
      </div>
    </div>
  );
};

/** MacBook Pro dibujado en CSS. Pantalla 1280x800 (16:10). */
const MacBook: React.FC<{ src: string; dur: number; x?: number; y?: number; escala?: number; foco?: [number, number]; zoom?: [number, number]; marco?: React.ComponentProps<typeof Pantalla>['marco']; desde?: number; url?: string }> = ({ src, dur, x = 960, y = 470, escala = 0.95, foco, zoom, marco, desde = 0, url }) => {
  const f = useCurrentFrame();
  const s = sp(f, desde);
  const W = 1280, Hh = 800, B = 16;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: 0, height: 0, perspective: 2400 }}>
      <div style={{ position: 'absolute', left: -(W + 2 * B) / 2, top: -(Hh + 2 * B) / 2, opacity: Math.min(1, s * 1.5),
        transform: `translateY(${(1 - s) * 40}px) scale(${escala * (0.92 + 0.08 * s)}) rotateX(${4 * (1 - s)}deg)`, transformOrigin: '50% 100%' }}>
        <div style={{ width: W + 2 * B, height: Hh + 2 * B, padding: B, borderRadius: 30, background: 'linear-gradient(180deg,#1b1d22,#0c0d10)', boxShadow: '0 0 0 2px #3a3d44, 0 60px 120px rgba(0,0,0,0.6)', position: 'relative', boxSizing: 'border-box' }}>
          <div style={{ position: 'relative', width: W, height: Hh, borderRadius: 10, overflow: 'hidden' }}>
            <Pantalla src={src} dur={dur} foco={foco} zoom={zoom} marco={marco} />
            {url ? <div style={{ position: 'absolute', left: 'auto', right: 16, top: 12, fontSize: 15, color: C.tinta, background: 'rgba(5,13,28,0.72)', padding: '5px 16px', borderRadius: 8 }}>{url}</div> : null}
          </div>
          <div style={{ position: 'absolute', left: '50%', top: B - 1, transform: 'translateX(-50%)', width: 190, height: 26, background: '#0c0d10', borderBottomLeftRadius: 14, borderBottomRightRadius: 14 }} />
        </div>
        <div style={{ position: 'relative', left: -70, width: W + 2 * B + 140, height: 30, background: 'linear-gradient(180deg,#c9ccd3,#8d9099)', borderBottomLeftRadius: 40, borderBottomRightRadius: 40, borderTopLeftRadius: 4, borderTopRightRadius: 4, boxShadow: '0 30px 60px rgba(0,0,0,0.55)' }}>
          <div style={{ position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)', width: 220, height: 12, background: '#7a7d86', borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }} />
        </div>
      </div>
    </div>
  );
};

/** iPad dibujado en CSS (horizontal). */
const IPad: React.FC<{ src: string; dur: number; x: number; y: number; escala?: number; desde?: number }> = ({ src, dur, x, y, escala = 0.55, desde = 0 }) => {
  const f = useCurrentFrame();
  const s = sp(f, desde);
  const W = 1180, Hh = 820;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: 0, height: 0 }}>
      <div style={{ position: 'absolute', left: -W / 2 - 24, top: -Hh / 2 - 24, opacity: Math.min(1, s * 1.5), transform: `translateX(${(1 - s) * -40}px) scale(${escala * (0.92 + 0.08 * s)})` }}>
        <div style={{ padding: 24, borderRadius: 52, background: '#111317', boxShadow: '0 0 0 3px #3a3d44, 0 50px 100px rgba(0,0,0,0.6)' }}>
          <div style={{ position: 'relative', width: W, height: Hh, borderRadius: 24, overflow: 'hidden' }}>
            <Pantalla src={src} dur={dur} foco={[30, 30]} zoom={[1.0, 1.1]} />
          </div>
        </div>
      </div>
    </div>
  );
};

/** iPhone con Dynamic Island. Pantalla 390x844. */
const IPhone: React.FC<{ x: number; y: number; escala?: number; children: React.ReactNode }> = ({ x, y, escala = 1.02, children }) => {
  const f = useCurrentFrame();
  const s = sp(f, 0);
  const W = 390, Hh = 844, B = 14;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width: 0, height: 0 }}>
      <div style={{ position: 'absolute', left: -(W + 2 * B) / 2, top: -(Hh + 2 * B) / 2, opacity: Math.min(1, s * 1.5), transform: `translateY(${(1 - s) * 40}px) scale(${escala * (0.92 + 0.08 * s)})` }}>
        <div style={{ padding: B, borderRadius: 66, background: 'linear-gradient(160deg,#2a2c31,#0d0e11)', boxShadow: '0 0 0 3px #4a4d55, 0 60px 120px rgba(0,0,0,0.6)' }}>
          <div style={{ position: 'relative', width: W, height: Hh, borderRadius: 52, overflow: 'hidden', background: '#0B1E36' }}>
            {children}
            <div style={{ position: 'absolute', left: '50%', top: 11, transform: 'translateX(-50%)', width: 124, height: 36, borderRadius: 18, background: '#000' }} />
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------- Escenas ----------
const Texto: React.FC<{ children: React.ReactNode; tam?: number }> = ({ children, tam = 112 }) => (
  <Centro><Pop style={{ ...H, fontSize: tam }}>{children}</Pop></Centro>
);

const Logo: React.FC<{ sub?: boolean; url?: boolean }> = ({ sub, url }) => (
  <Centro>
    <LineaPulso />
    <Pop desde={6} style={{ ...H, fontSize: 176, letterSpacing: '-0.05em', marginTop: 4 }}>Pulso</Pop>
    {sub ? <Pop desde={14} style={{ fontSize: 50, fontWeight: 600, color: C.tenue, letterSpacing: '-0.02em', marginTop: 12 }}>Pulso firme en cada pago.</Pop> : null}
    {url ? <Pop desde={22} style={{ fontSize: 40, fontWeight: 600, color: C.acento, marginTop: 26 }}>{URL}</Pop> : null}
  </Centro>
);

const Caption: React.FC<{ texto: React.ReactNode; desde?: number; top?: number }> = ({ texto, desde = 8, top = 948 }) => (
  <div style={{ position: 'absolute', left: 0, right: 0, top, textAlign: 'center' }}>
    <Pop desde={desde} dy={24} style={{ fontSize: 58, fontWeight: 700, letterSpacing: '-0.03em', color: C.tinta }}>{texto}</Pop>
  </div>
);

const ESportada: React.FC = () => (
  <>
    <MacBook src="portada.png" dur={210} y={455} escala={0.98} foco={[60, 70]} url={URL} marco={{ x: 46.5, y: 76, w: 25.5, h: 21.5, desde: 95, color: C.pagar }} />
    <Caption texto="Todo lo que pagas, frenas o revisas. En una pantalla." />
  </>
);

type Tipo = 'PAGAR' | 'FRENAR' | 'ESCALAR';
const COLOR: Record<Tipo, string> = { PAGAR: C.pagar, FRENAR: C.frenar, ESCALAR: C.escalar };

const Veredicto: React.FC<{ tipo: Tipo; frase: string; sub: string; src: string; foco: [number, number]; marco?: React.ComponentProps<typeof Pantalla>['marco'] }> = ({ tipo, frase, sub, src, foco, marco }) => {
  const f = useCurrentFrame();
  const col = COLOR[tipo];
  const pop = interpolate(f, [0, 2, 15, 22], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const sello = sp(f, 0);
  return (
    <>
      <AbsoluteFill style={{ background: col, opacity: pop }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 75% 50%, ${col}22 0%, transparent 60%)`, opacity: 1 - pop }} />
      {f >= 15 ? <MacBook src={src} dur={165} x={1290} y={520} escala={0.64} foco={foco} zoom={[1.15, 1.35]} marco={marco} desde={15} /> : null}
      <div style={{ position: 'absolute', left: 120, top: 0, bottom: 0, width: 720, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ alignSelf: 'flex-start', fontSize: 40, fontWeight: 800, letterSpacing: '0.06em', color: f < 18 ? '#050D1C' : col, border: `4px solid ${f < 18 ? '#050D1C' : col}`, borderRadius: 14, padding: '8px 22px', transform: `scale(${0.6 + 0.4 * sello})` }}>{tipo}</div>
        <Pop desde={14} style={{ ...H, fontSize: 116, marginTop: 30 }}>{frase}</Pop>
        <Pop desde={24} style={{ fontSize: 38, fontWeight: 500, color: C.tenue, marginTop: 22, lineHeight: 1.3 }}>{sub}</Pop>
      </div>
    </>
  );
};

const EsInyeccion: React.FC = () => (
  <>
    <MacBook src="f016.png" dur={180} y={455} escala={0.98} foco={[48, 47]} zoom={[1.05, 1.3]} url={`${URL}/facturas/F-016`} marco={{ x: 21.5, y: 43.5, w: 54, h: 6.5, desde: 40, color: C.escalar }} />
    <Caption texto={<>Pulso la leyó como <span style={{ color: C.escalar }}>dato</span>. No obedeció.</>} desde={30} />
  </>
);

const EsCola: React.FC = () => (
  <>
    <MacBook src="cola.png" dur={150} y={455} escala={0.98} foco={[50, 55]} url={`${URL}/cola`} marco={{ x: 20.5, y: 41.5, w: 77.8, h: 43.5, desde: 50 }} />
    <Caption texto="A ti solo te llega lo dudoso." />
  </>
);

const EsAprobar: React.FC = () => {
  const f = useCurrentFrame();
  // cursor hasta el botón Aprobar
  const cx = interpolate(f, [10, 70], [55, 30], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });
  const cy = interpolate(f, [10, 70], [35, 83], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });
  const clic = lin(f, 78, 98);
  return (
    <>
      <MacBook src="f016b.png" dur={165} y={455} escala={0.98} foco={[30, 75]} zoom={[1.02, 1.12]} url={`${URL}/facturas/F-016`} />
      <div style={{ position: 'absolute', left: 960 - 640 * 0.98 + (cx / 100) * 1280 * 0.98, top: 455 - 400 * 0.98 + (cy / 100) * 800 * 0.98 }}>
        {f >= 78 && f <= 98 ? <div style={{ position: 'absolute', left: -34, top: -34, width: 68, height: 68, borderRadius: 34, border: `4px solid ${C.pagar}`, opacity: 1 - clic, transform: `scale(${0.3 + clic})` }} /> : null}
        <svg width="34" height="40" viewBox="0 0 34 40" style={{ position: 'absolute', left: -4, top: -3, filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))' }}>
          <path d="M4 3 L4 31 L11.5 24.5 L16.5 36 L21.5 34 L16.5 22.5 L26.5 22.5 Z" fill="#fff" stroke="#0A2540" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      </div>
      <Caption texto="Lo dudoso lo decides tú. Con una nota." />
    </>
  );
};

const Burbuja: React.FC<{ desde: number; mia?: boolean; children: React.ReactNode }> = ({ desde, mia, children }) => (
  <Pop desde={desde} dy={20} style={{ display: 'flex', justifyContent: mia ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
    <div style={{ maxWidth: 300, padding: '11px 14px', borderRadius: 16, borderBottomLeftRadius: mia ? 16 : 4, borderBottomRightRadius: mia ? 4 : 16, background: mia ? '#5B4FD9' : C.superficie, color: C.tinta, fontSize: 16, lineHeight: 1.4, whiteSpace: 'pre-line', textAlign: 'left' }}>{children}</div>
  </Pop>
);

const EsTelegram: React.FC = () => {
  const f = useCurrentFrame();
  const toque = 95;
  const t = lin(f, toque, toque + 16);
  const aprobado = f >= toque + 6;
  return (
    <>
      <IPhone x={640} y={540}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 110, background: '#10294A', display: 'flex', alignItems: 'flex-end', padding: '0 18px 12px', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 21, background: `linear-gradient(120deg, ${C.firmaDesde}, ${C.firmaHasta})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="26" height="18" viewBox="0 0 30 20" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M1 10 H9 L12 3 L16 17 L19 10 H29" /></svg>
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 19, fontWeight: 600, color: C.tinta }}>Pulso</div>
            <div style={{ fontSize: 13, color: C.tenue }}>bot</div>
          </div>
        </div>
        <div style={{ position: 'absolute', top: 132, left: 16, right: 16 }}>
          <Burbuja desde={14}>{'Hay una factura que necesita tu aprobación (simulada).\n\nProveedor: Taller Orinoco C.A.\nFactura: TO-0016\nMonto: USD 1.190'}</Burbuja>
          <Pop desde={26} style={{ display: 'flex', gap: 8, width: 300, marginBottom: 16 }}>
            {['Aprobar', 'Rechazar'].map((b) => {
              const activo = b === 'Aprobar' && f >= toque;
              return <div key={b} style={{ flex: 1, textAlign: 'center', padding: '10px 0', borderRadius: 10, background: activo ? C.pagar : 'rgba(19,52,89,0.85)', color: activo ? '#050D1C' : C.tinta, fontSize: 16, fontWeight: 600, transform: `scale(${b === 'Aprobar' && f >= toque && f < toque + 8 ? 0.94 : 1})` }}>{b}</div>;
            })}
          </Pop>
          {aprobado ? <Burbuja desde={toque + 10}>{'Aprobada. Queda en el registro.'}</Burbuja> : null}
        </div>
        {f >= toque - 4 && f <= toque + 16 ? <div style={{ position: 'absolute', left: 16 + 70 - 30, top: 132 + 168, width: 60, height: 60, borderRadius: 30, background: 'rgba(255,255,255,0.35)', opacity: 1 - t, transform: `scale(${0.4 + t})` }} /> : null}
        <div style={{ position: 'absolute', bottom: 20, left: 0, right: 0, textAlign: 'center', fontSize: 13, color: C.tenue, opacity: 0.7 }}>Recreación</div>
      </IPhone>
      <div style={{ position: 'absolute', left: 1000, top: 0, bottom: 0, width: 800, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Pop desde={20} style={{ ...H, fontSize: 104 }}>Apruebas desde tu teléfono.</Pop>
        <Pop desde={toque} style={{ ...H, fontSize: 104, color: C.pagar, marginTop: 16 }}>En un toque.</Pop>
        <Pop desde={toque + 20} style={{ fontSize: 32, fontWeight: 500, color: C.tenue, marginTop: 28 }}>37 escenarios probados en Telegram.</Pop>
      </div>
    </>
  );
};

const Cuenta: React.FC<{ hasta: number; desde?: number; color?: string; tam?: number }> = ({ hasta, desde = 4, color = C.tinta, tam = 320 }) => {
  const f = useCurrentFrame();
  const v = Math.round(interpolate(f, [desde, desde + 18], [0, hasta], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }));
  return <span style={{ fontSize: tam, fontWeight: 800, letterSpacing: '-0.05em', color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{v.toLocaleString('es')}</span>;
};

const EsCifra: React.FC<{ cifra: React.ReactNode; rotulo: string; sub?: string; color?: string }> = ({ cifra, rotulo, sub, color }) => {
  const f = useCurrentFrame();
  const flash = interpolate(f, [18, 20, 30], [0, 0.35, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <>
      {color ? <AbsoluteFill style={{ background: color, opacity: flash }} /> : null}
      <Centro>
        <Pop>{cifra}</Pop>
        <Pop desde={6} style={{ fontSize: 76, fontWeight: 700, letterSpacing: '-0.03em', marginTop: 10 }}>{rotulo}</Pop>
        {sub ? <Pop desde={12} style={{ fontSize: 30, fontWeight: 500, color: C.tenue, marginTop: 16 }}>{sub}</Pop> : null}
      </Centro>
    </>
  );
};

const EsRegistro: React.FC = () => (
  <>
    <MacBook src="registro.png" dur={195} y={430} escala={0.92} foco={[40, 35]} url={`${URL}/registro`} marco={{ x: 20.3, y: 29.3, w: 78.2, h: 10.6, desde: 40 }} />
    <Caption texto="Cada decisión queda encadenada." top={880} />
    <Caption texto={<span style={{ color: C.acento }}>Si alguien la toca, se nota.</span>} desde={60} top={960} />
  </>
);

const EsDispositivos: React.FC = () => (
  <>
    <MacBook src="portada.png" dur={195} x={1080} y={470} escala={0.78} foco={[50, 40]} url={URL} />
    <IPad src="portada.png" dur={195} x={420} y={640} escala={0.42} desde={12} />
    <Caption texto="Recupera tus viernes." desde={30} top={930} />
  </>
);

// ---------- Línea de tiempo ----------
export const ESCENAS: { nombre: string; dur: number; C: React.FC; aviso?: boolean }[] = [
  { nombre: 'Gancho 1', dur: 75, C: () => <Texto>¿Cuántas facturas pagaste <span style={{ color: C.frenar }}>dos veces</span> este año?</Texto> },
  { nombre: 'Gancho 2', dur: 66, C: () => <Texto tam={128}>¿Y si una cuenta <span style={{ color: C.escalar }}>cambió ayer</span>?</Texto> },
  { nombre: 'Logo', dur: 75, C: () => <Logo /> },
  { nombre: 'Lee', dur: 45, C: () => <Texto tam={140}>Pulso las lee.</Texto> },
  { nombre: 'Decide', dur: 50, C: () => <Texto tam={140}>Decide con <span style={{ color: C.acento }}>tus reglas</span>.</Texto> },
  { nombre: 'Pregunta', dur: 70, C: () => <Texto>Y solo te pregunta lo que importa.</Texto> },
  { nombre: 'MacBook portada', dur: 210, C: ESportada, aviso: true },
  { nombre: 'PAGAR', dur: 165, C: () => <Veredicto tipo="PAGAR" frase="Esta se paga sola." sub="Proveedor conocido, monto correcto, cuenta de siempre." src="portada.png" foco={[60, 70]} />, aviso: true },
  { nombre: 'FRENAR', dur: 165, C: () => <Veredicto tipo="FRENAR" frase="Esta no. Nunca." sub="Cobro repetido. Ya se había pagado." src="f006.png" foco={[40, 35]} marco={{ x: 21, y: 27, w: 77, h: 26, desde: 30, color: C.frenar }} />, aviso: true },
  { nombre: 'ESCALAR', dur: 165, C: () => <Veredicto tipo="ESCALAR" frase="Esta te pregunta." sub="La cuenta del proveedor cambió hace poco." src="f011.png" foco={[45, 47]} marco={{ x: 21.5, y: 43.5, w: 50, h: 6.5, desde: 30, color: C.escalar }} />, aviso: true },
  { nombre: 'Inyección texto', dur: 72, C: () => <Texto tam={104}>Una factura intentó darle <span style={{ color: C.escalar }}>órdenes a la IA</span>.</Texto> },
  { nombre: 'Inyección MacBook', dur: 210, C: EsInyeccion, aviso: true },
  { nombre: 'Cola', dur: 180, C: EsCola, aviso: true },
  { nombre: 'Aprobar', dur: 165, C: EsAprobar, aviso: true },
  { nombre: 'iPhone Telegram', dur: 210, C: EsTelegram, aviso: true },
  { nombre: '25 de 30', dur: 75, C: () => <EsCifra color={C.pagar} cifra={<><Cuenta hasta={25} /><span style={{ fontSize: 140, fontWeight: 700, color: C.tenue }}> de 30</span></>} rotulo="decididas sin ti." sub="83,3 % en un set ciego de facturas" /> },
  { nombre: '0 pagos', dur: 70, C: () => <EsCifra color={C.pagar} cifra={<span style={{ fontSize: 320, fontWeight: 800, color: C.pagar, lineHeight: 1 }}>0</span>} rotulo="pagos indebidos." /> },
  { nombre: '728 pruebas', dur: 70, C: () => <EsCifra cifra={<Cuenta hasta={728} tam={280} />} rotulo="pruebas." sub="Y 37 escenarios en Telegram." /> },
  { nombre: 'Registro', dur: 210, C: EsRegistro, aviso: true },
  { nombre: 'Dispositivos', dur: 195, C: EsDispositivos, aviso: true },
  { nombre: 'Cierre', dur: 165, C: () => <Logo sub url /> },
];

export const DURACION_TOTAL = ESCENAS.reduce((a, e) => a + e.dur, 0);

export const Pulso: React.FC = () => {
  let t = 0;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 38%, #0C2142 0%, ${C.fondo} 62%)`, fontFamily, color: C.tinta }}>
      {ESCENAS.map((e) => {
        const from = t;
        t += e.dur;
        return (
          <Sequence key={e.nombre} from={from} durationInFrames={e.dur} name={e.nombre}>
            <AbsoluteFill>
              <e.C />
              {e.aviso ? <Aviso /> : null}
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
