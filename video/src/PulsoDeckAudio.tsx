import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { PulsoDeck } from './PulsoDeck';
import { beat, escenas } from './deck/guion';

// Efectos de sonido procedurales (video/public/sfx) y voz en off (video/public/voz, voz "Paulina" de macOS).
// Cada efecto se ancla a lo que pasa en pantalla segun el guion (123 BPM, 30 fps).

type Evento = { f: number; sfx: string; vol: number };

const eventos = (): Evento[] => {
  const ev: Evento[] = [];
  for (const e of escenas) {
    const ini = beat(e.desdeBeat);
    const dur = beat(e.desdeBeat + e.beats) - ini;
    if (e.tipo === 'dispositivo') {
      ev.push({ f: ini, sfx: 'whoosh', vol: 0.5 });
      if (e.imagen2) {
        const mitad = Math.round(dur / 2);
        if (e.id === 'demo-telegram') {
          ev.push({ f: ini + mitad - 4, sfx: 'click', vol: 0.6 });
          ev.push({ f: ini + mitad, sfx: 'ding', vol: 0.5 });
        } else {
          ev.push({ f: ini + mitad, sfx: 'whoosh', vol: 0.4 });
        }
      }
    }
    if (e.tipo === 'iconos' && e.iconos) {
      const n = e.iconos.length;
      e.iconos.forEach((_, i) => {
        ev.push({ f: beat(e.desdeBeat + (i * e.beats) / n), sfx: 'pop', vol: 0.45 });
      });
    }
    if (e.tipo === 'texto') {
      ev.push({ f: ini, sfx: e.id === 'solucion' ? 'ding' : 'pop', vol: e.id === 'solucion' ? 0.4 : 0.45 });
    }
    if (e.tipo === 'veredicto') {
      ev.push({ f: ini, sfx: 'impacto', vol: 0.6 });
      if (e.id === 'veredicto-pagar') ev.push({ f: ini + 8, sfx: 'ding', vol: 0.4 });
    }
    if (e.tipo === 'cifra') {
      ev.push({ f: ini, sfx: 'whoosh', vol: 0.35 });
      for (let k = 0; k <= 12; k += 2) ev.push({ f: ini + k, sfx: 'tick', vol: 0.25 });
      ev.push({ f: ini + 12, sfx: 'pop', vol: 0.4 });
    }
    if (e.tipo === 'cierre') {
      ev.push({ f: Math.max(0, ini - 36), sfx: 'subida', vol: 0.45 });
      ev.push({ f: ini, sfx: 'impacto', vol: 0.5 });
      ev.push({ f: ini + 4, sfx: 'ding', vol: 0.55 });
    }
  }
  return ev;
};

// Toma de voz por escena: [archivo, beat de inicio]. Duraciones medidas con afinfo, cada una cabe antes de la siguiente.
const VOZ: [string, number][] = [
  ['01', 0], ['02', 8], ['03', 24], ['04', 32], ['05', 40], ['06', 52], ['07', 60], ['08', 68],
  ['09', 76], ['10', 84], ['11', 92], ['12', 100], ['13', 104], ['14', 108], ['15', 112],
  ['17', 120], ['18', 128], ['19', 136], ['20', 148],
];

const Efectos: React.FC = () => (
  <>
    {eventos().map((e, i) => (
      <Sequence key={`sfx-${i}`} from={e.f} name={`sfx ${e.sfx}`}>
        <Audio src={staticFile(`sfx/${e.sfx}.wav`)} volume={e.vol} />
      </Sequence>
    ))}
  </>
);

const Voz: React.FC = () => (
  <>
    {VOZ.map(([id, b]) => (
      <Sequence key={`voz-${id}`} from={beat(b) + 6} name={`voz ${id}`}>
        <Audio src={staticFile(`voz/${id}.wav`)} volume={1} />
      </Sequence>
    ))}
  </>
);

export const PulsoDeckAudio: React.FC = () => (
  <AbsoluteFill>
    <PulsoDeck />
    <Efectos />
    <Voz />
  </AbsoluteFill>
);

export const PulsoDeckSfx: React.FC = () => (
  <AbsoluteFill>
    <PulsoDeck />
    <Efectos />
  </AbsoluteFill>
);
