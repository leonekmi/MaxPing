import { type Bot } from "grammy";
import { getAlertsOfUser } from "../api/prisma.js";
import { startProcessingLoop } from "../utils/diff.js";
import { alerts_menu, remove_keyboard } from "../utils/markups.js";
import { viewAlerts } from "../utils/messages.js";

export default function (bot: Bot) {
  startProcessingLoop();
  bot.on("callback_query:data", async (ctx, next) => {
    if (!ctx.chat || !ctx.callbackQuery.message) return;
    if (ctx.callbackQuery.data === "show-alerts") {
      const alerts = await getAlertsOfUser(ctx.chat.id);
      await ctx.reply(viewAlerts(alerts), {
        parse_mode: "HTML",
        reply_markup: alerts.length ? alerts_menu : remove_keyboard,
      });
      await ctx.answerCallbackQuery();
    } else {
      await next();
    }
  });
}
