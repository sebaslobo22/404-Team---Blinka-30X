import React from 'react';

// Suelo: reflejo y sombra difusa en la parte baja del cuadro.
export const Suelo: React.FC = () => (
  <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: '38%', pointerEvents: 'none'}}>
    <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(7,18,36,0) 0%, rgba(3,8,18,0.55) 100%)'}} />
    <div style={{position: 'absolute', left: '10%', right: '10%', top: 0, height: 1, background: 'linear-gradient(90deg, rgba(124,108,255,0), rgba(124,108,255,0.25), rgba(124,108,255,0))'}} />
    <div style={{position: 'absolute', left: '15%', right: '15%', top: '-4%', height: '40%', background: 'radial-gradient(ellipse at 50% 30%, rgba(124,108,255,0.10), rgba(124,108,255,0) 65%)', filter: 'blur(20px)'}} />
  </div>
);

// Luz: halo radial detrás del dispositivo.
export const Luz: React.FC<{color?: string}> = ({color = '#7c6cff'}) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      background: `radial-gradient(circle at 50% 45%, ${color}55 0%, ${color}1f 28%, ${color}00 58%)`,
      filter: 'blur(30px)',
    }}
  />
);
