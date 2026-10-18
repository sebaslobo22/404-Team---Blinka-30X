import React from 'react';
import {Img, staticFile} from 'remotion';

type Props = {
  src: string;
  width?: number;
  rotY?: number;
  rotX?: number;
  landscape?: boolean;
};

const CAPAS = 12;

export const IPad: React.FC<Props> = ({src, width = 900, rotY = 10, rotX = 6, landscape = true}) => {
  const lado = width;
  const W = lado;
  const H = landscape ? lado / 1.307 : lado * 1.307;
  const base = landscape ? W : H;
  const T = base * 0.022;
  const r = base * 0.04;
  const aro = base * 0.006;
  const bez = base * 0.03;
  const brillo = 50 - rotY * 3;

  return (
    <div style={{position: 'relative', width: W, height: H, perspective: Math.max(W, H) * 2.6}}>
      <div style={{position: 'absolute', inset: 0, transformStyle: 'preserve-3d', transform: `rotateX(${-rotX}deg) rotateY(${rotY}deg)`}}>
        <div
          style={{
            position: 'absolute',
            left: '-6%',
            top: H - 2,
            width: '112%',
            height: T * 10,
            transformOrigin: '50% 0',
            transform: `rotateX(90deg) translateY(${-T * 5}px)`,
            background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.8) 25%, rgba(0,0,0,0) 70%)',
            filter: `blur(${base * 0.02}px)`,
          }}
        />
        {Array.from({length: CAPAS - 1}).map((_, i) => {
          const z = -T / 2 + (T * i) / (CAPAS - 1);
          const l = 18 + 34 * Math.sin((Math.PI * i) / (CAPAS - 1));
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: r,
                transform: `translateZ(${z}px)`,
                background: i === 0 ? 'linear-gradient(160deg,#3a3d43,#1d1f23)' : `linear-gradient(90deg, hsl(220,5%,${l * 0.85}%), hsl(220,6%,${l}%) 20%, hsl(220,5%,${l * 0.8}%) 50%, hsl(220,6%,${l}%) 80%, hsl(220,5%,${l * 0.85}%))`,
              }}
            />
          );
        })}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: r,
            transform: `translateZ(${T / 2}px)`,
            padding: aro,
            boxSizing: 'border-box',
            background: 'linear-gradient(135deg,#8a8e97 0%,#3d4047 35%,#5d6068 60%,#2a2c31 100%)',
          }}
        >
          <div style={{width: '100%', height: '100%', borderRadius: r - aro, background: '#040405', padding: bez, boxSizing: 'border-box'}}>
            <div style={{position: 'relative', width: '100%', height: '100%', borderRadius: Math.max(r - aro - bez * 0.6, 4), overflow: 'hidden', background: '#071224'}}>
              <Img src={staticFile(src)} style={{display: 'block', width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center'}} />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: 'linear-gradient(115deg, rgba(255,255,255,0) 36%, rgba(255,255,255,0.06) 46%, rgba(255,255,255,0.02) 52%, rgba(255,255,255,0) 60%)',
                  backgroundSize: '240% 100%',
                  backgroundPosition: `${brillo}% 0`,
                }}
              />
            </div>
          </div>
          {/* camara frontal en el bisel */}
          <div style={{position: 'absolute', left: landscape ? '50%' : aro + bez * 0.5, top: landscape ? aro + bez * 0.5 : '50%', width: bez * 0.28, height: bez * 0.28, transform: 'translate(-50%,-50%)', borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #2a3550, #050608 70%)'}} />
        </div>
      </div>
    </div>
  );
};
