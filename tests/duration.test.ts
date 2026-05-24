import { describe, expect, it } from "vitest";
import { parseDuration } from "../src/duration.js";

describe("parseDuration", () => {
  it("parses minutes, hours, days, and weeks", () => {
    expect(parseDuration("1m")).toBe(60_000);
    expect(parseDuration("2h")).toBe(7_200_000);
    expect(parseDuration("3d")).toBe(259_200_000);
    expect(parseDuration("1w")).toBe(604_800_000);
  });

  it("rejects invalid duration text", () => {
    expect(() => parseDuration("tomorrow")).toThrow("Use a duration");
    expect(() => parseDuration("0m")).toThrow("greater than 0");
  });
});
