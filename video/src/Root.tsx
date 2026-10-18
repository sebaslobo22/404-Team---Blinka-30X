import React from 'react';
import { Composition } from 'remotion';
import { Pulso, DURACION_TOTAL } from './Pulso';

export const Root: React.FC = () => (
  <Composition id="Pulso" component={Pulso} durationInFrames={DURACION_TOTAL} fps={30} width={1920} height={1080} />
);
