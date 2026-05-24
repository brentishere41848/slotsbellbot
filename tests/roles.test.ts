import { describe, expect, it } from "vitest";
import { parseRoleBonuses, parseRoleIds } from "../src/roles.js";

describe("role parsing", () => {
  it("parses role bonus entries from mentions", () => {
    expect(parseRoleBonuses("<@&111111111111111111> 2 <@&222222222222222222> 5")).toEqual([
      { roleId: "111111111111111111", entries: 2 },
      { roleId: "222222222222222222", entries: 5 }
    ]);
  });

  it("parses plain role IDs and removes duplicates", () => {
    expect(parseRoleIds("111111111111111111 <@&111111111111111111> 222222222222222222")).toEqual([
      "111111111111111111",
      "222222222222222222"
    ]);
  });

  it("rejects malformed bonus input", () => {
    expect(() => parseRoleBonuses("<@&111111111111111111>")).toThrow("Role bonuses");
  });
});
