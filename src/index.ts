import { loadConfig } from "./config.js";
import { createGiveawayBot } from "./bot.js";

const config = loadConfig();
const client = createGiveawayBot(config);

await client.login(config.token);
