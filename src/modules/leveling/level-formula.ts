import type { LevelFormulaResult } from './leveling.types.js';

export class LevelFormulaService {
  getRequiredExpForNextLevel(level: number): bigint {
    const safeLevel = Math.max(1, Math.floor(level));
    const previousLevels = BigInt(safeLevel - 1);

    return 100n + previousLevels * 75n + previousLevels * previousLevels * 20n;
  }

  calculateLevel(totalExp: bigint | number): LevelFormulaResult {
    let level = 1;
    let remainingExp = BigInt(totalExp);

    if (remainingExp < 0n) {
      remainingExp = 0n;
    }

    while (remainingExp >= this.getRequiredExpForNextLevel(level)) {
      remainingExp -= this.getRequiredExpForNextLevel(level);
      level += 1;
    }

    return {
      level,
      currentLevelExp: remainingExp,
      requiredExpToNextLevel: this.getRequiredExpForNextLevel(level)
    };
  }
}

export const levelFormulaService = new LevelFormulaService();

