import React from 'react';

const colors = ['#e96351', '#409c7c', '#e5b443', '#568bd0', '#ba79cd'];
export default function Confetti() {
  return <div className="victory-confetti" aria-hidden="true">{Array.from({ length: 64 }, (_, i) => <i key={i} style={{
    left: `${(i * 37) % 100}%`, background: colors[i % colors.length],
    '--drift': `${((i * 53) % 180) - 90}px`, '--spin': `${i % 2 ? 720 : -540}deg`,
    animationDelay: `${(i % 12) * .075}s`, animationDuration: `${2.4 + (i % 5) * .18}s`,
    width: `${6 + i % 5}px`, height: `${9 + i % 7}px`, borderRadius: i % 3 === 0 ? '50%' : '2px',
  }} />)}</div>;
}
