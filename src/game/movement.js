import { tokenPosition } from './engine';

// Progress is relative to each color, so reverse routes cross the same corners.
export function movementPath(color, token, from, to) {
  const steps = [from];
  if (to === -1) {
    for (let progress = from - 1; progress >= 0; progress--) steps.push(progress);
    steps.push(-1);
  } else {
    for (let progress = from + 1; progress <= to; progress++) steps.push(progress);
  }
  return steps.map(progress => tokenPosition(color, progress, token));
}

export function movementDuration(hops, captured) {
  return captured ? Math.min(900, Math.max(180, hops * 32)) : Math.min(700, Math.max(160, hops * 75));
}

export function hopFrames(path, start, end) {
  const frames = [];
  const hops = path.length - 1;
  path.forEach(([row, col], i) => {
    const point = i === 0 ? start : i === hops ? end : { left: `${(col + .5) / 15 * 100}%`, top: `${(row + .5) / 15 * 100}%`, scale: 1 };
    frames.push({ left: point.left, top: point.top, transform: `translate(-50%, -50%) scale(${point.scale})`, offset: i / hops });
    if (i < hops) {
      const [nextRow, nextCol] = path[i + 1];
      const next = i + 1 === hops ? end : { left: `${(nextCol + .5) / 15 * 100}%`, top: `${(nextRow + .5) / 15 * 100}%`, scale: 1 };
      frames.push({ left: `${(parseFloat(point.left) + parseFloat(next.left)) / 2}%`, top: `${(parseFloat(point.top) + parseFloat(next.top)) / 2}%`, transform: 'translate(-50%, -85%) scale(1.06)', offset: (i + .5) / hops });
    }
  });
  return frames;
}
