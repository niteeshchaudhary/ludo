import { movementPath, movementDuration, hopFrames } from './movement';
import { COLORS, tokenPosition } from './engine';

test.each(COLORS)('%s hops through each square and into its home lane', color => {
  expect(movementPath(color, 0, 47, 53)).toEqual([47, 48, 49, 50, 51, 52, 53].map(progress => tokenPosition(color, progress, 0)));
  expect(movementPath(color, 2, 54, 56)).toEqual([54, 55, 56].map(progress => tokenPosition(color, progress, 2)));
  expect(movementPath(color, 1, -1, 0)).toEqual([-1, 0].map(progress => tokenPosition(color, progress, 1)));
});

test.each(COLORS)('%s capture retraces the complete route and ends in its own yard', color => {
  const path = movementPath(color, 3, 50, -1);
  expect(path).toHaveLength(52);
  expect(path).toEqual([...Array.from({ length: 51 }, (_, i) => 50 - i), -1].map(progress => tokenPosition(color, progress, 3)));
});

test('hops land on every square with an elevated midpoint and preserve stack endpoints', () => {
  const path = movementPath('red', 0, 3, 9);
  const start = { left: '10%', top: '20%', scale: .47 };
  const end = { left: '40%', top: '50%', scale: 1 };
  const frames = hopFrames(path, start, end);
  expect(frames).toHaveLength(13);
  expect(frames[0]).toMatchObject({ left: '10%', top: '20%', offset: 0 });
  expect(frames[12]).toMatchObject({ left: '40%', top: '50%', offset: 1 });
  expect(frames[1].transform).toContain('-85%');
  expect(frames[2].top).toBe(`${(path[1][0] + .5) / 15 * 100}%`);
  expect(movementDuration(6, false)).toBe(450);
  expect(movementDuration(51, true)).toBe(900);
});
