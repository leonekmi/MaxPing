import { config } from "dotenv";
import { Bot, session } from "grammy";
import { cancelMessage, welcomeMessage } from "./utils/messages.js";
import createAlert from "./routes/createAlert.js";
import showAlerts from "./routes/showAlerts.js";
import alerting from "./routes/alerting.js";
import { logger } from "./utils/logger.js";
import { initInflux } from "./api/influxdb.js";
import { AugmentedContext } from "./types/grammy.js";
import { FixedPrismaAdapter, prisma } from "./api/prisma.js";
import favorites from "./routes/favorites.js";
import { conversations } from "@grammyjs/conversations";

config();

if (!process.env.BOT_TOKEN) {
  logger.fatal("You should set a bot token!");
  process.exit(1);
}

initInflux();

export const bot = new Bot<AugmentedContext>(process.env.BOT_TOKEN);

// Add session and conversations support

bot.use(
  session({
    type: "multi",
    favorites: {
      getSessionKey(ctx) {
        return `user/favorites/${ctx.from?.id}`;
      },
      initial: () => ({
        favoriteStations: [],
      }),
      storage: new FixedPrismaAdapter(prisma.grammYSession),
    },
    conversation: {
      getSessionKey(ctx) {
        if (!ctx.chat?.id) return undefined;
        return `chat/conversation/${ctx.chat?.id}`;
      },
      storage: new FixedPrismaAdapter(prisma.grammYSession),
    },
  })
);

bot.catch((err) => {
  logger.error({ err: err.error, msg: err.message }, "MIDDLEWARE ERROR");
  if (err.ctx.chat) {
    void err.ctx
      .reply(
        "🤯 MaxPing a planté lors du traitement d'une de vos demandes ! @leonekmi pour support."
      )
      .catch((fatalErr) => {
        logger.fatal({ err: fatalErr }, "ERROR WHILE SENDING ERROR MESSAGE");
      });
  }
  return;
});

bot.command("start", async (ctx, next) => {
  // this middleware does not handle deep-links
  if (ctx.match) return next();
  await ctx.reply(welcomeMessage, { parse_mode: "HTML" });
});

bot.use(conversations()).command("cancel", async (ctx) => {
  await ctx.conversation.exit();
  await ctx.reply(cancelMessage);
});

// Handling alert creation
createAlert(bot);

// Handling alert management
showAlerts(bot);

// Processing loop for alerts
alerting(bot);

// Favorites
favorites(bot);

void bot.start();

// Enable graceful stop
process.once("SIGINT", () => bot.stop());
process.once("SIGTERM", () => bot.stop());
