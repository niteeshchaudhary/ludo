import { createGame, gameReducer, isValidSave, TURN_MS } from './engine';

const twoPlayers = [{ color: 'red', name: 'Alice', type: 'human' }, { color: 'yellow', name: 'Bob', type: 'human' }];
const timeout = state => gameReducer(state, { type: 'TIMEOUT', now: state.turnDeadline });

test('timeout cannot happen early; a bonus roll shares the same deadline', () => {
  const initial = createGame(twoPlayers, 1000);
  expect(gameReducer(initial, { type: 'TIMEOUT', now: 60999 })).toBe(initial);
  const rolled = gameReducer(initial, { type: 'ROLL', value: 6 });
  const moved = gameReducer(rolled, { type: 'MOVE', token: 0 });
  expect(moved.turnDeadline).toBe(initial.turnDeadline);
  const next = timeout(moved);
  expect(next.turn).toBe(1);
  expect(next.players[0].timeouts).toBe(1);
  expect(next.tokens.red[0]).toBe(0);
  expect(next.turnDeadline).toBe(initial.turnDeadline + TURN_MS);
  expect(next.dice).toBeNull();
});

test('three cumulative defaults remove the seat and let the remaining player win', () => {
  let state = createGame(twoPlayers, 0);
  for (let count = 1; count <= 3; count++) {
    state.tokens.red[0] = 17;
    state = timeout(state);
    expect(state.players[0].timeouts).toBe(count);
    if (count < 3) state = gameReducer({ ...state, phase: 'pass', dice: 1 }, { type: 'ADVANCE', now: state.turnDeadline });
  }
  expect(state.players[0].disqualified).toBe(true);
  expect(state.tokens.red).toEqual([-1, -1, -1, -1]);
  expect(state.winner).toBe('yellow');
  expect(state.winReason).toBe('last-standing');
  expect(isValidSave(state)).toBe(true);
  expect(gameReducer(state, { type: 'AUTOPILOT', color: 'red', enabled: true })).toBe(state);
});

test('disqualified players are skipped in later turns', () => {
  const state = createGame(undefined, 0);
  state.players[0] = { ...state.players[0], timeouts: 3, disqualified: true };
  state.turn = 3; state.phase = 'pass'; state.dice = 1;
  expect(gameReducer(state, { type: 'ADVANCE', now: 5000 }).turn).toBe(1);
});

test('autopilot is reversible and preserves deadline and timeout strikes', () => {
  const state = createGame(twoPlayers, 0); state.players[0].timeouts = 2;
  const auto = gameReducer(state, { type: 'AUTOPILOT', color: 'red', enabled: true });
  expect(auto.turnDeadline).toBe(state.turnDeadline);
  expect(auto.players[0].timeouts).toBe(2);
  expect(timeout(auto)).toBe(auto);
  const manual = gameReducer(auto, { type: 'AUTOPILOT', color: 'red', enabled: false });
  expect(manual.players[0].autopilot).toBe(false);
  expect(timeout(manual).players[0].disqualified).toBe(true);
  expect(gameReducer(state, { type: 'AUTOPILOT', color: 'red', enabled: 'true' })).toBe(state);
});

test('saved timeout metadata and last-standing winners are validated', () => {
  const state = createGame(twoPlayers, 0);
  expect(isValidSave({ ...state, turnDeadline: NaN })).toBe(false);
  expect(isValidSave({ ...state, phase: 'won', winner: 'red', winReason: 'last-standing' })).toBe(false);
  state.players[0].timeouts = 3;
  expect(isValidSave(state)).toBe(false);
});
