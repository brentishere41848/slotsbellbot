import { describe, expect, it } from "vitest";
import { checkEligibility, createEntrant, selectWeightedWinners } from "../src/giveaway";
import type { GiveawayRecord } from "../src/types";

function baseGiveaway(): GiveawayRecord {
  return {
    id: "giveaway-1",
    guildId: "guild-1",
    channelId: "channel-1",
    messageId: "message-1",
    prize: "Nitro",
    hostId: "host-1",
    winnerCount: 1,
    createdAt: new Date(0).toISOString(),
    endsAt: new Date(60_000).toISOString(),
    status: "active",
    entrants: {},
    roleBonuses: [{ roleId: "vip", entries: 4 }],
    requirements: {
      requiredRoleId: "member",
      blockedRoleId: "banned",
      requiredInvites: 2
    },
    creatorId: "creator-1",
    managerRoleIds: [],
    creatorRoleIds: [],
    winnerIds: [],
    previousWinnerIds: []
  };
}

describe("giveaway eligibility", () => {
  it("adds role bonus entries for eligible members", () => {
    const result = checkEligibility(baseGiveaway(), {
      userId: "user-1",
      roleIds: ["member", "vip"],
      inviteCount: 2
    });

    expect(result).toMatchObject({
      eligible: true,
      bonusEntries: 4,
      totalEntries: 5
    });
  });

  it("blocks users missing requirements", () => {
    const result = checkEligibility(baseGiveaway(), {
      userId: "user-1",
      roleIds: ["vip"],
      inviteCount: 2
    });

    expect(result.eligible).toBe(false);
    expect(result.reason).toContain("must have");
  });
});

describe("winner selection", () => {
  it("selects weighted winners without duplicates", () => {
    const winners = selectWeightedWinners([
      createEntrant("a", 0),
      createEntrant("b", 4)
    ], 2, [], () => 0.99);

    expect(winners).toEqual(["b", "a"]);
  });

  it("excludes previous winners", () => {
    const winners = selectWeightedWinners([
      createEntrant("a", 0),
      createEntrant("b", 0)
    ], 2, ["a"], () => 0);

    expect(winners).toEqual(["b"]);
  });
});
