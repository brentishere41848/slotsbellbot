import { loadConfig } from "./config.js";
import { createGiveawayBot } from "./bot.js";

const config = loadConfig();
const client = createGiveawayBot(config);

function shutdown(signal: NodeJS.Signals): void {
  console.log(`Received ${signal}. Disconnecting Slotsbell...`);
  client.destroy();
  process.exit(0);
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

await client.login(config.token);
