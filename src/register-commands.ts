import { REST, Routes } from "discord.js";
import { loadConfig } from "./config";
import { commandJson } from "./commands";

const config = loadConfig();
const rest = new REST({ version: "10" }).setToken(config.token);

if (config.guildId) {
  await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), {
    body: commandJson
  });
  console.log(`Registered ${commandJson.length} giveaway commands for guild ${config.guildId}.`);
} else {
  await rest.put(Routes.applicationCommands(config.clientId), {
    body: commandJson
  });
  console.log(`Registered ${commandJson.length} global giveaway commands.`);
}
