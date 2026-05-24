import type { GiveawayEntrant, GiveawayRecord, RoleBonus } from "./types";

export type EligibilityInput = {
  userId: string;
  roleIds: string[];
  inviteCount: number;
};

export type EligibilityResult = {
  eligible: boolean;
  reason?: string;
  bonusEntries: number;
  totalEntries: number;
};

export function calculateRoleBonus(roleIds: string[], bonuses: RoleBonus[]): number {
  const memberRoles = new Set(roleIds);
  return bonuses.reduce((total, bonus) => total + (memberRoles.has(bonus.roleId) ? bonus.entries : 0), 0);
}

export function checkEligibility(giveaway: GiveawayRecord, input: EligibilityInput): EligibilityResult {
  const memberRoles = new Set(input.roleIds);

  if (giveaway.requirements.requiredRoleId && !memberRoles.has(giveaway.requirements.requiredRoleId)) {
    return {
      eligible: false,
      reason: `You must have <@&${giveaway.requirements.requiredRoleId}> to enter this giveaway.`,
      bonusEntries: 0,
      totalEntries: 0
    };
  }

  if (giveaway.requirements.blockedRoleId && memberRoles.has(giveaway.requirements.blockedRoleId)) {
    return {
      eligible: false,
      reason: `You must not have <@&${giveaway.requirements.blockedRoleId}> to enter this giveaway.`,
      bonusEntries: 0,
      totalEntries: 0
    };
  }

  if (giveaway.requirements.requiredInvites && input.inviteCount < giveaway.requirements.requiredInvites) {
    return {
      eligible: false,
      reason: `You need at least ${giveaway.requirements.requiredInvites} invites to enter this giveaway.`,
      bonusEntries: 0,
      totalEntries: 0
    };
  }

  const bonusEntries = calculateRoleBonus(input.roleIds, giveaway.roleBonuses);
  return {
    eligible: true,
    bonusEntries,
    totalEntries: 1 + bonusEntries
  };
}

export function createEntrant(userId: string, bonusEntries: number, now = new Date()): GiveawayEntrant {
  return {
    userId,
    joinedAt: now.toISOString(),
    baseEntries: 1,
    bonusEntries,
    totalEntries: 1 + bonusEntries
  };
}

export function selectWeightedWinners(
  entrants: GiveawayEntrant[],
  winnerCount: number,
  excludedUserIds: string[] = [],
  random = Math.random
): string[] {
  const excluded = new Set(excludedUserIds);
  const candidates = entrants
    .filter((entrant) => !excluded.has(entrant.userId) && entrant.totalEntries > 0)
    .map((entrant) => ({ ...entrant }));
  const winners: string[] = [];

  while (winners.length < winnerCount && candidates.length > 0) {
    const totalWeight = candidates.reduce((total, entrant) => total + entrant.totalEntries, 0);
    let pick = random() * totalWeight;
    let selectedIndex = 0;

    for (let index = 0; index < candidates.length; index += 1) {
      pick -= candidates[index]?.totalEntries ?? 0;
      if (pick <= 0) {
        selectedIndex = index;
        break;
      }
    }

    const [selected] = candidates.splice(selectedIndex, 1);
    if (selected) {
      winners.push(selected.userId);
    }
  }

  return winners;
}
