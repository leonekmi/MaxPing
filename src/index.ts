import { config } from "dotenv";
import { Bot } from "grammy";
import { welcomeMessage } from "./utils/messages.js";
import createAlert from "./routes/createAlert.js";
import showAlerts from "./routes/showAlerts.js";
import alerting from "./routes/alerting.js";
import { logger } from "./utils/logger.js";
import { initInflux } from "./api/influxdb.js";

config();

if (!process.env.BOT_TOKEN) {
  logger.fatal("You should set a bot token!");
  process.exit(1);
}

initInflux();

export const bot = new Bot(process.env.BOT_TOKEN);

bot.catch((err) => {
  logger.error({ err }, "MIDDLEWARE ERROR");
  err.ctx
    .reply(
      "🤯 MaxPing a planté lors du traitement d'une de vos demandes ! @leonekmi pour support."
    )
    .catch((fatalErr) => {
      logger.fatal({ err: fatalErr }, "ERROR WHILE SENDING ERROR MESSAGE");
    });
  return;
});

bot.command("start", async (ctx) => {
  await ctx.reply(welcomeMessage, { parse_mode: "HTML" });
});

// Handling alert creation
createAlert(bot);

// Handling alert management
showAlerts(bot);

// Processing loop for alerts
alerting(bot);

void bot.start();

// Enable graceful stop
process.once("SIGINT", () => bot.stop());
process.once("SIGTERM", () => bot.stop());
