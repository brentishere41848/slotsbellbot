import { REST, Routes } from "discord.js";
import { loadConfig } from "./config.js";
import { commandJson } from "./commands.js";

const config = loadConfig();
const rest = new REST({ version: "10" }).setToken(config.token);

if (config.guildId) {
  console.log(`Registering ${commandJson.length} commands to guild ${config.guildId} for application ${config.clientId}...`);
  await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), {
    body: commandJson
  });
  console.log(`Registered ${commandJson.length} guild commands. Restart Discord or press Ctrl+R if they do not appear immediately.`);
} else {
  console.log(`DISCORD_GUILD_ID is empty. Registering ${commandJson.length} global commands for application ${config.clientId}...`);
  await rest.put(Routes.applicationCommands(config.clientId), {
    body: commandJson
  });
  console.log("Registered global commands. Global commands can take up to 1 hour to appear.");
}
