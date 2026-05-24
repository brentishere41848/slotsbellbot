const durationMultipliers = {
  m: 60_000,
  h: 60 * 60_000,
  d: 24 * 60 * 60_000,
  w: 7 * 24 * 60 * 60_000
} as const;

export function parseDuration(input: string): number {
  const match = input.trim().match(/^(\d+)\s*([mhdw])$/i);
  if (!match) {
    throw new Error("Use a duration like 1m, 1h, 1d, or 1w.");
  }

  const amountText = match[1];
  const unitText = match[2];
  if (!amountText || !unitText) {
    throw new Error("Use a duration like 1m, 1h, 1d, or 1w.");
  }

  const amount = Number(amountText);
  const unit = unitText.toLowerCase() as keyof typeof durationMultipliers;

  if (!Number.isSafeInteger(amount) || amount < 1) {
    throw new Error("Duration amount must be a whole number greater than 0.");
  }

  return amount * durationMultipliers[unit];
}

export function formatDiscordTimestamp(date: Date, style: "R" | "f" = "R"): string {
  return `<t:${Math.floor(date.getTime() / 1000)}:${style}>`;
}
