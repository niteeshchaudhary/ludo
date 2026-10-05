export const COLORS = ['red', 'green', 'yellow', 'blue'];
export const OPPOSITE = { red: 'yellow', yellow: 'red', green: 'blue', blue: 'green' };
export const PLAYER_INFO = {
  red: { label: 'Coral', hex: '#e96351', start: 0 },
  green: { label: 'Jade', hex: '#409c7c', start: 13 },
  yellow: { label: 'Gold', hex: '#e5b443', start: 26 },
  blue: { label: 'Blue', hex: '#568bd0', start: 39 },
};
export const SAFE_SQUARES = [0, 8, 13, 21, 26, 34, 39, 47];
export const FINISH = 56;
export const TURN_MS = 60000;
export const isAutomated = player => player.type === 'bot' || !!player.autopilot;
export const DEFAULT_PLAYERS = [
  { color: 'red', name: 'You', type: 'human' },
  { color: 'green', name: 'Jade', type: 'bot' },
  { color: 'yellow', name: 'Gold', type: 'bot' },
  { color: 'blue', name: 'Blue', type: 'bot' },
];
export const TRACK = [
  ...Array.from({ length: 5 }, (_, i) => [6, i + 1]),
  ...Array.from({ length: 6 }, (_, i) => [5 - i, 6]), [0, 7],
  ...Array.from({ length: 6 }, (_, i) => [i, 8]),
  ...Array.from({ length: 6 }, (_, i) => [6, i + 9]), [7, 14],
  ...Array.from({ length: 6 }, (_, i) => [8, 14 - i]),
  ...Array.from({ length: 6 }, (_, i) => [i + 9, 8]), [14, 7],
  ...Array.from({ length: 6 }, (_, i) => [14 - i, 6]),
  ...Array.from({ length: 6 }, (_, i) => [8, 5 - i]), [7, 0], [6, 0],
];
export const HOME_LANES = {
  red: Array.from({ length: 5 }, (_, i) => [7, i + 1]),
  green: Array.from({ length: 5 }, (_, i) => [i + 1, 7]),
  yellow: Array.from({ length: 5 }, (_, i) => [7, 13 - i]),
  blue: Array.from({ length: 5 }, (_, i) => [13 - i, 7]),
};
export const YARDS = {
  red: [[1.5, 1.5], [1.5, 3.5], [3.5, 1.5], [3.5, 3.5]],
  green: [[1.5, 10.5], [1.5, 12.5], [3.5, 10.5], [3.5, 12.5]],
  yellow: [[10.5, 10.5], [10.5, 12.5], [12.5, 10.5], [12.5, 12.5]],
  blue: [[10.5, 1.5], [10.5, 3.5], [12.5, 1.5], [12.5, 3.5]],
};

export function createGame(players = DEFAULT_PLAYERS, now = Date.now()) {
  const enabled = players.filter(p => p.type !== 'off');
  if (enabled.length < 2 || enabled.length > 4 || new Set(enabled.map(p => p.color)).size !== enabled.length ||
    enabled.some(p => !COLORS.includes(p.color) || !['human', 'bot'].includes(p.type))) {
    throw new Error('Choose two to four players.');
  }
  const seats = enabled.map((p, index) => ({ ...p, timeouts: 0, disqualified: false, autopilot: false, color: enabled.length === 2 && index === 1 ? OPPOSITE[enabled[0].color] : p.color, name: p.name.trim().slice(0, 20) || PLAYER_INFO[p.color].label }));
  return {
    version: 1, players: seats, tokens: Object.fromEntries(COLORS.map(c => [c, [-1, -1, -1, -1]])),
    turn: 0, turnId: 0, turnDeadline: now + TURN_MS, phase: 'roll', dice: null, sixes: 0, winner: null, winReason: null, rollCount: 0,
    message: `${seats[0].name}, roll to get started.`, log: [], eventId: 0,
  };
}

export function trackIndex(color, progress) {
  return progress >= 0 && progress <= 50 ? (PLAYER_INFO[color].start + progress) % 52 : null;
}

export function tokenPosition(color, progress, token) {
  if (progress === -1) return YARDS[color][token];
  if (progress === FINISH) {
    const centers = { red: [7.5, 6.65], green: [6.65, 7.5], yellow: [7.5, 8.35], blue: [8.35, 7.5] };
    const [r, c] = centers[color];
    return [r - 0.5 + (token > 1 ? 0.2 : -0.2), c - 0.5 + (token % 2 ? 0.2 : -0.2)];
  }
  return progress <= 50 ? TRACK[trackIndex(color, progress)] : HOME_LANES[color][progress - 51];
}

export function legalMoves(state) {
  if (state.phase !== 'move' || !Number.isInteger(state.dice)) return [];
  const color = state.players[state.turn].color;
  if (state.players[state.turn].disqualified) return [];
  if (state.dice === 6 && state.tokens[color].every(progress => progress === -1)) return [0];
  return state.tokens[color].flatMap((progress, i) =>
    (progress === -1 ? state.dice === 6 : progress < FINISH && progress + state.dice <= FINISH) ? [i] : []);
}

function record(state, text, color) {
  const eventId = state.eventId + 1;
  return { ...state, eventId, message: text, log: [{ id: eventId, text, color }, ...state.log].slice(0, 24) };
}

export function gameReducer(state, action) {
  const player = state.players[state.turn];
  if (action.type === 'AUTOPILOT') {
    const seat = state.players.find(p => p.color === action.color);
    if (!seat || seat.type !== 'human' || seat.disqualified || state.phase === 'won' || typeof action.enabled !== 'boolean' || !!seat.autopilot === action.enabled) return state;
    return record({ ...state, players: state.players.map(p => p === seat ? { ...p, autopilot: action.enabled } : p) }, `${seat.name} ${action.enabled ? 'enabled autopilot.' : 'took back control.'}`, seat.color);
  }
  if (action.type === 'TIMEOUT') {
    if (!['roll', 'move'].includes(state.phase) || isAutomated(player) || player.disqualified || (action.now ?? Date.now()) < state.turnDeadline) return state;
    const timeouts = (player.timeouts || 0) + 1;
    const disqualified = timeouts >= 3;
    const players = state.players.map((p, i) => i === state.turn ? { ...p, timeouts, disqualified, autopilot: false } : p);
    const tokens = disqualified ? { ...state.tokens, [player.color]: [-1, -1, -1, -1] } : state.tokens;
    const remaining = players.filter(p => !p.disqualified);
    const text = `${player.name} timed out (${timeouts}/3). ${disqualified ? 'Disqualified.' : 'Turn forfeited.'}`;
    if (remaining.length === 1) {
      const winner = remaining[0];
      return record({ ...state, players, tokens, phase: 'won', turn: players.indexOf(winner), winner: winner.color, winReason: 'last-standing', sixes: 0 }, `${text} ${winner.name} wins as the last player standing!`, player.color);
    }
    return record(nextTurn({ ...state, players, tokens }, action.now), text, player.color);
  }
  if (action.type === 'ROLL') {
    if (state.phase !== 'roll' || !Number.isInteger(action.value) || action.value < 1 || action.value > 6) return state;
    const sixes = action.value === 6 ? state.sixes + 1 : 0;
    let next = { ...state, dice: action.value, sixes, rollCount: state.rollCount + 1, phase: 'move' };
    if (sixes === 3) return record({ ...next, phase: 'pass' }, `${player.name} rolled three sixes. Turn forfeited.`, player.color);
    if (!legalMoves(next).length) return record({ ...next, phase: 'pass' }, `${player.name} rolled ${action.value}. No available moves.`, player.color);
    return record(next, `${player.name} rolled ${action.value}. Choose a piece.`, player.color);
  }
  if (action.type === 'MOVE') {
    if (!legalMoves(state).includes(action.token)) return state;
    const oldProgress = state.tokens[player.color][action.token];
    const progress = oldProgress === -1 ? 0 : oldProgress + state.dice;
    const tokens = Object.fromEntries(COLORS.map(c => [c, [...state.tokens[c]]]));
    tokens[player.color][action.token] = progress;
    const destination = trackIndex(player.color, progress);
    let captured = 0;
    if (destination !== null && !SAFE_SQUARES.includes(destination)) {
      state.players.forEach(opponent => {
        if (opponent.color === player.color || opponent.disqualified) return;
        tokens[opponent.color] = tokens[opponent.color].map(p => {
          if (trackIndex(opponent.color, p) === destination) { captured++; return -1; }
          return p;
        });
      });
    }
    const won = tokens[player.color].every(p => p === FINISH);
    const bonus = state.dice === 6 || captured > 0 || progress === FINISH;
    let text = oldProgress === -1 ? `${player.name} brought piece ${action.token + 1} into play.`
      : `${player.name} moved piece ${action.token + 1} by ${state.dice}.`;
    if (captured) text += ` Captured ${captured} ${captured === 1 ? 'piece' : 'pieces'}!`;
    if (progress === FINISH) text = `${player.name} brought piece ${action.token + 1} home!`;
    text += won ? ` ${player.name === 'You' ? 'You win!' : `${player.name} wins!`}` : bonus ? ' Roll again.' : '';
    return record({ ...state, tokens, phase: won ? 'won' : bonus ? 'roll' : 'pass', winner: won ? player.color : null, winReason: won ? 'home' : null }, text, player.color);
  }
  if (action.type === 'ADVANCE' && state.phase === 'pass') {
    return nextTurn(state, action.now);
  }
  return state;
}

function nextTurn(state, now = Date.now()) {
  let turn = state.turn;
  do { turn = (turn + 1) % state.players.length; } while (state.players[turn].disqualified);
  return { ...state, turn, turnId: (state.turnId || 0) + 1, turnDeadline: now + TURN_MS, phase: 'roll', sixes: 0, dice: null, message: `${state.players[turn].name}, your turn to roll.` };
}

export function chooseBotMove(state) {
  const color = state.players[state.turn].color;
  return legalMoves(state).map(token => {
    const current = state.tokens[color][token];
    const next = current === -1 ? 0 : current + state.dice;
    const square = trackIndex(color, next);
    const captures = square === null || SAFE_SQUARES.includes(square) ? 0 : state.players
      .filter(p => p.color !== color).reduce((n, p) => n + state.tokens[p.color].filter(t => trackIndex(p.color, t) === square).length, 0);
    return { token, score: next === FINISH ? 1000 : captures * 200 + (current === -1 ? 45 : next) + (SAFE_SQUARES.includes(square) ? 20 : 0) };
  }).sort((a, b) => b.score - a.score)[0]?.token;
}

export function rollDie() {
  // Rejection sampling avoids modulo bias and keeps every face equally likely.
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const sample = new Uint32Array(1);
    do { crypto.getRandomValues(sample); } while (sample[0] >= 4294967292);
    return sample[0] % 6 + 1;
  }
  return Math.floor(Math.random() * 6) + 1;
}

export function isValidSave(s) {
  if (!s || s.version !== 1 || !Array.isArray(s.players) || s.players.length < 2 || s.players.length > 4) return false;
  if (s.players.some(p => !p || !COLORS.includes(p.color) || !['human', 'bot'].includes(p.type) || typeof p.name !== 'string' || !p.name.trim() || p.name.length > 20)) return false;
  if (new Set(s.players.map(p => p.color)).size !== s.players.length) return false;
  if (!Number.isInteger(s.turn) || s.turn < 0 || s.turn >= s.players.length || !['roll', 'move', 'pass', 'won'].includes(s.phase)) return false;
  if (!s.tokens || COLORS.some(c => !Array.isArray(s.tokens[c]) || s.tokens[c].length !== 4 || s.tokens[c].some(p => !Number.isInteger(p) || p < -1 || p > FINISH))) return false;
  if (!Number.isInteger(s.sixes) || s.sixes < 0 || s.sixes > 3 || !Number.isInteger(s.rollCount) || s.rollCount < 0 || !Number.isInteger(s.eventId) || s.eventId < 0) return false;
  if (s.dice !== null && (!Number.isInteger(s.dice) || s.dice < 1 || s.dice > 6)) return false;
  if (s.phase !== 'roll' && s.dice === null && !(s.phase === 'won' && s.winReason === 'last-standing')) return false;
  if (s.sixes > 0 && s.dice !== 6) return false;
  if (s.sixes === 3 && s.phase !== 'pass') return false;
  if (COLORS.some(c => !s.players.some(p => p.color === c) && s.tokens[c].some(p => p !== -1))) return false;
  if (typeof s.message !== 'string' || s.message.length > 300 || !Array.isArray(s.log) || s.log.length > 24 || s.log.some(e => !e || !Number.isInteger(e.id) || typeof e.text !== 'string' || e.text.length > 300 || !COLORS.includes(e.color))) return false;
  const winners = s.players.filter(p => s.tokens[p.color].every(t => t === FINISH));
  if (s.players.some(p => (p.timeouts !== undefined && (!Number.isInteger(p.timeouts) || p.timeouts < 0 || p.timeouts > 3)) || (p.autopilot !== undefined && typeof p.autopilot !== 'boolean') || (p.disqualified !== undefined && typeof p.disqualified !== 'boolean') || (!!p.disqualified !== (p.timeouts === 3)) || (p.disqualified && (p.autopilot || s.tokens[p.color].some(t => t !== -1))))) return false;
  if (s.turnDeadline !== undefined && (!Number.isFinite(s.turnDeadline) || s.turnDeadline < 0)) return false;
  if (s.turnId !== undefined && (!Number.isInteger(s.turnId) || s.turnId < 0)) return false;
  if (s.winReason !== undefined && ![null, 'home', 'last-standing'].includes(s.winReason)) return false;
  if (s.phase === 'won' && s.winReason === 'last-standing') return s.players.filter(p => !p.disqualified).length === 1 && !s.players[s.turn].disqualified && s.players[s.turn].color === s.winner;
  if (s.players[s.turn].disqualified) return false;
  if (s.phase === 'won') return winners.length === 1 && winners[0].color === s.winner && s.players[s.turn].color === s.winner;
  return s.winner === null && !winners.length && (s.phase !== 'move' || (s.sixes < 3 && legalMoves(s).length > 0));
}
