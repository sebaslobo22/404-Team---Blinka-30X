import React from 'react';
import {Img, staticFile} from 'remotion';

type Props = {
  src: string;
  height?: number;
  rotY?: number;
  rotX?: number;
  screenScroll?: number;
};

const CAPAS = 18;

export const IPhone18ProMax: React.FC<Props> = ({src, height = 900, rotY = 14, rotX = 4, screenScroll = 0}) => {
  const Hh = height;
  const w = Hh * 0.476;
  const T = w * 0.11; // grosor
  const r = w * 0.2;
  const aro = w * 0.018;
  const bez = w * 0.026;
  const brillo = 50 - rotY * 3;
  const bw = w * 0.014; // relieve de botones

  const botonesIzq = [
    {top: 0.19, h: 0.035},
    {top: 0.27, h: 0.07},
    {top: 0.36, h: 0.07},
  ];
  const botonesDer = [
    {top: 0.29, h: 0.1},
    {top: 0.6, h: 0.055},
  ];

  return (
    <div style={{position: 'relative', width: w, height: Hh, perspective: Hh * 3}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transformStyle: 'preserve-3d',
          transform: `rotateX(${-rotX}deg) rotateY(${rotY}deg)`,
        }}
      >
        {/* sombra de contacto */}
        <div
          style={{
            position: 'absolute',
            left: '-10%',
            top: Hh - 2,
            width: '120%',
            height: T * 6,
            transformOrigin: '50% 0',
            transform: `rotateX(90deg) translateY(${-T * 3}px)`,
            background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.8) 25%, rgba(0,0,0,0) 70%)',
            filter: `blur(${w * 0.03}px)`,
          }}
        />
        {Array.from({length: CAPAS - 1}).map((_, i) => {
          const z = -T / 2 + (T * i) / (CAPAS - 1);
          const l = 14 + 30 * Math.sin((Math.PI * i) / (CAPAS - 1));
          const medio = i >= 6 && i <= 11;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: r,
                transform: `translateZ(${z}px)`,
                background:
                  i === 0
                    ? 'linear-gradient(160deg,#2a2b2f,#141518)'
                    : `linear-gradient(90deg, hsl(225,5%,${l * 0.8}%), hsl(225,6%,${l}%) 18%, hsl(225,5%,${l * 0.75}%) 50%, hsl(225,6%,${l}%) 82%, hsl(225,5%,${l * 0.8}%))`,
              }}
            >
              {medio &&
                botonesIzq.map((bt) => (
                  <div key={bt.top} style={{position: 'absolute', left: -bw, top: Hh * bt.top, width: bw * 1.5, height: Hh * bt.h, borderRadius: bw, background: `linear-gradient(90deg, hsl(225,6%,${l + 14}%), hsl(225,5%,${l}%))`}} />
                ))}
              {medio &&
                botonesDer.map((bt) => (
                  <div key={bt.top} style={{position: 'absolute', right: -bw, top: Hh * bt.top, width: bw * 1.5, height: Hh * bt.h, borderRadius: bw, background: `linear-gradient(270deg, hsl(225,6%,${l + 10}%), hsl(225,5%,${l}%))`}} />
                ))}
            </div>
          );
        })}
        {/* frente */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: r,
            transform: `translateZ(${T / 2}px)`,
            padding: aro,
            boxSizing: 'border-box',
            background: 'linear-gradient(135deg,#6d7079 0%,#2f3136 30%,#4a4d55 55%,#1f2024 100%)',
          }}
        >
          <div style={{width: '100%', height: '100%', borderRadius: r - aro, background: '#030304', padding: bez, boxSizing: 'border-box'}}>
            <div style={{position: 'relative', width: '100%', height: '100%', borderRadius: r - aro - bez, overflow: 'hidden', background: '#071224'}}>
              <Img
                src={staticFile(src)}
                style={{display: 'block', width: '100%', height: 'auto', minHeight: '100%', objectFit: 'cover', objectPosition: 'top center', transform: `translateY(${-screenScroll}px)`}}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: 'linear-gradient(115deg, rgba(255,255,255,0) 36%, rgba(255,255,255,0.06) 46%, rgba(255,255,255,0.02) 52%, rgba(255,255,255,0) 60%)',
                  backgroundSize: '260% 100%',
                  backgroundPosition: `${brillo}% 0`,
                }}
              />
              {/* Dynamic Island */}
              <div style={{position: 'absolute', left: '50%', top: w * 0.03, width: w * 0.3, height: w * 0.088, transform: 'translateX(-50%)', borderRadius: w, background: '#000'}}>
                <div style={{position: 'absolute', right: w * 0.03, top: '50%', width: w * 0.04, height: w * 0.04, transform: 'translateY(-50%)', borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #26304a, #000 70%)'}} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
