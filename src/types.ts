export type GiveawayStatus = "active" | "ended";

export type RoleBonus = {
  roleId: string;
  entries: number;
};

export type GiveawayRequirements = {
  requiredRoleId?: string;
  blockedRoleId?: string;
  requiredInvites?: number;
};

export type GiveawayEntrant = {
  userId: string;
  joinedAt: string;
  baseEntries: number;
  bonusEntries: number;
  totalEntries: number;
};

export type GiveawayRecord = {
  id: string;
  guildId: string;
  channelId: string;
  messageId: string;
  prize: string;
  hostId: string;
  winnerCount: number;
  createdAt: string;
  endsAt: string;
  status: GiveawayStatus;
  entrants: Record<string, GiveawayEntrant>;
  roleBonuses: RoleBonus[];
  requirements: GiveawayRequirements;
  creatorId: string;
  managerRoleIds: string[];
  creatorRoleIds: string[];
  winnerRoleId?: string;
  createMessage?: string;
  winnersDmMessage?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  color?: number;
  endColor?: number;
  winnerIds: string[];
  previousWinnerIds: string[];
};

export type GuildSettings = {
  guildId: string;
  managerRoleIds: string[];
  creatorRoleIds: string[];
};

export type GiveawayStore = {
  giveaways: Record<string, GiveawayRecord>;
  guildSettings: Record<string, GuildSettings>;
};
