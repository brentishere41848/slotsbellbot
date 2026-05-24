import { loadConfig } from "./config";
import { createGiveawayBot } from "./bot";

const config = loadConfig();
const client = createGiveawayBot(config);

await client.login(config.token);
