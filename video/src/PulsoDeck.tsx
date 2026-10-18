import React from 'react';
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { escenas, beat, COLORES as C, TOTAL_FRAMES, type Escena } from './deck/guion';
import { Icono } from './deck/iconos';
import { MacBookPro } from './devices/MacBookPro';
import { IPhone18ProMax } from './devices/IPhone18ProMax';
import { IPad } from './devices/IPad';
import { Suelo, Luz } from './devices/Escena';

const { fontFamily } = loadFont('normal', { weights: ['400', '500', '600', '700', '800'], subsets: ['latin', 'latin-ext'] });

export const DURACION_DECK = TOTAL_FRAMES;
const BEAT = 1800 / 123;
const SPR = { damping: 12, stiffness: 180 };

const useSpring = (delay = 0, config = SPR) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config });
};

const tam = (t: string) => (t.length <= 10 ? 180 : t.length <= 20 ? 140 : t.length <= 28 ? 120 : 104);

// Texto gigante que entra por palabras escalonadas cada 2 fotogramas
const Palabras: React.FC<{ texto: string; size: number; color?: string; delay?: number; weight?: number }> = ({ texto, size, color = C.texto, delay = 0, weight = 700 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ fontSize: size, fontWeight: weight, letterSpacing: '-0.03em', lineHeight: 1.02, color, textAlign: 'center', maxWidth: 1700, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', columnGap: size * 0.26 }}>
      {texto.split(' ').map((p, i) => {
        const s = spring({ frame: frame - delay - i * 2, fps, config: SPR });
        return (
          <span key={i} style={{ display: 'inline-block', opacity: Math.min(1, s * 1.5), transform: `translateY(${(1 - s) * 60}px) scale(${0.85 + 0.15 * s})` }}>{p}</span>
        );
      })}
    </div>
  );
};

const Sub: React.FC<{ texto?: string; delay?: number; color?: string; size?: number }> = ({ texto, delay = 8, color = 'rgba(245,248,255,0.78)', size = 52 }) => {
  const s = useSpring(delay);
  if (!texto) return null;
  return <div style={{ fontSize: size, fontWeight: 500, letterSpacing: '-0.01em', color, opacity: s, transform: `translateY(${(1 - s) * 30}px)`, textAlign: 'center', marginTop: 28, maxWidth: 1600 }}>{texto}</div>;
};

const IconoPop: React.FC<{ nombre: string; delay?: number; color?: string; size?: number; ring?: boolean }> = ({ nombre, delay = 0, color = C.violeta, size = 130, ring = true }) => {
  const s = useSpring(delay, { damping: 7, stiffness: 200 });
  const box = size * 1.6;
  return (
    <div style={{ width: box, height: box, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${Math.max(0, s)})`, background: ring ? `radial-gradient(circle, ${color}33 0%, ${color}10 70%)` : 'transparent', border: ring ? `3px solid ${color}aa` : 'none', boxShadow: ring ? `0 0 60px ${color}55` : 'none' }}>
      <Icono nombre={nombre} size={size} color={color} strokeWidth={1.8} />
    </div>
  );
};

const Rotulo: React.FC<{ texto: string }> = ({ texto }) => (
  <div style={{ position: 'absolute', right: 48, bottom: 36, fontSize: 24, fontWeight: 500, color: 'rgba(245,248,255,0.62)', letterSpacing: '0.01em', background: 'rgba(7,18,36,0.6)', padding: '8px 16px', borderRadius: 10 }}>{texto}</div>
);

const Centro: React.FC<{ children: React.ReactNode; gap?: number }> = ({ children, gap = 0 }) => (
  <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap, padding: '0 110px' }}>{children}</AbsoluteFill>
);

const EscenaTexto: React.FC<{ e: Escena }> = ({ e }) => {
  const esLogo = e.id === 'solucion';
  return (
    <Centro>
      {e.iconos?.[0] && <div style={{ marginBottom: 36 }}><IconoPop nombre={e.iconos[0]} color={e.color ?? C.violeta} size={esLogo ? 150 : 110} /></div>}
      <Palabras texto={e.titulo ?? ''} size={esLogo ? 220 : tam(e.titulo ?? '')} delay={3} color={esLogo ? C.texto : C.texto} weight={esLogo ? 800 : 700} />
      <Sub texto={e.subtitulo} delay={10} color={esLogo ? C.violeta : undefined} size={esLogo ? 64 : 52} />
    </Centro>
  );
};

const EscenaIconos: React.FC<{ e: Escena; dur: number }> = ({ e, dur }) => {
  const iconos = e.iconos ?? [];
  const etiquetas = (e.etiqueta ?? '').split('|');
  const paso = dur / Math.max(1, iconos.length);
  const titulo = e.titulo ?? '';
  return (
    <Centro>
      <Palabras texto={titulo} size={Math.min(120, tam(titulo))} />
      <Sub texto={e.subtitulo} delay={6} size={46} />
      <div style={{ display: 'flex', gap: iconos.length > 3 ? 70 : 120, marginTop: 70, alignItems: 'flex-start' }}>
        {iconos.map((n, i) => (
          <Item key={i} nombre={n} etiqueta={etiquetas[i]} delay={Math.round(i * paso * (e.id === 'como-funciona' ? 1 : 0.5)) + 4} />
        ))}
      </div>
    </Centro>
  );
};

const Item: React.FC<{ nombre: string; etiqueta?: string; delay: number }> = ({ nombre, etiqueta, delay }) => {
  const s = useSpring(delay + 4);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 330 }}>
      <IconoPop nombre={nombre} delay={delay} size={100} />
      {etiqueta && <div style={{ marginTop: 26, fontSize: 40, fontWeight: 600, color: C.texto, opacity: s, transform: `translateY(${(1 - s) * 20}px)`, textAlign: 'center', letterSpacing: '-0.01em', lineHeight: 1.15 }}>{etiqueta}</div>}
    </div>
  );
};

const EscenaVeredicto: React.FC<{ e: Escena }> = ({ e }) => {
  const frame = useCurrentFrame();
  const flash = interpolate(frame, [0, 6], [1, 0], { extrapolateRight: 'clamp' });
  const color = e.color ?? C.violeta;
  return (
    <>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 50%, ${color}30 0%, transparent 60%)` }} />
      <Centro>
        <IconoPop nombre={e.iconos?.[0] ?? 'check'} color={color} size={130} delay={2} />
        <div style={{ height: 30 }} />
        <Palabras texto={e.titulo ?? ''} size={200} color={color} delay={3} weight={800} />
        <Sub texto={e.subtitulo} delay={9} size={60} color={C.texto} />
      </Centro>
      <AbsoluteFill style={{ background: color, opacity: flash }} />
    </>
  );
};

const EscenaCifra: React.FC<{ e: Escena }> = ({ e }) => {
  const frame = useCurrentFrame();
  const raw = e.cifra ?? '';
  const m = raw.match(/^(\d+)(.*)$/);
  const n = m ? parseInt(m[1], 10) : 0;
  const resto = m ? m[2] : raw;
  const v = Math.round(interpolate(frame, [0, 12], [0, n], { extrapolateRight: 'clamp' }));
  const s = useSpring(0);
  const color = e.color ?? C.violeta;
  return (
    <Centro>
      <div style={{ fontSize: 260, fontWeight: 800, letterSpacing: '-0.04em', color, lineHeight: 1, transform: `scale(${0.85 + 0.15 * s})`, fontVariantNumeric: 'tabular-nums', textShadow: `0 0 80px ${color}55` }}>{m ? `${v}${resto}` : raw}</div>
      <Sub texto={e.etiqueta} delay={5} size={66} color={C.texto} />
      <Sub texto={e.subtitulo} delay={9} size={38} />
    </Centro>
  );
};

const Titular: React.FC<{ e: Escena }> = ({ e }) => {
  const s = useSpring(2);
  return (
    <div style={{ position: 'absolute', top: 56, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: s, transform: `translateY(${(1 - s) * -30}px)` }}>
      {e.etiqueta && <div style={{ fontSize: 30, fontWeight: 700, color: e.color ?? C.violeta, letterSpacing: '0.08em', marginBottom: 6 }}>{e.etiqueta}</div>}
      <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: '-0.03em', color: C.texto }}>{e.titulo}</div>
      {e.subtitulo && <div style={{ fontSize: 38, fontWeight: 500, color: e.color ?? 'rgba(245,248,255,0.75)', marginTop: 4 }}>{e.subtitulo}</div>}
    </div>
  );
};

const EscenaDispositivo: React.FC<{ e: Escena; dur: number }> = ({ e, dur }) => {
  const frame = useCurrentFrame();
  const ent = useSpring(0);
  const mitad = Math.round(dur / 2);
  const orbita = interpolate(frame, [0, dur], [-6, 6]);
  const dy = (1 - ent) * 700;
  const rx = (1 - ent) * 28;
  const rz = (1 - ent) * -6;
  const src = e.imagen2 && frame >= mitad && e.dispositivo !== 'mac+ipad' ? e.imagen2 : e.imagen ?? 'portada.png';
  const conTitulo = !!e.titulo;
  const entIpad = spring({ frame: frame - mitad, fps: 30, config: SPR });
  return (
    <>
      <AbsoluteFill><Luz color={e.color ?? C.violeta} /></AbsoluteFill>
      <AbsoluteFill><Suelo /></AbsoluteFill>
      {e.dispositivo === 'iphone' ? (
        <AbsoluteFill style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 120 }}>
          <div style={{ width: 760, display: 'flex', flexDirection: 'column' }}>
            <Palabras texto={e.titulo ?? ''} size={104} delay={3} />
            <Sub texto={e.subtitulo} delay={9} color={e.color} size={54} />
          </div>
          <div style={{ transform: `translateY(${dy + 30}px) rotateZ(${rz}deg)` }}>
            <IPhone18ProMax src={src} height={900} rotY={-14 + orbita * -1 + 14 * 0} rotX={4 + rx} />
          </div>
          <Rotulo texto="Captura real del bot · Datos ficticios · Pulso no mueve dinero" />
        </AbsoluteFill>
      ) : e.dispositivo === 'mac+ipad' ? (
        <AbsoluteFill>
          {conTitulo && <Titular e={e} />}
          <div style={{ position: 'absolute', left: 120, top: 200, transform: `translateY(${dy}px) rotateZ(${rz}deg)` }}>
            <MacBookPro src={e.imagen ?? 'registro.png'} width={1000} rotY={-18 + orbita} rotX={8 + rx} />
          </div>
          {frame >= mitad - 1 && (
            <div style={{ position: 'absolute', right: 110, top: 430, transform: `translateY(${(1 - entIpad) * 600}px) scale(${0.85 + 0.15 * entIpad})` }}>
              <IPad src={e.imagen2 ?? 'portada.png'} width={720} rotY={-10 - orbita} rotX={6 + (1 - entIpad) * 20} />
            </div>
          )}
          <Rotulo texto="Datos ficticios · Pulso no mueve dinero" />
        </AbsoluteFill>
      ) : (
        <AbsoluteFill>
          {conTitulo && <Titular e={e} />}
          <div style={{ position: 'absolute', left: (1920 - 1060) / 2, top: e.subtitulo ? 250 : 210, transform: `translateY(${dy}px) rotateZ(${rz}deg)` }}>
            <MacBookPro src={src} width={1060} rotY={-14 + orbita} rotX={8 + rx} glow={e.color ?? C.violeta} />
          </div>
          <Rotulo texto="Datos ficticios · Pulso no mueve dinero" />
        </AbsoluteFill>
      )}
    </>
  );
};

const EscenaCierre: React.FC<{ e: Escena }> = ({ e }) => (
  <Centro>
    <IconoPop nombre="pulso" color={C.violeta} size={160} />
    <div style={{ height: 20 }} />
    <Palabras texto={e.titulo ?? 'Pulso'} size={220} delay={4} weight={800} />
    <Sub texto={e.subtitulo} delay={12} size={72} color={C.texto} />
    <Sub texto={e.etiqueta} delay={22} size={34} color={C.violeta} />
    <Sub texto="Datos ficticios · Pulso no mueve dinero" delay={30} size={24} />
  </Centro>
);

const Fondo: React.FC = () => {
  const frame = useCurrentFrame();
  const t = (frame % BEAT) / BEAT;
  const pulso = 1 + 0.06 * Math.exp(-t * 5);
  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${C.fondoDesde} 0%, ${C.fondoHasta} 100%)` }}>
      <AbsoluteFill style={{ transform: `scale(${pulso})`, background: `radial-gradient(ellipse 55% 50% at 50% 45%, ${C.violeta}38 0%, ${C.violeta}10 45%, transparent 75%)` }} />
    </AbsoluteFill>
  );
};

// Barrido rápido de 8 fotogramas en escenas impares; corte seco en las pares
const Barrido: React.FC<{ activo: boolean; children: React.ReactNode }> = ({ activo, children }) => {
  const frame = useCurrentFrame();
  if (!activo) return <>{children}</>;
  const p = interpolate(frame, [0, 8], [100, 0], { extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ clipPath: `inset(0 ${p}% 0 0)` }}>{children}</AbsoluteFill>;
};

const Render: React.FC<{ e: Escena; dur: number }> = ({ e, dur }) => {
  switch (e.tipo) {
    case 'texto': return <EscenaTexto e={e} />;
    case 'iconos': return <EscenaIconos e={e} dur={dur} />;
    case 'veredicto': return <EscenaVeredicto e={e} />;
    case 'cifra': return <EscenaCifra e={e} />;
    case 'dispositivo': return <EscenaDispositivo e={e} dur={dur} />;
    case 'cierre': return <EscenaCierre e={e} />;
  }
  return null;
};

export const PulsoDeck: React.FC = () => (
  <AbsoluteFill style={{ fontFamily, color: C.texto, backgroundColor: C.fondoDesde }}>
    <Fondo />
    {escenas.map((e, i) => {
      const desde = beat(e.desdeBeat);
      const dur = beat(e.desdeBeat + e.beats) - desde;
      const barrido = i % 2 === 1 && e.tipo !== 'veredicto';
      return (
        <Sequence key={e.id} from={desde} durationInFrames={dur} name={e.id}>
          <Barrido activo={barrido}><Render e={e} dur={dur} /></Barrido>
        </Sequence>
      );
    })}
  </AbsoluteFill>
);
