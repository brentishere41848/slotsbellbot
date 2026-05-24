import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { GiveawayRecord, GiveawayStore, GuildSettings } from "./types.js";

const emptyStore = (): GiveawayStore => ({
  giveaways: {},
  guildSettings: {}
});

export class JsonGiveawayStorage {
  constructor(private readonly filePath: string) {}

  async read(): Promise<GiveawayStore> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as GiveawayStore;
      return {
        giveaways: parsed.giveaways ?? {},
        guildSettings: parsed.guildSettings ?? {}
      };
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        return emptyStore();
      }
      throw error;
    }
  }

  async write(store: GiveawayStore): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  }

  async upsertGiveaway(giveaway: GiveawayRecord): Promise<void> {
    const store = await this.read();
    store.giveaways[giveaway.messageId] = giveaway;
    await this.write(store);
  }

  async updateGiveaway(messageId: string, update: (giveaway: GiveawayRecord) => GiveawayRecord): Promise<GiveawayRecord> {
    const store = await this.read();
    const current = store.giveaways[messageId];
    if (!current) {
      throw new Error("Giveaway was not found.");
    }

    const next = update(current);
    store.giveaways[messageId] = next;
    await this.write(store);
    return next;
  }

  async deleteGiveaway(messageId: string): Promise<void> {
    const store = await this.read();
    delete store.giveaways[messageId];
    await this.write(store);
  }

  async listActiveGiveaways(): Promise<GiveawayRecord[]> {
    const store = await this.read();
    return Object.values(store.giveaways).filter((giveaway) => giveaway.status === "active");
  }

  async getGiveaway(messageId: string): Promise<GiveawayRecord | undefined> {
    const store = await this.read();
    return store.giveaways[messageId];
  }

  async getGuildSettings(guildId: string): Promise<GuildSettings> {
    const store = await this.read();
    return store.guildSettings[guildId] ?? {
      guildId,
      managerRoleIds: [],
      creatorRoleIds: []
    };
  }

  async setGuildSettings(settings: GuildSettings): Promise<void> {
    const store = await this.read();
    store.guildSettings[settings.guildId] = settings;
    await this.write(store);
  }
}
