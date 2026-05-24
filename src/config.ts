import { resolve } from "node:path";
import "dotenv/config";

export type BotConfig = {
  token: string;
  clientId: string;
  guildId?: string;
  storagePath: string;
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required. Copy .env.example to .env and fill it in.`);
  }
  return value;
}

export function loadConfig(): BotConfig {
  const guildId = process.env.DISCORD_GUILD_ID;
  const storagePath = process.env.GIVEAWAY_STORAGE_PATH ?? resolve(process.cwd(), "data/giveaways.json");
  const config: BotConfig = {
    token: requiredEnv("DISCORD_TOKEN"),
    clientId: requiredEnv("DISCORD_CLIENT_ID"),
    storagePath
  };

  if (guildId) {
    config.guildId = guildId;
  }

  return config;
}
