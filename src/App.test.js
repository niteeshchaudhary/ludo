import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import App, { SAVE_KEY } from './App';
import { createGame, rollDie } from './game/engine';

jest.mock('./game/engine', () => ({ ...jest.requireActual('./game/engine'), rollDie: jest.fn() }));
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
});
beforeEach(() => { localStorage.clear(); jest.useFakeTimers(); rollDie.mockReset().mockReturnValue(6); });
afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); jest.restoreAllMocks(); });
const tick = ms => act(() => jest.advanceTimersByTime(ms));

test('renders playable board, prevents repeated rolls, and permits only current legal pieces', () => {
  const initial = createGame(); initial.tokens.red[0] = 0;
  localStorage.setItem(SAVE_KEY, JSON.stringify(initial));
  render(<React.StrictMode><App /></React.StrictMode>);
  const roll = screen.getByRole('button', { name: 'Roll dice' });
  const piece = screen.getByRole('button', { name: /You, Coral piece 2/ });
  expect(piece).toBeDisabled();
  fireEvent.click(roll);
  fireEvent.click(roll);
  expect(screen.getByRole('button', { name: 'Rolling…' })).toBeDisabled();
  tick(480);
  expect(rollDie).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Select a piece' })).toBeDisabled();
  expect(piece).toBeEnabled();
  expect(screen.getByRole('button', { name: /Jade, Jade piece 1/ })).toBeDisabled();
  fireEvent.click(piece);
  expect(screen.getByRole('button', { name: /You, Coral piece 2, on the track/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Roll dice' })).toBeEnabled();
  expect(JSON.parse(localStorage.getItem(SAVE_KEY)).tokens.red).toEqual([0, 0, -1, -1]);
});

test('no-move turn advances and computer plays without human input', () => {
  rollDie.mockReturnValueOnce(2).mockReturnValue(6);
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Roll dice' }));
  tick(480);
  expect(screen.getByRole('status')).toHaveTextContent('No available moves');
  tick(1050);
  expect(screen.getByRole('heading', { name: 'Jade’s turn' })).toBeInTheDocument();
  tick(800); tick(480); tick(800);
  expect(JSON.parse(localStorage.getItem(SAVE_KEY)).tokens.green[0]).toBe(0);
});

test('rules pause computer turns and resume after closing', () => {
  const s = createGame(); s.turn = 1;
  localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Rules' }));
  expect(screen.getByRole('dialog', { name: 'A quick guide to Ludo' })).toBeInTheDocument();
  tick(10000);
  expect(rollDie).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Got it. Let’s play' }));
  tick(800); tick(480);
  expect(rollDie).toHaveBeenCalledTimes(1);
});

test('settings create two local players and cancel leaves the current game intact', () => {
  render(<App />);
  fireEvent.click(screen.getAllByRole('button', { name: 'New game' })[0]);
  fireEvent.change(screen.getByRole('combobox', { name: 'Jade player type' }), { target: { value: 'off' } });
  fireEvent.change(screen.getByRole('combobox', { name: 'Blue player type' }), { target: { value: 'off' } });
  fireEvent.change(screen.getByRole('combobox', { name: 'Gold player type' }), { target: { value: 'human' } });
  fireEvent.change(screen.getByRole('textbox', { name: 'Gold player name' }), { target: { value: 'Alex' } });
  fireEvent.click(screen.getByRole('button', { name: 'Let’s play' }));
  expect(screen.getByText('2 PLAYERS')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Jade, Jade piece/ })).not.toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem(SAVE_KEY)).players[1]).toMatchObject({ color: 'yellow', name: 'Alex', type: 'human' });
  fireEvent.click(screen.getAllByRole('button', { name: 'New game' })[0]);
  fireEvent.change(screen.getByRole('combobox', { name: 'Gold player type' }), { target: { value: 'off' } });
  expect(screen.getByRole('button', { name: 'Let’s play' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
  expect(screen.getByText('2 PLAYERS')).toBeInTheDocument();
});

test('reload restores a pending move with exactly the same selectable pieces', () => {
  const s = createGame(); s.tokens.red[0] = 0; s.phase = 'move'; s.dice = 6; s.sixes = 1;
  localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  render(<App />);
  expect(screen.getByRole('button', { name: 'Select a piece' })).toBeDisabled();
  expect(screen.getByRole('button', { name: /You, Coral piece 4/ })).toBeEnabled();
});

test('damaged saves and unavailable storage still allow play', () => {
  localStorage.setItem(SAVE_KEY, '{broken');
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Blocked'); });
  render(<App />);
  expect(screen.getByRole('button', { name: 'Roll dice' })).toBeEnabled();
  expect(screen.getByText('Browser storage unavailable; keep this tab open')).toBeInTheDocument();
});

test('restarting during an animation cancels the old roll', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Roll dice' }));
  tick(200);
  fireEvent.click(screen.getAllByRole('button', { name: 'New game' })[0]);
  fireEvent.click(screen.getByRole('button', { name: 'Let’s play' }));
  tick(1000);
  expect(rollDie).not.toHaveBeenCalled();
  expect(JSON.parse(localStorage.getItem(SAVE_KEY)).rollCount).toBe(0);
});

test('opening rules during a roll pauses the animation and resolves exactly once after closing', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Roll dice' }));
  tick(200);
  fireEvent.click(screen.getByRole('button', { name: 'Rules' }));
  tick(10000);
  expect(rollDie).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Got it. Let’s play' }));
  tick(480);
  expect(rollDie).toHaveBeenCalledTimes(1);
  expect(JSON.parse(localStorage.getItem(SAVE_KEY)).tokens.red).toEqual([0, -1, -1, -1]);
});

test('winner screen supports reviewing the board and starting again', () => {
  const s = createGame(); s.phase = 'move'; s.dice = 1; s.tokens.red = [56, 56, 56, 55];
  localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  render(<App />);
  const winner = screen.getByRole('dialog', { name: 'You take the crown!' });
  expect(within(winner).getByText('All roads lead home.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Take a look at the board' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Game complete' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Rules' }));
  fireEvent.click(screen.getByRole('button', { name: 'Got it. Let’s play' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(screen.getAllByRole('button', { name: 'New game' })[0]);
  fireEvent.click(screen.getByRole('button', { name: 'Let’s play' }));
  expect(screen.getByRole('button', { name: 'Roll dice' })).toBeEnabled();
});

test('clicking the die rolls once and stays locked until a piece is chosen', () => {
  const initial = createGame(); initial.tokens.red[0] = 0;
  localStorage.setItem(SAVE_KEY, JSON.stringify(initial));
  render(<React.StrictMode><App /></React.StrictMode>);
  const die = screen.getByRole('button', { name: 'Roll die', exact: true });
  fireEvent.click(die);
  fireEvent.click(die);
  expect(screen.getByRole('button', { name: 'Dice rolling' })).toBeDisabled();
  tick(480);
  expect(rollDie).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Dice shows 6' })).toBeDisabled();
  expect(JSON.parse(localStorage.getItem(SAVE_KEY)).tokens.red).toEqual([0, -1, -1, -1]);
  fireEvent.click(screen.getByRole('button', { name: /You, Coral piece 3/ }));
  expect(screen.getByRole('button', { name: 'Roll die', exact: true })).toBeEnabled();
});

test('a single legal piece moves automatically and advances the turn', () => {
  const s = createGame(); s.tokens.red = [-1, 0, -1, -1];
  localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  rollDie.mockReturnValue(3);
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Roll die', exact: true }));
  tick(480);
  const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
  expect(saved.tokens.red).toEqual([-1, 3, -1, -1]);
  expect(saved.phase).toBe('pass');
  expect(screen.queryByRole('button', { name: 'Move Coral piece 2' })).not.toBeInTheDocument();
  tick(1050);
  expect(screen.getByRole('heading', { name: 'Jade’s turn' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Dice ready to roll' })).toBeDisabled();
});

test('a six with one piece in play still requires choosing when yard pieces can enter', () => {
  const s = createGame(); s.tokens.red = [0, -1, -1, -1];
  localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Roll die', exact: true }));
  tick(480); tick(2000);
  expect(JSON.parse(localStorage.getItem(SAVE_KEY)).tokens.red).toEqual([0, -1, -1, -1]);
  expect(screen.getByRole('button', { name: /You, Coral piece 1/ })).toBeEnabled();
  expect(screen.getByRole('button', { name: /You, Coral piece 2/ })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: /You, Coral piece 2/ }));
  expect(JSON.parse(localStorage.getItem(SAVE_KEY)).tokens.red).toEqual([0, 0, -1, -1]);
});

test('automatic movement captures correctly and grants the extra roll once', () => {
  const s = createGame(); s.tokens.red = [16, -1, -1, -1]; s.tokens.green[0] = 4;
  localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  rollDie.mockReturnValue(1);
  render(<React.StrictMode><App /></React.StrictMode>);
  fireEvent.click(screen.getByRole('button', { name: 'Roll die', exact: true }));
  tick(480);
  const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
  expect(saved.tokens.red[0]).toBe(17);
  expect(saved.tokens.green[0]).toBe(-1);
  expect(saved.phase).toBe('roll');
  expect(saved.turn).toBe(0);
  expect(saved.log.filter(e => e.text.includes('Captured'))).toHaveLength(1);
  expect(screen.getByRole('button', { name: 'Roll die', exact: true })).toBeEnabled();
});

test('a restored single legal move resolves automatically with an exact finish', () => {
  const s = createGame(); s.tokens.red = [55, 54, 56, 56]; s.phase = 'move'; s.dice = 2;
  localStorage.setItem(SAVE_KEY, JSON.stringify(s));
  render(<App />);
  expect(JSON.parse(localStorage.getItem(SAVE_KEY)).tokens.red).toEqual([55, 56, 56, 56]);
  expect(screen.getByRole('button', { name: 'Roll die', exact: true })).toBeEnabled();
});

test('a six automatically unlocks piece one when all four are in the yard', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Roll die', exact: true }));
  tick(480);
  expect(JSON.parse(localStorage.getItem(SAVE_KEY)).tokens.red).toEqual([0, -1, -1, -1]);
  expect(screen.queryByRole('button', { name: 'Move Coral piece 2' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Roll die', exact: true })).toBeEnabled();
});

test('LAN asks for a name before displaying room actions', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Create / join room' }));
  expect(screen.queryByRole('button', { name: 'Create room', exact: true })).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Room code')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Alex' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(screen.getByText('Hi, Alex!')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Create room', exact: true })).toBeEnabled();
  expect(screen.getByLabelText('Room code')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Change name' }));
  expect(screen.getByLabelText('Your name')).toHaveValue('Alex');
});

test('an older two-player save moves adjacent seats opposite without losing progress', () => {
  const saved = createGame([{ color: 'red', name: 'First', type: 'human' }, { color: 'yellow', name: 'Second', type: 'human' }]);
  saved.players[1].color = 'green'; saved.tokens.green = [17, -1, 52, 56];
  localStorage.setItem(SAVE_KEY, JSON.stringify(saved));
  render(<App />);
  const migrated = JSON.parse(localStorage.getItem(SAVE_KEY));
  expect(migrated.players[1].color).toBe('yellow');
  expect(migrated.tokens.yellow).toEqual([17, -1, 52, 56]);
  expect(migrated.tokens.green).toEqual([-1, -1, -1, -1]);
});

test('the turn expires after one minute even with rules open', () => {
  const game = createGame([{ color: 'red', name: 'Alice', type: 'human' }, { color: 'yellow', name: 'Bob', type: 'human' }]);
  localStorage.setItem(SAVE_KEY, JSON.stringify(game));
  render(<App />);
  expect(screen.getByRole('timer')).toHaveTextContent('1:00');
  fireEvent.click(screen.getByRole('button', { name: 'Rules' }));
  tick(59000);
  expect(JSON.parse(localStorage.getItem(SAVE_KEY)).players[0].timeouts).toBe(0);
  tick(1000);
  const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
  expect(saved.players[0].timeouts).toBe(1);
  expect(saved.turn).toBe(1);
  expect(saved.turnDeadline).toBe(Date.now() + 60000);
});

test('a third timeout disqualifies the player and celebrates the remaining winner', () => {
  const game = createGame([{ color: 'red', name: 'Alice', type: 'human' }, { color: 'yellow', name: 'Bob', type: 'human' }]);
  game.players[0].timeouts = 2; game.tokens.red[0] = 17;
  localStorage.setItem(SAVE_KEY, JSON.stringify(game));
  render(<App />); tick(60000);
  expect(screen.getByRole('dialog', { name: 'Bob takes the crown!' })).toBeInTheDocument();
  expect(screen.getByText('Last player standing!')).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem(SAVE_KEY)).players[0].disqualified).toBe(true);
  expect(screen.queryByRole('button', { name: 'Enable autopilot for Alice' })).not.toBeInTheDocument();
});

test('autopilot plays the human seat and taking control cancels its pending roll', () => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Enable autopilot for You' }));
  expect(screen.getByRole('button', { name: 'Take control of You' })).toHaveAttribute('aria-pressed', 'true');
  tick(800); tick(480); tick(800);
  expect(JSON.parse(localStorage.getItem(SAVE_KEY)).tokens.red[0]).toBe(0);
  fireEvent.click(screen.getByRole('button', { name: 'Take control of You' }));
  const count = rollDie.mock.calls.length;
  tick(2000);
  expect(rollDie).toHaveBeenCalledTimes(count);
  expect(screen.getByRole('button', { name: 'Roll die', exact: true })).toBeEnabled();
});
