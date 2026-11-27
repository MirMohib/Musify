import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

interface MusifyLogoProps {
  size?: number;
  circleColor?: string;
  waveColor?: string;
}

export function MusifyLogo({
  size = 53,
  circleColor = '#FFFFFF',
  waveColor = '#121212',
}: MusifyLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 54 54" fill="none">
      <Circle cx="27" cy="27" r="26" fill={circleColor} />
      <Path
        d="M14.5 21.5C22.8 18.8 32.8 19.3 39.8 23.2"
        stroke={waveColor}
        strokeWidth="3.6"
        strokeLinecap="round"
      />
      <Path
        d="M16.8 28.4C23.5 26.2 31.4 26.7 37.2 29.8"
        stroke={waveColor}
        strokeWidth="3.1"
        strokeLinecap="round"
      />
      <Path
        d="M19.2 34.8C24.4 33.2 30.3 33.6 34.8 36"
        stroke={waveColor}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </Svg>
  );
}
