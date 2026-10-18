import React from 'react';
import {Img, staticFile} from 'remotion';

type Props = {
  src: string;
  width?: number;
  rotY?: number;
  rotX?: number;
  screenScroll?: number;
  glow?: string;
};

// Filas del teclado: anchos relativos de cada tecla.
const FILAS: number[][] = [
  Array(14).fill(1),
  [...Array(13).fill(1), 1.5],
  [1.5, ...Array(12).fill(1), 1],
  [1.8, ...Array(11).fill(1), 1.8],
  [2.3, ...Array(10).fill(1), 2.3],
  [1, 1, 1, 1.25, 5.6, 1.25, 1, 1, 1, 1],
];

const pos: React.CSSProperties = {position: 'absolute', left: 0, top: 0};

export const MacBookPro: React.FC<Props> = ({
  src,
  width = 1300,
  rotY = -18,
  rotX = 8,
  screenScroll = 0,
  glow = '#7c6cff',
}) => {
  const W = width;
  const b = W * 0.016; // bisel
  const chin = W * 0.026;
  const Sw = W - 2 * b;
  const Sh = (Sw * 10) / 16;
  const H = Sh + b + chin; // alto de la tapa
  const D = W * 0.68; // fondo de la base
  const t = W * 0.016; // grosor de la base
  const lt = W * 0.008; // grosor de la tapa
  const R = W * 0.02;
  const abre = 12; // tapa a 102 grados de la base
  const brillo = 50 - rotY * 2.5;

  return (
    <div
      style={{
        position: 'relative',
        width: W,
        height: H + D * 0.3,
        perspective: W * 3.2,
        perspectiveOrigin: '50% 10%',
      }}
    >
      <div
        style={{
          ...pos,
          top: D * 0.04,
          width: W,
          height: H,
          transformStyle: 'preserve-3d',
          transformOrigin: `50% 100% ${D / 2}px`,
          transform: `rotateX(${-rotX}deg) rotateY(${rotY}deg)`,
        }}
      >
        {/* BASE */}
        <div style={{...pos, top: H, width: W, height: 0, transformStyle: 'preserve-3d'}}>
          {/* sombra de contacto */}
          <div
            style={{
              ...pos,
              top: t + 1,
              left: -W * 0.07,
              width: W * 1.14,
              height: D * 1.12,
              transformOrigin: '50% 0',
              transform: `rotateX(90deg) translateY(${-D * 0.04}px)`,
              background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.85) 35%, rgba(0,0,0,0) 70%)',
              filter: `blur(${W * 0.022}px)`,
            }}
          />
          {/* cara superior */}
          <div
            style={{
              ...pos,
              width: W,
              height: D,
              borderRadius: R * 0.7,
              transformOrigin: '50% 0',
              transform: 'rotateX(90deg)',
              background:
                'linear-gradient(180deg,#2c2f35 0%,#212328 40%,#17181c 100%)',
              boxShadow: 'inset 0 0 0 1.5px rgba(150,156,168,0.28)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                ...pos,
                width: '100%',
                height: '100%',
                background: `conic-gradient(from 210deg at 70% 20%, rgba(255,255,255,0.05), rgba(255,255,255,0) 25%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0) 75%, rgba(255,255,255,0.05))`,
              }}
            />
            <div
              style={{
                ...pos,
                width: '100%',
                height: '100%',
                background: `radial-gradient(ellipse 60% 45% at 50% 0%, ${glow}33, ${glow}00)`,
              }}
            />
            {/* bisagra */}
            <div style={{...pos, left: W * 0.12, width: W * 0.76, height: D * 0.025, background: 'linear-gradient(180deg,#08090a,#1d1f23)'}} />
            {/* altavoces */}
            {[W * 0.03, W * 0.895].map((x) => (
              <div
                key={x}
                style={{
                  ...pos,
                  left: x,
                  top: D * 0.06,
                  width: W * 0.075,
                  height: D * 0.42,
                  backgroundImage: 'radial-gradient(circle, #050506 38%, rgba(0,0,0,0) 42%)',
                  backgroundSize: `${W * 0.006}px ${W * 0.006}px`,
                  opacity: 0.9,
                }}
              />
            ))}
            {/* teclado */}
            <div
              style={{
                ...pos,
                left: W * 0.125,
                top: D * 0.06,
                width: W * 0.75,
                height: D * 0.43,
                background: '#0b0c0e',
                borderRadius: R * 0.3,
                padding: W * 0.005,
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                gap: W * 0.004,
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.8)',
              }}
            >
              {FILAS.map((fila, i) => (
                <div key={i} style={{display: 'flex', gap: W * 0.004, flex: i === 0 ? 0.6 : 1}}>
                  {fila.map((g, j) => (
                    <div
                      key={j}
                      style={{
                        flex: g,
                        borderRadius: W * 0.0025,
                        background: 'linear-gradient(180deg,#1b1c20 0%,#111215 100%)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), 0 1px 1px rgba(0,0,0,0.7)',
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
            {/* trackpad */}
            <div
              style={{
                ...pos,
                left: W * 0.28,
                top: D * 0.54,
                width: W * 0.44,
                height: D * 0.38,
                borderRadius: R * 0.5,
                background: 'linear-gradient(180deg,#25272c,#1c1d21)',
                boxShadow: 'inset 0 0 0 1px rgba(160,166,178,0.22), inset 0 2px 3px rgba(0,0,0,0.5)',
              }}
            />
          </div>
          {/* canto frontal */}
          <div
            style={{
              ...pos,
              width: W,
              height: t,
              transform: `translateZ(${D}px)`,
              borderRadius: `0 0 ${R}px ${R}px`,
              background: 'linear-gradient(180deg,#6a707a 0%,#30333a 16%,#18191d 60%,#0c0d0f 100%)',
            }}
          >
            <div style={{position: 'absolute', left: '50%', top: 0, width: W * 0.11, height: t * 0.45, transform: 'translateX(-50%)', borderRadius: `0 0 ${t}px ${t}px`, background: 'linear-gradient(180deg,#0b0c0e,#202227)'}} />
          </div>
          {/* cantos laterales */}
          {[0, W].map((x) => (
            <div
              key={x}
              style={{
                ...pos,
                left: x,
                width: D,
                height: t,
                transformOrigin: '0 0',
                transform: 'rotateY(-90deg)',
                background: 'linear-gradient(180deg,#5d636d 0%,#2a2c32 20%,#121316 100%)',
              }}
            />
          ))}
        </div>

        {/* TAPA */}
        <div
          style={{
            ...pos,
            width: W,
            height: H,
            transformStyle: 'preserve-3d',
            transformOrigin: '50% 100%',
            transform: `rotateX(${abre}deg)`,
          }}
        >
          {/* cantos de la tapa */}
          {[0, W].map((x) => (
            <div
              key={x}
              style={{
                ...pos,
                left: x,
                width: lt,
                height: H,
                transformOrigin: '0 50%',
                transform: 'rotateY(90deg)',
                background: 'linear-gradient(90deg,#5b616b,#24262b)',
              }}
            />
          ))}
          <div
            style={{
              ...pos,
              width: W,
              height: lt,
              transformOrigin: '50% 0',
              transform: 'rotateX(-90deg)',
              background: 'linear-gradient(180deg,#6b717b,#2a2c31)',
            }}
          />
          {/* dorso */}
          <div
            style={{
              ...pos,
              width: W,
              height: H,
              borderRadius: R,
              transform: `translateZ(${-lt}px)`,
              background: 'linear-gradient(160deg,#2e3137,#17181c)',
            }}
          />
          {/* frente: bisel y pantalla */}
          <div
            style={{
              ...pos,
              width: W,
              height: H,
              borderRadius: `${R}px ${R}px ${R * 0.4}px ${R * 0.4}px`,
              background: '#040405',
              boxShadow: 'inset 0 0 0 2px #3b3f47, inset 0 0 0 3px #0a0a0b',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: b,
                top: b,
                width: Sw,
                height: Sh,
                overflow: 'hidden',
                borderRadius: R * 0.45,
                background: '#071224',
              }}
            >
              <Img
                src={staticFile(src)}
                style={{
                  display: 'block',
                  width: '100%',
                  height: 'auto',
                  minHeight: '100%',
                  objectFit: 'cover',
                  objectPosition: 'top center',
                  transform: `translateY(${-screenScroll}px)`,
                }}
              />
              {/* reflejo especular */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage:
                    'linear-gradient(115deg, rgba(255,255,255,0) 38%, rgba(255,255,255,0.06) 47%, rgba(255,255,255,0.025) 52%, rgba(255,255,255,0) 60%)',
                  backgroundSize: '240% 100%',
                  backgroundPosition: `${brillo}% 0`,
                }}
              />
              <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(0,0,0,0) 30%, rgba(0,0,0,0.12))'}} />
            </div>
            {/* notch */}
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: b * 0.9,
                width: W * 0.085,
                height: b * 1.4,
                transform: 'translateX(-50%)',
                background: '#040405',
                borderRadius: `0 0 ${b * 0.55}px ${b * 0.55}px`,
              }}
            >
              <div style={{position: 'absolute', left: '50%', top: b * 0.35, width: b * 0.45, height: b * 0.45, transform: 'translateX(-50%)', borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #2a3550, #050608 70%)'}} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
