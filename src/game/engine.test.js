import { COLORS, PLAYER_INFO, SAFE_SQUARES, FINISH, TRACK, HOME_LANES, createGame, gameReducer, legalMoves, trackIndex, tokenPosition, chooseBotMove, isValidSave, rollDie } from './engine';

function withTokens(color, tokens, overrides = {}) {
  const state = createGame();
  return { ...state, turn: COLORS.indexOf(color), tokens: { ...state.tokens, [color]: tokens }, ...overrides };
}
const roll = (s, value) => gameReducer(s, { type: 'ROLL', value });
const move = (s, token) => gameReducer(s, { type: 'MOVE', token });
const advance = s => gameReducer(s, { type: 'ADVANCE' });

test('track has 52 unique squares and four separated home lanes', () => {
  expect(TRACK).toHaveLength(52);
  expect(new Set(TRACK.map(p => p.join(','))).size).toBe(52);
  const track = new Set(TRACK.map(p => p.join(',')));
  COLORS.forEach(c => {
    expect(HOME_LANES[c]).toHaveLength(5);
    HOME_LANES[c].forEach(p => expect(track.has(p.join(','))).toBe(false));
  });
});

test.each(COLORS)('%s enters at its own starting square only on a six', color => {
  const state = withTokens(color, [-1, -1, -1, -1]);
  for (let d = 1; d < 6; d++) expect(roll(state, d).phase).toBe('pass');
  const rolled = roll(state, 6);
  expect(legalMoves(rolled)).toEqual([0]);
  expect(move(rolled, 2)).toBe(rolled);
  const moved = move(rolled, 0);
  expect(moved.tokens[color]).toEqual([0, -1, -1, -1]);
  expect(trackIndex(color, 0)).toBe(PLAYER_INFO[color].start);
  expect(moved.phase).toBe('roll');
  expect(moved.turn).toBe(state.turn);
});

test.each(COLORS)('%s wraps around the track and enters only its own home lane', color => {
  for (let p = 0; p <= 50; p++) {
    expect(tokenPosition(color, p, 0)).toEqual(TRACK[(PLAYER_INFO[color].start + p) % 52]);
  }
  const state = move(roll(withTokens(color, [49, -1, -1, -1]), 3), 0);
  expect(state.tokens[color][0]).toBe(52);
  expect(tokenPosition(color, 52, 0)).toEqual(HOME_LANES[color][1]);
  expect(trackIndex(color, 51)).toBeNull();
});

test('rejects overshooting home and moving finished or yard pieces', () => {
  const state = roll(withTokens('red', [55, 53, 56, -1]), 3);
  expect(legalMoves(state)).toEqual([1]);
  expect(move(state, 0)).toBe(state);
  expect(move(state, 2)).toBe(state);
  expect(move(state, 3)).toBe(state);
  expect(move(state, 1).tokens.red[1]).toBe(56);
});

test('an exact finish gives a bonus roll and cannot capture home-lane pieces', () => {
  const s = withTokens('red', [54, -1, -1, -1]);
  s.tokens.green = [53, -1, -1, -1];
  const next = move(roll(s, 2), 0);
  expect(next.tokens.red[0]).toBe(FINISH);
  expect(next.tokens.green[0]).toBe(53);
  expect(next.phase).toBe('roll');
});

test('captures all opponents at the destination and preserves friendly pieces', () => {
  const s = withTokens('red', [16, 17, -1, -1]);
  s.tokens.green = [4, 4, -1, -1]; // global square 17
  s.tokens.yellow = [43, -1, -1, -1];
  const next = move(roll(s, 1), 0);
  expect(next.tokens.green).toEqual([-1, -1, -1, -1]);
  expect(next.tokens.yellow[0]).toBe(-1);
  expect(next.tokens.red).toEqual([17, 17, -1, -1]);
  expect(next.phase).toBe('roll');
  expect(next.message).toContain('Captured 3 pieces');
  expect(s.tokens.green[0]).toBe(4); // no state mutation
});

test.each(SAFE_SQUARES)('square %i protects every color', square => {
  const state = withTokens('red', [(square + 51) % 52, -1, -1, -1]);
  // Red cannot visit progress 51; enter a safe start square with a yard piece instead.
  if (square === 0) state.tokens.red[0] = -1;
  const opponent = COLORS.find(c => c !== 'red' && (square - PLAYER_INFO[c].start + 52) % 52 <= 50);
  const opponentProgress = (square - PLAYER_INFO[opponent].start + 52) % 52;
  state.tokens[opponent][0] = opponentProgress;
  const next = move(roll(state, square === 0 ? 6 : 1), 0);
  expect(next.tokens[opponent][0]).toBe(opponentProgress);
});

test('passing over an opponent does not capture it; stacks do not block travel', () => {
  const s = withTokens('red', [14, -1, -1, -1]);
  s.tokens.green = [2, 2, -1, -1];
  const next = move(roll(s, 4), 0);
  expect(next.tokens.red[0]).toBe(18);
  expect(next.tokens.green).toEqual(s.tokens.green);
  expect(next.phase).toBe('pass');
});

test('ordinary move advances, while a six retains the turn', () => {
  const s = withTokens('red', [0, -1, -1, -1]);
  expect(advance(move(roll(s, 4), 0)).turn).toBe(1);
  const bonus = move(roll(s, 6), 0);
  expect(bonus.phase).toBe('roll');
  expect(bonus.turn).toBe(0);
  expect(bonus.sixes).toBe(1);
});

test('third consecutive six forfeits only that roll and resets for the next player', () => {
  let s = move(roll(createGame(), 6), 0);
  s = move(roll(s, 6), 0);
  const tokens = s.tokens;
  s = roll(s, 6);
  expect(s.phase).toBe('pass');
  expect(legalMoves(s)).toEqual([]);
  expect(s.tokens).toEqual(tokens);
  expect(advance(s).sixes).toBe(0);
  expect(advance(s).turn).toBe(1);
});

test('a non-six resets the streak even when a capture gives a bonus', () => {
  const s = withTokens('red', [16, -1, -1, -1], { sixes: 2 });
  s.tokens.green[0] = 4;
  const next = move(roll(s, 1), 0);
  expect(next.phase).toBe('roll');
  expect(next.sixes).toBe(0);
});

test('no legal moves passes the turn, including a six that overshoots', () => {
  const s = roll(withTokens('red', [55, 56, 56, 56]), 6);
  expect(s.phase).toBe('pass');
  expect(advance(s).turn).toBe(1);
});

test('two-player turns cycle only through enabled seats', () => {
  const s = createGame([{ color: 'red', name: 'A', type: 'human' }, { color: 'green', name: 'Off', type: 'off' }, { color: 'yellow', name: 'B', type: 'human' }]);
  expect(advance(roll(s, 1)).players[1].color).toBe('yellow');
  expect(advance(roll(advance(roll(s, 1)), 2)).turn).toBe(0);
  expect(() => createGame([s.players[0]])).toThrow();
});

test('illegal or repeated actions do not change state', () => {
  const s = createGame();
  [0, 7, NaN, 2.5, '6'].forEach(value => expect(roll(s, value)).toBe(s));
  expect(move(s, 0)).toBe(s);
  expect(advance(s)).toBe(s);
  const rolled = roll(s, 6);
  expect(roll(rolled, 6)).toBe(rolled);
  expect(move(rolled, 4)).toBe(rolled);
  const moved = move(rolled, 0);
  expect(move(moved, 0)).toBe(moved);
});

test('four finished pieces wins and locks all game actions', () => {
  const s = move(roll(withTokens('blue', [56, 56, 56, 55]), 1), 3);
  expect(s.phase).toBe('won');
  expect(s.winner).toBe('blue');
  expect(roll(s, 6)).toBe(s);
  expect(move(s, 0)).toBe(s);
  expect(advance(s)).toBe(s);
  expect(isValidSave(s)).toBe(true);
});

test('bot chooses finishing, then capturing, and only legal moves', () => {
  const s = withTokens('red', [55, 16, -1, -1]);
  s.tokens.green[0] = 4;
  expect(chooseBotMove(roll(s, 1))).toBe(0);
  s.tokens.red[0] = 56;
  expect(chooseBotMove(roll(s, 1))).toBe(1);
  expect(chooseBotMove(createGame())).toBeUndefined();
});

test('saved data rejects malformed state and impossible selection/winner phases', () => {
  const s = createGame();
  expect(isValidSave(JSON.parse(JSON.stringify(s)))).toBe(true);
  [null, {}, { ...s, version: 2 }, { ...s, turn: 9 }, { ...s, dice: 7 }, { ...s, tokens: {} },
    { ...s, phase: 'move' }, { ...s, phase: 'won', winner: 'red' }, { ...s, log: [{}] },
    { ...s, players: [s.players[0], s.players[0]] }, { ...s, sixes: 4 },
    { ...s, sixes: 3, dice: 6 }, { ...s, phase: 'pass', dice: null },
    { ...s, tokens: { ...s.tokens, red: [57, -1, -1, -1] } }].forEach(bad => expect(isValidSave(bad)).toBe(false));
});

test('random die can generate every face and rejects biased high-end samples', () => {
  const original = globalThis.crypto;
  const samples = [4294967295, 0, 1, 2, 3, 4, 5];
  Object.defineProperty(globalThis, 'crypto', { configurable: true, value: { getRandomValues: values => { values[0] = samples.shift(); return values; } } });
  try { expect(Array.from({ length: 6 }, rollDie)).toEqual([1, 2, 3, 4, 5, 6]); }
  finally { Object.defineProperty(globalThis, 'crypto', { configurable: true, value: original }); }
});

test('100 seeded games reach a winner while preserving invariants after every action', () => {
  for (let seed = 1; seed <= 100; seed++) {
    let random = seed;
    let s = createGame();
    let steps = 0;
    while (s.phase !== 'won' && steps++ < 20000) {
      if (s.phase === 'roll') {
        random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
        s = roll(s, random % 6 + 1);
      } else if (s.phase === 'move') s = move(s, chooseBotMove(s));
      else s = advance(s);
      if (!isValidSave(s)) throw new Error(`Invalid state in game ${seed} at action ${steps}`);
    }
    expect(s.phase).toBe('won');
    expect(s.tokens[s.winner]).toEqual([56, 56, 56, 56]);
  }
});

test.each(COLORS)('%s gets an opposite opponent in a two-player game', color => {
  const other = COLORS.find(c => c !== color);
  const game = createGame([{ color, name: 'First', type: 'human' }, { color: other, name: 'Second', type: 'human' }]);
  expect(Math.abs(PLAYER_INFO[game.players[0].color].start - PLAYER_INFO[game.players[1].color].start)).toBe(26);
  expect(game.players[1].name).toBe('Second');
});
