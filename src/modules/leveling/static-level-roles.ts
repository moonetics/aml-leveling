export type StaticLevelRoleReward = {
  requiredLevel: number;
  roleId: string;
  name: string;
  range: string;
  color: `#${string}`;
};

export const STATIC_LEVEL_ROLE_REWARDS: readonly StaticLevelRoleReward[] = [
  { requiredLevel: 1, roleId: '1507285713882976317', name: 'Level 1-2', range: 'Level 1-2', color: '#6F7F86' },
  { requiredLevel: 3, roleId: '1507285712418898020', name: 'Level 3-5', range: 'Level 3-5', color: '#78908C' },
  { requiredLevel: 6, roleId: '1507285710736986214', name: 'Level 6-10', range: 'Level 6-10', color: '#719B7B' },
  { requiredLevel: 11, roleId: '1507285709101203486', name: 'Level 11-15', range: 'Level 11-15', color: '#65A66D' },
  { requiredLevel: 16, roleId: '1507285707465429104', name: 'Level 16-20', range: 'Level 16-20', color: '#4FA77E' },
  { requiredLevel: 21, roleId: '1507285705829646336', name: 'Level 21-25', range: 'Level 21-25', color: '#3FA2A5' },
  { requiredLevel: 26, roleId: '1507285704273563718', name: 'Level 26-30', range: 'Level 26-30', color: '#3F8EC2' },
  { requiredLevel: 31, roleId: '1507285702641975388', name: 'Level 31-35', range: 'Level 31-35', color: '#4B75D1' },
  { requiredLevel: 36, roleId: '1507285700418998285', name: 'Level 36-40', range: 'Level 36-40', color: '#5F63D6' },
  { requiredLevel: 41, roleId: '1507285698926088263', name: 'Level 41-45', range: 'Level 41-45', color: '#7755D4' },
  { requiredLevel: 46, roleId: '1507424080150659244', name: 'Level 46-50', range: 'Level 46-50', color: '#8C4BCD' },
  { requiredLevel: 51, roleId: '1507424078422741165', name: 'Level 51-55', range: 'Level 51-55', color: '#A343BE' },
  { requiredLevel: 56, roleId: '1507424076749340693', name: 'Level 56-60', range: 'Level 56-60', color: '#B83F9A' },
  { requiredLevel: 61, roleId: '1507424075201642729', name: 'Level 61-65', range: 'Level 61-65', color: '#C64777' },
  { requiredLevel: 66, roleId: '1507424073737830410', name: 'Level 66-70', range: 'Level 66-70', color: '#CF535D' },
  { requiredLevel: 71, roleId: '1507424071392952332', name: 'Level 71-75', range: 'Level 71-75', color: '#D56542' },
  { requiredLevel: 76, roleId: '1507424070130470933', name: 'Level 76-80', range: 'Level 76-80', color: '#C9822E' },
  { requiredLevel: 81, roleId: '1507424067693838466', name: 'Level 81-85', range: 'Level 81-85', color: '#C19A2E' },
  { requiredLevel: 86, roleId: '1507424065667989554', name: 'Level 86-90', range: 'Level 86-90', color: '#B88A1F' },
  { requiredLevel: 91, roleId: '1507424064136937482', name: 'Level 91-100+', range: 'Level 91+', color: '#A4282F' }
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
