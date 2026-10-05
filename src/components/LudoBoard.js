import React, { useLayoutEffect, useRef } from 'react';
import { movementPath, movementDuration, hopFrames } from '../game/movement';
import { COLORS, PLAYER_INFO, TRACK, SAFE_SQUARES, HOME_LANES, YARDS, FINISH, tokenPosition, legalMoves } from '../game/engine';
const corners = { red: [0, 0], green: [0, 9], yellow: [9, 9], blue: [9, 0] };
const star = '0,-.25 .075,-.08 .26,-.08 .11,.04 .16,.23 0,.12 -.16,.23 -.11,.04 -.26,-.08 -.075,-.08';

export default function LudoBoard({ game, onMove, interactive, onAnimating }) {
  const previous = useRef(null);
  const nodes = useRef(new Map());
  const animations = useRef([]);
  const generation = useRef(0);
  const active = game.players[game.turn].color;
  const movable = interactive ? legalMoves(game) : [];
  const pieces = game.players.flatMap(player => game.tokens[player.color].map((progress, index) => ({
    color: player.color, name: player.name, progress, index, pos: tokenPosition(player.color, progress, index),
  })));
  const groups = new Map();
  pieces.forEach(p => {
    const key = p.pos.join(',');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  });
  const positions = new Map();
  pieces.forEach(piece => {
    const group = groups.get(piece.pos.join(','));
    const slot = group.indexOf(piece);
    const side = Math.ceil(Math.sqrt(group.length));
    const offsetX = group.length > 1 ? ((slot % side) - (side - 1) / 2) * (.74 / side) : 0;
    const offsetY = group.length > 1 ? (Math.floor(slot / side) - (Math.ceil(group.length / side) - 1) / 2) * (.74 / side) : 0;
    positions.set(`${piece.color}-${piece.index}`, { left: `${(piece.pos[1] + .5 + offsetX) / 15 * 100}%`, top: `${(piece.pos[0] + .5 + offsetY) / 15 * 100}%`, scale: group.length > 1 ? .94 / side : 1 });
  });
  useLayoutEffect(() => {
    const before = previous.current;
    previous.current = { game, positions };
    if (before && COLORS.every(color => game.tokens[color].every((progress, index) => before.game.tokens[color][index] === progress))) return;
    const revision = ++generation.current;
    animations.current.forEach(animation => animation.cancel());
    animations.current = [];
    nodes.current.forEach(node => node.classList.remove('piece-traveling'));
    if (!before || game.eventId === 0 || game.rollCount < before.game.rollCount || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      onAnimating?.(false); return;
    }
    const changes = pieces.filter(piece => before.game.tokens[piece.color][piece.index] !== piece.progress);
    const forwardDuration = Math.max(0, ...changes.filter(p => p.progress >= 0).map(p => movementDuration(movementPath(p.color, p.index, before.game.tokens[p.color][p.index], p.progress).length - 1, false)));
    changes.forEach(piece => {
      const key = `${piece.color}-${piece.index}`;
      const node = nodes.current.get(key);
      if (!node?.animate) return;
      const from = before.game.tokens[piece.color][piece.index];
      const path = movementPath(piece.color, piece.index, from, piece.progress);
      if (path.length < 2) return;
      node.classList.add('piece-traveling');
      const animation = node.animate(hopFrames(path, before.positions.get(key), positions.get(key)), {
        duration: movementDuration(path.length - 1, piece.progress === -1), delay: piece.progress === -1 ? forwardDuration : 0, easing: 'linear', fill: 'both',
      });
      animations.current.push(animation);
    });
    onAnimating?.(animations.current.length > 0);
    if (!animations.current.length) return;
    Promise.all(animations.current.map(a => a.finished.catch(() => {}))).then(() => {
      if (generation.current !== revision) return;
      animations.current.forEach(a => a.cancel());
      animations.current = [];
      nodes.current.forEach(node => node.classList.remove('piece-traveling'));
      onAnimating?.(false);
    });
  });
  useLayoutEffect(() => () => {
    generation.current++;
    animations.current.forEach(a => a.cancel());
  }, []);
  return <div className="board-frame">
    <div className="ludo-board" role="group" aria-label="Ludo board. Select a highlighted piece after rolling.">
      <svg className="board-art" viewBox="0 0 15 15" aria-hidden="true">
        <rect width="15" height="15" fill="#fffdfa" />
        {COLORS.map(color => {
          const [r, c] = corners[color];
          const enabled = game.players.some(p => p.color === color);
          const hex = enabled ? PLAYER_INFO[color].hex : '#b9bbb7';
          return <g key={color}>
            <rect x={c + .08} y={r + .08} width="5.84" height="5.84" rx=".24" fill={hex} fillOpacity=".12" />
            <rect x={c + 1.08} y={r + 1.08} width="3.84" height="3.84" rx=".38" fill="#fffdfa" stroke={hex} strokeOpacity=".28" strokeWidth=".04" />
            {YARDS[color].map(([yr, yc], i) => <circle key={i} cx={yc + .5} cy={yr + .5} r=".46" fill={hex} fillOpacity=".12" stroke={hex} strokeOpacity=".18" strokeWidth=".025" />)}
            <text x={c + 3} y={r + .72} textAnchor="middle" fill={hex} fontSize=".29" fontWeight="700" letterSpacing=".05">{PLAYER_INFO[color].label.toUpperCase()}</text>
            <text x={c + 3} y={r + 5.55} textAnchor="middle" fill={hex} fontSize=".25">{enabled ? (active === color && game.phase !== 'won' ? 'YOUR TURN' : 'HOME BASE') : 'EMPTY SEAT'}</text>
            {active === color && game.phase !== 'won' && <rect x={c + .08} y={r + .08} width="5.84" height="5.84" rx=".24" fill="none" stroke={hex} strokeWidth=".065" />}
          </g>;
        })}
        {TRACK.map(([r, c], i) => {
          const startColor = COLORS.find(color => PLAYER_INFO[color].start === i);
          return <g key={i}>
            <rect x={c + .025} y={r + .025} width=".95" height=".95" rx=".075" fill={startColor ? PLAYER_INFO[startColor].hex : '#f6f4ee'} fillOpacity={startColor ? '.22' : '1'} stroke="#dedfd6" strokeWidth=".026" />
            {SAFE_SQUARES.includes(i) && <polygon points={star} transform={`translate(${c + .5} ${r + .5})`} fill={startColor ? PLAYER_INFO[startColor].hex : '#adaf9f'} />}
          </g>;
        })}
        {COLORS.map(color => HOME_LANES[color].map(([r, c], i) => <rect key={`${color}-${i}`} x={c + .025} y={r + .025} width=".95" height=".95" rx=".075" fill={PLAYER_INFO[color].hex} fillOpacity=".36" stroke={PLAYER_INFO[color].hex} strokeOpacity=".3" strokeWidth=".026" />))}
        <path d="M6 6 7.5 7.5 6 9Z" fill={PLAYER_INFO.red.hex} />
        <path d="M6 6 9 6 7.5 7.5Z" fill={PLAYER_INFO.green.hex} />
        <path d="M9 6 9 9 7.5 7.5Z" fill={PLAYER_INFO.yellow.hex} />
        <path d="M6 9 7.5 7.5 9 9Z" fill={PLAYER_INFO.blue.hex} />
        <circle cx="7.5" cy="7.5" r=".46" fill="#fffdfa" />
        <path d="M7.3 7.22h.4v.27a.2.2 0 0 1-.4 0Zm0 .06h-.12v.12a.13.13 0 0 0 .12.13m.4-.25h.12v.12a.13.13 0 0 1-.12.13m-.2.16v.16m-.13 0h.26" fill="none" stroke="#777c68" strokeWidth=".04" strokeLinecap="round" />
      </svg>
      {pieces.map(piece => {
        const group = groups.get(piece.pos.join(','));
        const stacked = group.length > 1;
        const position = positions.get(`${piece.color}-${piece.index}`);
        const canMove = piece.color === active && movable.includes(piece.index);
        const location = piece.progress === -1 ? 'in the yard' : piece.progress === FINISH ? 'finished' : piece.progress > 50 ? 'in the home lane' : 'on the track';
        return <button key={`${piece.color}-${piece.index}`} className={`piece piece-${piece.color} ${canMove ? 'piece-movable' : ''} ${stacked ? 'piece-stacked' : ''} ${piece.progress === FINISH ? 'piece-finished' : ''}`}
          ref={node => { if (node) nodes.current.set(`${piece.color}-${piece.index}`, node); else nodes.current.delete(`${piece.color}-${piece.index}`); }}
          style={{ left: position.left, top: position.top, '--stack-scale': position.scale }}
          disabled={!canMove} onClick={() => onMove(piece.index)}
          aria-label={`${piece.name}, ${PLAYER_INFO[piece.color].label} piece ${piece.index + 1}, ${location}${canMove ? ', available to move' : ''}`}>
          <span>{piece.progress === FINISH ? 'âœ“' : piece.index + 1}</span>
        </button>;
      })}
    </div>
  </div>;
}
