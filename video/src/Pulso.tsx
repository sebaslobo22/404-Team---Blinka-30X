import React from 'react';
import { AbsoluteFill, Easing, Img, Sequence, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';

const { fontFamily } = loadFont('normal', { weights: ['400', '500', '600', '700'], subsets: ['latin', 'latin-ext'] });

// Paleta: tokens del modo oscuro de app/globals.css
const C = {
  fondo: '#050D1C',
  marino: '#0A2540',
  superficie: '#133459',
  tinta: '#F6F9FC',
  tenue: '#B4C3D6',
  linea: '#7389A6',
  acento: '#A99DFE',
  pagar: '#6EE7AE',
  frenar: '#FFA3B5',
  escalar: '#FFCB6B',
  firmaDesde: '#635BFF',
  firmaHasta: '#00D4FF',
};

const curva = Easing.bezier(0.2, 0.7, 0.2, 1);
const prog = (f: number, desde: number, dur = 18) =>
  interpolate(f, [desde, desde + dur], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: curva });

// ---------- Piezas ----------

/** Texto que entra con fundido y desplazamiento suave; sale si se indica `hasta`. */
const Frase: React.FC<{ desde: number; hasta?: number; dy?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ desde, hasta, dy = 20, style, children }) => {
  const f = useCurrentFrame();
  const entra = prog(f, desde, 20);
  const sale = hasta === undefined ? 0 : prog(f, hasta, 14);
  return (
    <div style={{ opacity: entra * (1 - sale), transform: `translateY(${(1 - entra) * dy - sale * 12}px)`, ...style }}>
      {children}
    </div>
  );
};

const Escena: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 12, dur - 15, dur], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

const Centro: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', flexDirection: 'column', ...style }}>{children}</AbsoluteFill>
);

const titular: React.CSSProperties = { fontSize: 92, fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1.08, color: C.tinta };

/** La línea de pulso (electrocardiograma) que se dibuja. */
const LineaPulso: React.FC<{ desde: number; dur?: number; ancho?: number }> = ({ desde, dur = 45, ancho = 900 }) => {
  const f = useCurrentFrame();
  const p = prog(f, desde, dur);
  const brillo = interpolate(f, [desde + dur, desde + dur + 20, desde + dur + 60], [0.35, 0.8, 0.45], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <svg width={ancho} height={ancho * 0.18} viewBox="0 0 900 160" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="firma" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor={C.firmaDesde} stopOpacity="0" />
          <stop offset="0.2" stopColor={C.firmaDesde} />
          <stop offset="0.8" stopColor={C.firmaHasta} />
          <stop offset="1" stopColor={C.firmaHasta} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0 80 H330 L365 80 L392 34 L424 136 L456 12 L486 112 L508 80 H900"
        fill="none"
        stroke="url(#firma)"
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - p}
        style={{ filter: `drop-shadow(0 0 14px rgba(99,91,255,${brillo}))` }}
      />
    </svg>
  );
};

type Punto = { f: number; x: number; y: number };

/** Ventana de navegador minimalista con captura real, cámara lenta, cursor y foco. */
const Ventana: React.FC<{
  src: string;
  url: string;
  dur: number;
  escala?: [number, number];
  foco?: [number, number];
  centrar?: [number, number]; // frames en que la cámara se desplaza
  mover?: [number, number]; // desplazamiento final en %; si falta, lleva el foco al centro
  cursor?: Punto[];
  clics?: number[];
  marco?: { x: number; y: number; w: number; h: number; desde: number };
  entrada?: boolean;
}> = ({ src, url, dur, escala = [1, 1.08], foco = [50, 40], centrar, mover, cursor, clics = [], marco, entrada = true }) => {
  const f = useCurrentFrame();
  const e = entrada ? prog(f, 0, 26) : 1;
  const s = interpolate(f, [0, dur], escala, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });
  const pc = centrar ? prog(f, centrar[0], centrar[1] - centrar[0]) : 0;
  const tx = (mover ? mover[0] : 50 - foco[0]) * pc;
  const ty = (mover ? mover[1] : 50 - foco[1]) * pc;

  let cx = 0, cy = 0, verCursor = 0;
  if (cursor && cursor.length) {
    const fs = cursor.map((p) => p.f);
    cx = interpolate(f, fs, cursor.map((p) => p.x), { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });
    cy = interpolate(f, fs, cursor.map((p) => p.y), { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) });
    verCursor = prog(f, cursor[0].f - 10, 12);
  }
  const ANCHO = 1300;
  return (
    <div style={{ position: 'absolute', left: (1920 - ANCHO) / 2, top: 36, width: ANCHO, opacity: e, transform: `translateY(${(1 - e) * 24}px) scale(${0.97 + 0.03 * e})` }}>
      <div style={{ borderRadius: 18, overflow: 'hidden', background: C.marino, boxShadow: '0 40px 120px rgba(0,0,0,0.55), 0 0 0 1px rgba(180,195,214,0.14)' }}>
        <div style={{ height: 46, display: 'flex', alignItems: 'center', padding: '0 18px', background: '#0E2A49', borderBottom: '1px solid rgba(180,195,214,0.10)' }}>
          {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
            <div key={c} style={{ width: 13, height: 13, borderRadius: 7, background: c, opacity: 0.9, marginRight: 9 }} />
          ))}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <div style={{ fontSize: 17, color: C.tenue, background: 'rgba(5,13,28,0.55)', padding: '6px 22px', borderRadius: 9, letterSpacing: '-0.01em' }}>{url}</div>
          </div>
          <div style={{ width: 66 }} />
        </div>
        <div style={{ position: 'relative', width: ANCHO, height: ANCHO / 1.6, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, transformOrigin: `${foco[0]}% ${foco[1]}%`, transform: `translate(${tx}%, ${ty}%) scale(${s})` }}>
            <Img src={staticFile(src)} style={{ width: '100%', height: '100%', display: 'block' }} />
            {marco ? (() => {
              const pm = prog(f, marco.desde, 20);
              return (
                <div style={{ position: 'absolute', left: `${marco.x}%`, top: `${marco.y}%`, width: `${marco.w}%`, height: `${marco.h}%`, borderRadius: 14, border: `3px solid ${C.acento}`, opacity: pm, transform: `scale(${1.04 - 0.04 * pm})`, boxShadow: `0 0 0 9999px rgba(5,13,28,${0.42 * pm}), 0 0 40px rgba(169,157,254,0.45)` }} />
              );
            })() : null}
            {cursor ? (
              <div style={{ position: 'absolute', left: `${cx}%`, top: `${cy}%`, opacity: verCursor, transform: `scale(${1 / s})`, transformOrigin: '0 0' }}>
                {clics.map((c) => {
                  const pr = interpolate(f, [c, c + 22], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: curva });
                  const vis = f >= c && f <= c + 22 ? 1 : 0;
                  return <div key={c} style={{ position: 'absolute', left: -30, top: -30, width: 60, height: 60, borderRadius: 30, border: `3px solid ${C.acento}`, opacity: vis * (1 - pr), transform: `scale(${0.3 + pr})` }} />;
                })}
                <svg width="34" height="40" viewBox="0 0 34 40" style={{ position: 'absolute', left: -4, top: -3, filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))' }}>
                  <path d="M4 3 L4 31 L11.5 24.5 L16.5 36 L21.5 34 L16.5 22.5 L26.5 22.5 Z" fill="#FFFFFF" stroke="#0A2540" strokeWidth="2" strokeLinejoin="round" />
                </svg>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

/** Rótulo bajo la ventana. */
const Rotulo: React.FC<{ desde: number; hasta?: number; texto: React.ReactNode; sub?: React.ReactNode }> = ({ desde, hasta, texto, sub }) => (
  <div style={{ position: 'absolute', left: 0, right: 0, top: 918, textAlign: 'center' }}>
    <Frase desde={desde} hasta={hasta} dy={14}>
      <div style={{ fontSize: 46, fontWeight: 600, letterSpacing: '-0.025em', color: C.tinta }}>{texto}</div>
      {sub ? <div style={{ fontSize: 30, fontWeight: 500, color: C.tenue, marginTop: 10, letterSpacing: '-0.01em' }}>{sub}</div> : null}
    </Frase>
  </div>
);

const Toma: React.FC<{ dur: number; children: React.ReactNode }> = ({ dur, children }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 10, dur - 10, dur], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ opacity: o }}>{children}</AbsoluteFill>;
};

const Aviso: React.FC = () => (
  <div style={{ position: 'absolute', right: 34, bottom: 22, fontSize: 17, fontWeight: 500, color: C.tenue, opacity: 0.55, letterSpacing: '0' }}>
    Entorno de prueba · datos ficticios · Pulso no mueve dinero
  </div>
);

const URL = 'equipo404.produfy.co';

// ---------- Íconos de veredicto ----------
const Icono: React.FC<{ tipo: 'PAGAR' | 'FRENAR' | 'ESCALAR'; color: string }> = ({ tipo, color }) => (
  <svg width="96" height="96" viewBox="0 0 48 48" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    {tipo === 'PAGAR' && (<><circle cx="24" cy="24" r="19" /><path d="M15 24.5 L21.5 31 L33 18" /></>)}
    {tipo === 'FRENAR' && (<><path d="M17 5 H31 L43 17 V31 L31 43 H17 L5 31 V17 Z" /><path d="M15 24 H33" /></>)}
    {tipo === 'ESCALAR' && (<><path d="M13 33 V22 a11 11 0 0 1 22 0 V33 L38 37 H10 Z" /><path d="M20 41 a4 4 0 0 0 8 0" /></>)}
  </svg>
);

// ---------- Escenas ----------

const E1Apertura: React.FC = () => (
  <Centro>
    <LineaPulso desde={6} dur={50} />
    <Frase desde={48} style={{ ...titular, fontSize: 168, fontWeight: 700, letterSpacing: '-0.045em', marginTop: 10 }}>Pulso</Frase>
    <Frase desde={84} style={{ fontSize: 46, fontWeight: 500, color: C.tenue, letterSpacing: '-0.02em', marginTop: 14 }}>Pulso firme en cada pago</Frase>
  </Centro>
);

const E2Problema: React.FC = () => {
  const palabras = ['PDF.', 'Fotos.', 'Correos.', 'Chats.'];
  return (
    <>
      <Centro><Frase desde={8} hasta={120} style={titular}>Las facturas llegan por todos lados.</Frase></Centro>
      <Centro>
        <div style={{ display: 'flex', gap: 34 }}>
          {palabras.map((p, i) => (
            <Frase key={p} desde={134 + i * 16} hasta={250} style={{ ...titular, color: i % 2 ? C.tinta : C.acento }}>{p}</Frase>
          ))}
        </div>
      </Centro>
      <Centro><Frase desde={264} hasta={372} style={titular}>Alguien las revisa a mano.</Frase></Centro>
      <Centro>
        <Frase desde={386} style={titular}>
          Y un pago mal hecho <span style={{ color: C.frenar }}>no vuelve.</span>
        </Frase>
      </Centro>
    </>
  );
};

const E3QueEs: React.FC = () => {
  const v: { t: 'PAGAR' | 'FRENAR' | 'ESCALAR'; c: string }[] = [
    { t: 'PAGAR', c: C.pagar },
    { t: 'FRENAR', c: C.frenar },
    { t: 'ESCALAR', c: C.escalar },
  ];
  return (
    <>
      <Centro><Frase desde={6} hasta={96} style={titular}>Pulso lee cada factura con IA.</Frase></Centro>
      <Centro><Frase desde={108} hasta={196} style={titular}>Decide con tus reglas, en código.</Frase></Centro>
      <Centro>
        <div style={{ display: 'flex', gap: 110, alignItems: 'center' }}>
          {v.map((x, i) => (
            <Frase key={x.t} desde={210 + i * 28} hasta={352} dy={24}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26 }}>
                <Icono tipo={x.t} color={x.c} />
                <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: '-0.03em', color: x.c }}>{x.t}</div>
              </div>
            </Frase>
          ))}
        </div>
      </Centro>
      <Centro><Frase desde={366} style={titular}>Nunca mueve dinero.</Frase></Centro>
    </>
  );
};

const E4Portada: React.FC = () => (
  <>
    <Sequence durationInFrames={330}>
      <Toma dur={330}>
        <Ventana src="portada.png" url={URL} dur={330} escala={[1, 1.08]} foco={[55, 60]}
          cursor={[{ f: 90, x: 78, y: 55 }, { f: 190, x: 60, y: 86 }, { f: 330, x: 61, y: 86.5 }]}
          marco={{ x: 46.5, y: 76, w: 25.5, h: 21.5, desde: 200 }} />
        <Rotulo desde={30} hasta={185} texto="La portada de Pulso, con una empresa de prueba." sub="Aurora Cloud: 18 facturas, cada una con su decisión." />
        <Rotulo desde={205} texto="Te protegimos de pagar USD 9.200." sub="Cobros frenados antes de salir." />
      </Toma>
    </Sequence>
    <Sequence from={330} durationInFrames={270}>
      <Toma dur={270}>
        <Ventana src="portada.png" url={URL} dur={270} escala={[1.04, 1.5]} foco={[62, 84]} centrar={[0, 200]} mover={[-6, -7]} entrada={false} />
        <Rotulo desde={20} texto="Pulso decide. No envía dinero." sub="Lo que paga, lo que frena y lo que te pregunta, en una pantalla." />
      </Toma>
    </Sequence>
  </>
);

const E5Casos: React.FC = () => (
  <>
    <Sequence durationInFrames={220}>
      <Toma dur={220}>
        <Ventana src="f006.png" url={`${URL}/facturas/F-006`} dur={220} foco={[35, 35]}
          cursor={[{ f: 40, x: 60, y: 70 }, { f: 110, x: 27, y: 31.5 }, { f: 220, x: 28, y: 32 }]}
          marco={{ x: 21, y: 27, w: 77, h: 26, desde: 115 }} />
        <Rotulo desde={24} texto={<>Un cobro repetido. Pulso lo <span style={{ color: C.frenar }}>frena</span>.</>} sub="Y explica por qué, en palabras de finanzas." />
      </Toma>
    </Sequence>
    <Sequence from={220} durationInFrames={240}>
      <Toma dur={240}>
        <Ventana src="f011.png" url={`${URL}/facturas/F-011`} dur={240} foco={[50, 45]}
          cursor={[{ f: 40, x: 70, y: 70 }, { f: 120, x: 57, y: 47.5 }, { f: 240, x: 58, y: 48 }]}
          marco={{ x: 21.5, y: 43.5, w: 50, h: 6.5, desde: 125 }} />
        <Rotulo desde={24} texto={<>La cuenta se registró hace poco. Pulso <span style={{ color: C.escalar }}>pregunta</span>.</>} sub="Antes de pagar, una persona lo revisa." />
      </Toma>
    </Sequence>
    <Sequence from={460} durationInFrames={290}>
      <Toma dur={290}>
        <Ventana src="f016.png" url={`${URL}/facturas/F-016`} dur={290} foco={[50, 60]}
          cursor={[{ f: 40, x: 75, y: 30 }, { f: 110, x: 62, y: 47.5 }, { f: 180, x: 62, y: 47.5 }, { f: 240, x: 52, y: 84.5 }, { f: 290, x: 53, y: 85 }]}
          marco={{ x: 21.5, y: 43.5, w: 54, h: 6.5, desde: 115 }} />
        <Rotulo desde={24} texto="La factura trae una orden oculta para la IA." sub={<>Pulso la lee como dato y <span style={{ color: C.escalar }}>escala</span>.</>} />
      </Toma>
    </Sequence>
  </>
);

const E6Persona: React.FC = () => (
  <>
    <Sequence durationInFrames={200}>
      <Toma dur={200}>
        <Ventana src="cola.png" url={`${URL}/cola`} dur={200} foco={[50, 50]}
          cursor={[{ f: 40, x: 60, y: 35 }, { f: 110, x: 28, y: 47.5 }, { f: 200, x: 29, y: 48 }]}
          marco={{ x: 20.5, y: 41.5, w: 77.8, h: 43.5, desde: 110 }} />
        <Rotulo desde={24} texto="Solo lo escalado llega a una persona." sub="La bandeja muestra primero los de mayor monto." />
      </Toma>
    </Sequence>
    <Sequence from={200} durationInFrames={250}>
      <Toma dur={250}>
        <Ventana src="f016b.png" url={`${URL}/facturas/F-016`} dur={250} foco={[30, 60]}
          cursor={[{ f: 30, x: 55, y: 30 }, { f: 90, x: 27, y: 48.5 }, { f: 130, x: 27, y: 48.5 }, { f: 190, x: 30, y: 83 }, { f: 250, x: 30.5, y: 83.5 }]}
          clics={[95, 195]} />
        <Rotulo desde={24} texto="Una persona aprueba, con una nota." sub={<>Lo <span style={{ color: C.frenar }}>frenado</span> no tiene botón.</>} />
      </Toma>
    </Sequence>
  </>
);

const Burbuja: React.FC<{ desde: number; mia?: boolean; children: React.ReactNode }> = ({ desde, mia, children }) => (
  <Frase desde={desde} dy={16} style={{ display: 'flex', justifyContent: mia ? 'flex-end' : 'flex-start', marginBottom: 18 }}>
    <div style={{ maxWidth: 560, padding: '16px 20px', borderRadius: 18, borderBottomLeftRadius: mia ? 18 : 6, borderBottomRightRadius: mia ? 6 : 18, background: mia ? '#5B4FD9' : C.superficie, color: C.tinta, fontSize: 22, lineHeight: 1.42, whiteSpace: 'pre-line', letterSpacing: '-0.005em' }}>
      {children}
    </div>
  </Frase>
);

const E7Telegram: React.FC = () => {
  const f = useCurrentFrame();
  const escribe = f > 186 && f < 236 ? 1 : 0;
  const e = prog(f, 0, 26);
  return (
    <>
      <div style={{ position: 'absolute', left: 200, top: 90, width: 760, height: 860, borderRadius: 26, overflow: 'hidden', background: '#0B1E36', boxShadow: '0 40px 120px rgba(0,0,0,0.55), 0 0 0 1px rgba(180,195,214,0.14)', opacity: e, transform: `translateY(${(1 - e) * 24}px)` }}>
        <div style={{ height: 84, display: 'flex', alignItems: 'center', gap: 16, padding: '0 26px', background: '#10294A', borderBottom: '1px solid rgba(180,195,214,0.1)' }}>
          <div style={{ width: 48, height: 48, borderRadius: 24, background: `linear-gradient(120deg, ${C.firmaDesde}, ${C.firmaHasta})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="30" height="20" viewBox="0 0 30 20" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M1 10 H9 L12 3 L16 17 L19 10 H29" /></svg>
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 600, color: C.tinta }}>Pulso</div>
            <div style={{ fontSize: 17, color: C.tenue }}>bot</div>
          </div>
        </div>
        <div style={{ padding: '28px 26px' }}>
          <Burbuja desde={20}>
            {'Hay una factura que necesita tu aprobación (simulada).\n\nProveedor: Taller Orinoco C.A.\nFactura: TO-0016\nMonto: USD 1.190'}
          </Burbuja>
          <Frase desde={44} style={{ display: 'flex', gap: 10, marginTop: -8, marginBottom: 26, width: 560 }}>
            {['Aprobar', 'Rechazar'].map((b) => (
              <div key={b} style={{ flex: 1, textAlign: 'center', padding: '13px 0', borderRadius: 12, background: 'rgba(19,52,89,0.75)', color: C.tinta, fontSize: 21, fontWeight: 500 }}>{b}</div>
            ))}
          </Frase>
          <Burbuja desde={150} mia>Apruébala tú.</Burbuja>
          <div style={{ opacity: escribe, display: 'flex', gap: 7, padding: '18px 22px', background: C.superficie, borderRadius: 18, width: 86, marginBottom: 18 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: 5, background: C.tenue, opacity: 0.4 + 0.6 * Math.abs(Math.sin((f + i * 6) / 6)) }} />
            ))}
          </div>
          <div style={{ marginTop: escribe ? -64 : -64 }}>
            <Burbuja desde={236}>
              {'No puedo aprobar facturas. Una factura escalada la aprueba solo el dueño de la empresa, con el botón que recibió. Yo converso y explico.'}
            </Burbuja>
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 200, top: 966, width: 760, textAlign: 'center', fontSize: 17, color: C.tenue, opacity: 0.6 * e }}>
        Recreación de la ventana del bot con sus textos
      </div>
      <div style={{ position: 'absolute', left: 1080, top: 0, bottom: 0, width: 700, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <Frase desde={270} style={{ ...titular, fontSize: 84 }}>El chat conversa.</Frase>
        <Frase desde={300} style={{ ...titular, fontSize: 84, color: C.acento }}>Nunca aprueba.</Frase>
        <Frase desde={340} style={{ fontSize: 30, fontWeight: 500, color: C.tenue, marginTop: 28, lineHeight: 1.4 }}>Aprobar se hace solo con el botón de una persona.</Frase>
      </div>
    </>
  );
};

const Cifra: React.FC<{ hasta: number; desde: number; dur?: number; color?: string; tamano?: number }> = ({ hasta, desde, dur = 50, color = C.tinta, tamano = 300 }) => {
  const f = useCurrentFrame();
  const v = Math.round(interpolate(f, [desde, desde + dur], [0, hasta], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }));
  return <span style={{ fontSize: tamano, fontWeight: 700, letterSpacing: '-0.05em', color, fontVariantNumeric: 'tabular-nums' }}>{v}</span>;
};

const Bloque: React.FC<{ desde: number; hasta?: number; cifra: React.ReactNode; rotulo: string; sub: string }> = ({ desde, hasta, cifra, rotulo, sub }) => (
  <Centro style={{ paddingBottom: 60 }}>
    <Frase desde={desde} hasta={hasta} dy={24}>
      <div style={{ lineHeight: 1 }}>{cifra}</div>
      <div style={{ fontSize: 60, fontWeight: 600, letterSpacing: '-0.03em', color: C.tinta, marginTop: 18 }}>{rotulo}</div>
      <div style={{ fontSize: 30, fontWeight: 500, color: C.tenue, marginTop: 16 }}>{sub}</div>
    </Frase>
  </Centro>
);

const E8Prueba: React.FC = () => (
  <>
    <Bloque desde={10} hasta={236}
      cifra={<><Cifra hasta={25} desde={14} /><span style={{ fontSize: 120, fontWeight: 600, color: C.tenue, letterSpacing: '-0.03em' }}> de 30</span></>}
      rotulo="decididas sin persona" sub="83,3 % en el set ciego 2 · ningún pago indebido" />
    <Bloque desde={252} hasta={486}
      cifra={<span style={{ fontSize: 300, fontWeight: 700, letterSpacing: '-0.05em', color: C.pagar }}>0</span>}
      rotulo="pagos indebidos" sub="En el set ciego 2, en 10 documentos ciegos y en 62 filas externas." />
    <Bloque desde={502}
      cifra={<Cifra hasta={728} desde={506} dur={60} />}
      rotulo="pruebas" sub="Y 37 escenarios en Telegram, sin un solo pago." />
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 70, textAlign: 'center' }}>
      <Frase desde={30} style={{ fontSize: 24, fontWeight: 500, color: C.tenue, opacity: 0.75 }}>
        Set ciego: facturas que el equipo no había visto, congeladas antes de correr.
      </Frase>
    </div>
  </>
);

const E9Registro: React.FC = () => (
  <>
    <Ventana src="registro.png" url={`${URL}/registro`} dur={360} foco={[40, 35]}
      cursor={[{ f: 50, x: 60, y: 70 }, { f: 130, x: 28, y: 44.5 }, { f: 360, x: 28.5, y: 45 }]}
      clics={[140]} marco={{ x: 20.3, y: 29.3, w: 78.2, h: 10.6, desde: 160 }} />
    <Rotulo desde={24} texto="Cada decisión queda encadenada." sub="Si alguien la altera, se nota." />
  </>
);

const E10Cierre: React.FC = () => (
  <>
    <Centro>
      {[
        { t: 'La IA lee.', c: C.tinta, d: 8 },
        { t: 'El código decide.', c: C.acento, d: 34 },
        { t: 'Una persona aprueba.', c: C.tinta, d: 60 },
      ].map((x) => (
        <Frase key={x.t} desde={x.d} hasta={190} style={{ ...titular, fontSize: 104, color: x.c }}>{x.t}</Frase>
      ))}
    </Centro>
    <Centro>
      <LineaPulso desde={204} dur={44} />
      <Frase desde={236} style={{ ...titular, fontSize: 150, fontWeight: 700, letterSpacing: '-0.045em', marginTop: 6 }}>Pulso</Frase>
      <Frase desde={262} style={{ fontSize: 40, fontWeight: 500, color: C.tinta, marginTop: 16, letterSpacing: '-0.01em' }}>{URL}</Frase>
      <Frase desde={280} style={{ fontSize: 28, fontWeight: 500, color: C.tenue, marginTop: 14 }}>Equipo 404 · Hackathon 30X</Frase>
    </Centro>
  </>
);

// ---------- Línea de tiempo ----------
export const ESCENAS: { nombre: string; dur: number; C: React.FC; aviso?: boolean }[] = [
  { nombre: 'Apertura', dur: 240, C: E1Apertura },
  { nombre: 'Problema', dur: 510, C: E2Problema },
  { nombre: 'Qué es', dur: 450, C: E3QueEs },
  { nombre: 'Demo portada', dur: 600, C: E4Portada, aviso: true },
  { nombre: 'FRENAR y ESCALAR', dur: 750, C: E5Casos, aviso: true },
  { nombre: 'Una persona aprueba', dur: 450, C: E6Persona, aviso: true },
  { nombre: 'Telegram', dur: 450, C: E7Telegram, aviso: true },
  { nombre: 'Prueba', dur: 750, C: E8Prueba },
  { nombre: 'Registro', dur: 360, C: E9Registro, aviso: true },
  { nombre: 'Cierre', dur: 390, C: E10Cierre },
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
            <Escena dur={e.dur}>
              <e.C />
              {e.aviso ? <Aviso /> : null}
            </Escena>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
