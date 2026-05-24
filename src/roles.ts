import type { RoleBonus } from "./types";

const roleTokenPattern = /<@&(?<mentionId>\d+)>|(?<plainId>\d{15,25})/g;

export function parseRoleBonuses(input: string | null | undefined): RoleBonus[] {
  if (!input?.trim()) {
    return [];
  }

  const bonuses: RoleBonus[] = [];
  const matches = [...input.matchAll(roleTokenPattern)];

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    if (!match) {
      continue;
    }

    const roleId = match.groups?.mentionId ?? match.groups?.plainId;
    const endIndex = match.index === undefined ? 0 : match.index + match[0].length;
    const nextIndex = matches[index + 1]?.index ?? input.length;
    const between = input.slice(endIndex, nextIndex);
    const entriesMatch = between.match(/\b(\d+)\b/);

    if (!roleId || !entriesMatch?.[1]) {
      throw new Error("Role bonuses must look like: @role 2 @role2 5");
    }

    const entries = Number(entriesMatch[1]);
    if (!Number.isSafeInteger(entries) || entries < 1 || entries > 1000) {
      throw new Error("Role bonus entries must be between 1 and 1000.");
    }

    bonuses.push({ roleId, entries });
  }

  if (bonuses.length === 0) {
    throw new Error("Role bonuses must include role mentions or role IDs.");
  }

  return bonuses;
}

export function parseRoleIds(input: string | null | undefined): string[] {
  if (!input?.trim()) {
    return [];
  }

  return [...new Set([...input.matchAll(roleTokenPattern)]
    .map((match) => match.groups?.mentionId ?? match.groups?.plainId)
    .filter((roleId): roleId is string => Boolean(roleId)))];
}

export function formatRoleList(roleIds: string[]): string {
  return roleIds.length > 0 ? roleIds.map((roleId) => `<@&${roleId}>`).join(", ") : "None";
}
