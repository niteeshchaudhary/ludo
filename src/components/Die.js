import React, { useEffect, useState } from 'react';
const dots = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
const angles = { 1: [0, 0], 2: [-90, 0], 3: [0, -90], 4: [0, 90], 5: [90, 0], 6: [0, 180] };
export default function Die({ value, rolling, disabled, onRoll }) {
  const [lastFace, setLastFace] = useState(value || 1);
  useEffect(() => { if (value) setLastFace(value); }, [value]);
  const description = rolling ? 'Dice rolling' : value ? `Dice shows ${value}` : 'Dice ready to roll';
  const [x, y] = angles[value || lastFace];
  return <button type="button" className={`die ${rolling ? 'die-rolling' : ''}`} disabled={disabled || rolling} onClick={onRoll} aria-label={disabled || rolling ? description : 'Roll die'} title={disabled || rolling ? description : `${description}. Click to roll.`}>
    <span className="die-cube" aria-hidden="true" style={{ '--die-x': `${x}deg`, '--die-y': `${y}deg` }}>
      {[1, 2, 3, 4, 5, 6].map(face => <span className={`die-face die-face-${face}`} key={face}>{dots[face].map(dot => <span key={dot} className="pip" style={{ gridArea: `${Math.ceil(dot / 3)} / ${(dot - 1) % 3 + 1}` }} />)}</span>)}
    </span>
  </button>;
}
