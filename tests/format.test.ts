import { describe, expect, it } from 'vitest';

import { buildProgressBar, formatExp, getProgressPercent } from '../src/utils/format.js';

describe('format helpers', () => {
  it.each([
    [0n, 100n, '░░░░░░░░░░', 0],
    [50n, 100n, '█████░░░░░', 50],
    [100n, 100n, '██████████', 100],
    [150n, 100n, '██████████', 100]
  ])('builds progress bars with clamped percentage', (current, required, bar, percent) => {
    expect(buildProgressBar(current, required)).toBe(bar);
    expect(getProgressPercent(current, required)).toBe(percent);
  });

  it('formats BigInt EXP values', () => {
    expect(formatExp(12345n)).toBe('12,345');
  });
});

