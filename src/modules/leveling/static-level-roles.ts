export type StaticLevelRoleReward = {
  requiredLevel: number;
  roleId: string;
  name: string;
  range: string;
};

export const STATIC_LEVEL_ROLE_REWARDS: readonly StaticLevelRoleReward[] = [
  { requiredLevel: 1, roleId: '1507285713882976317', name: 'Level 1', range: 'Level 1' },
  { requiredLevel: 2, roleId: '1507285712418898020', name: 'Level 2-3', range: 'Level 2-3' },
  { requiredLevel: 4, roleId: '1507285710736986214', name: 'Level 4-5', range: 'Level 4-5' },
  { requiredLevel: 6, roleId: '1507285709101203486', name: 'Level 6-7', range: 'Level 6-7' },
  { requiredLevel: 8, roleId: '1507285707465429104', name: 'Level 8-10', range: 'Level 8-10' },
  { requiredLevel: 11, roleId: '1507285705829646336', name: 'Level 11-13', range: 'Level 11-13' },
  { requiredLevel: 14, roleId: '1507285704273563718', name: 'Level 14-16', range: 'Level 14-16' },
  { requiredLevel: 17, roleId: '1507285702641975388', name: 'Level 17-19', range: 'Level 17-19' },
  { requiredLevel: 20, roleId: '1507285700418998285', name: 'Level 20-22', range: 'Level 20-22' },
  { requiredLevel: 23, roleId: '1507285698926088263', name: 'Level 23-25', range: 'Level 23-25' },
  { requiredLevel: 26, roleId: '1507285696979931196', name: 'Level 26-28', range: 'Level 26-28' },
  { requiredLevel: 29, roleId: '1507285694890905732', name: 'Level 29-31', range: 'Level 29-31' },
  { requiredLevel: 32, roleId: '1507285693309779969', name: 'Level 32-34', range: 'Level 32-34' },
  { requiredLevel: 35, roleId: '1507285692282179614', name: 'Level 35-37', range: 'Level 35-37' },
  { requiredLevel: 38, roleId: '1507285690503663706', name: 'Level 38-40', range: 'Level 38-40' },
  { requiredLevel: 41, roleId: '1507285688351981689', name: 'Level 41-43', range: 'Level 41-43' },
  { requiredLevel: 44, roleId: '1507285686347104346', name: 'Level 44-46', range: 'Level 44-46' },
  { requiredLevel: 47, roleId: '1507285684757598218', name: 'Level 47-48', range: 'Level 47-48' },
  { requiredLevel: 49, roleId: '1507285682782081054', name: 'Level 49', range: 'Level 49' },
  { requiredLevel: 50, roleId: '1507285681074868264', name: 'Level 50', range: 'Level 50+' }
] as const;

export function getHighestEligibleLevelRole(
  currentLevel: number,
  rewards: readonly StaticLevelRoleReward[] = STATIC_LEVEL_ROLE_REWARDS
): StaticLevelRoleReward | null {
  return (
    [...rewards]
      .filter((reward) => reward.requiredLevel <= currentLevel)
      .sort((a, b) => b.requiredLevel - a.requiredLevel || a.roleId.localeCompare(b.roleId))[0] ?? null
  );
}
