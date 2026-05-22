import { describe, expect, it } from 'vitest';

import { LevelFormulaService } from '../src/modules/leveling/level-formula.js';

describe('LevelFormulaService', () => {
  const service = new LevelFormulaService();

  it.each([
    [1, 100n],
    [2, 195n],
    [3, 330n],
    [4, 505n],
    [5, 720n],
    [10, 2395n]
  ])('calculates required EXP for level %s', (level, expected) => {
    expect(service.getRequiredExpForNextLevel(level)).toBe(expected);
  });

  it('keeps zero EXP at level 1', () => {
    expect(service.calculateLevel(0)).toEqual({
      level: 1,
      currentLevelExp: 0n,
      requiredExpToNextLevel: 100n
    });
  });

  it('handles exact level-up boundaries', () => {
    expect(service.calculateLevel(100)).toEqual({
      level: 2,
      currentLevelExp: 0n,
      requiredExpToNextLevel: 195n
    });
  });

  it('handles multi-level totals', () => {
    expect(service.calculateLevel(1000)).toEqual({
      level: 4,
      currentLevelExp: 375n,
      requiredExpToNextLevel: 505n
    });
  });

  it('clamps negative totals to level 1', () => {
    expect(service.calculateLevel(-50)).toEqual({
      level: 1,
      currentLevelExp: 0n,
      requiredExpToNextLevel: 100n
    });
  });
});

