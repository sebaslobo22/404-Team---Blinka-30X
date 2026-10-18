import React from 'react';
import {AbsoluteFill, Composition, registerRoot} from 'remotion';
import {MacBookPro} from './MacBookPro';
import {IPhone18ProMax} from './IPhone18ProMax';
import {IPad} from './IPad';
import {Luz, Suelo} from './Escena';

const Dispositivos: React.FC = () => (
  <AbsoluteFill style={{background: 'linear-gradient(180deg,#0b1d3a 0%,#071224 100%)', overflow: 'hidden'}}>
    <Luz color="#7c6cff" />
    <Suelo />
    <div style={{position: 'absolute', left: 30, top: 470}}>
      <IPad src="f016.png" width={540} rotY={22} rotX={6} />
    </div>
    <div style={{position: 'absolute', left: 520, top: 210}}>
      <MacBookPro src="portada.png" width={900} rotY={-18} rotX={8} />
    </div>
    <div style={{position: 'absolute', left: 1530, top: 300}}>
      <IPhone18ProMax src="f016.png" height={660} rotY={-22} rotX={4} />
    </div>
  </AbsoluteFill>
);

const Root: React.FC = () => (
  <Composition id="Dispositivos" component={Dispositivos} durationInFrames={60} fps={30} width={1920} height={1080} />
);

registerRoot(Root);
