import React from 'react';
import { render } from '@testing-library/react';
import Die from './Die';

test('retains the last face between turns and starts the next roll from it', () => {
  const { container, rerender } = render(<Die value={2} />);
  const cube = () => container.querySelector('.die-cube');
  expect(cube().style.getPropertyValue('--die-x')).toBe('-90deg');
  rerender(<Die value={null} />);
  expect(cube().style.getPropertyValue('--die-x')).toBe('-90deg');
  rerender(<Die value={null} rolling />);
  expect(cube().style.getPropertyValue('--die-x')).toBe('-90deg');
  rerender(<Die value={5} />);
  rerender(<Die value={null} />);
  expect(cube().style.getPropertyValue('--die-x')).toBe('90deg');
});
