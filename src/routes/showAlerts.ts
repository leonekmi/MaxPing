import { type Bot } from "grammy";
import {
  getAlertsOfUser,
  countAlertsOfUser,
  dropAlert,
  getAlert,
  getAlertIndex,
} from "../api/prisma.js";
import { processAlert } from "../utils/diff.js";
import {
  alerts_menu,
  remove_keyboard,
  show_alert_menu,
} from "../utils/markups.js";
import { viewAlerts, showAlert } from "../utils/messages.js";

export default function (bot: Bot) {
  bot.command("show_alerts", async (ctx) => {
    const alerts = await getAlertsOfUser(ctx.chat.id);
    await ctx.reply(viewAlerts(alerts), {
      parse_mode: "HTML",
      reply_markup: alerts.length ? alerts_menu : remove_keyboard,
    });
  });

  bot.command("show_alert", async (ctx) => {
    let alertIndex = parseInt(ctx.match);
    if (isNaN(alertIndex)) alertIndex = 0;
    const alertCount = await countAlertsOfUser(ctx.chat.id);
    const [alert] = await getAlertsOfUser(ctx.chat.id, alertIndex);
    if (!alert) {
      await ctx.reply("❌ Aucune alerte trouvée", {
        reply_markup: remove_keyboard,
      });
      return;
    }
    await ctx.reply(showAlert(alert), {
      parse_mode: "HTML",
      reply_markup: show_alert_menu(alert.id, alertCount, alertIndex),
    });
  });

  bot.on("callback_query:data", async (ctx, next) => {
    if (!ctx.chat || !ctx.callbackQuery.message) return;
    if (ctx.callbackQuery.data.startsWith("delete-alert-")) {
      const alertId = parseInt(ctx.callbackQuery.data.slice(13));
      if (isNaN(alertId)) {
        await ctx.answerCallbackQuery(
          "Erreur dans le traitement de la requête"
        );
        return;
      } else {
        const alert = await getAlert(alertId);
        if (!alert) {
          await ctx.answerCallbackQuery("Cette alerte n'existe plus.");
          return;
        }
        // Assert that the alert belongs to the user
        if (alert.uid !== ctx.chat.id) {
          await ctx.answerCallbackQuery(
            "Vous pouvez supprimer cette alerte uniquement depuis le chat dans laquelle elle a été créée."
          );
          return;
        }
        await dropAlert(alertId);
        await ctx.answerCallbackQuery("Alerte supprimée avec succès");
        await bot.api.editMessageText(
          ctx.chat.id,
          ctx.callbackQuery.message.message_id,
          "<i>❌ Alerte supprimée</i>",
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "🔎 Voir vos autres alertes",
                    callback_data: "show-alerts",
                  },
                ],
              ],
            },
          }
        );
      }
    } else if (ctx.callbackQuery.data.startsWith("show-alert-")) {
      const alertId = parseInt(ctx.callbackQuery.data.slice(11));
      if (isNaN(alertId)) {
        await ctx.answerCallbackQuery(
          "Erreur dans le traitement de la requête"
        );
        return;
      } else {
        const alert = await getAlert(alertId);
        if (!alert) {
          await ctx.answerCallbackQuery("Cette alerte n'existe plus.");
          return;
        }
        // Assert that the alert belongs to the user
        if (alert.uid !== ctx.chat.id) {
          await ctx.answerCallbackQuery(
            "Vous pouvez voir cette alerte uniquement depuis le chat dans laquelle elle a été créée."
          );
          return;
        }
        const [alertIndex, alertCount] = await getAlertIndex(
          ctx.chat.id,
          alert.id
        );
        console.log(alertIndex, alertCount);
        await ctx.answerCallbackQuery();
        await bot.api.sendMessage(
          ctx.chat.id,
          showAlert(alert, alertIndex + 1),
          {
            parse_mode: "HTML",
            reply_markup: show_alert_menu(alert.id, alertCount, alertIndex),
          }
        );
      }
    } else if (ctx.callbackQuery.data === "change-alert-menu") {
      const alerts = await getAlertsOfUser(ctx.chat.id);
      await ctx.api.editMessageText(
        ctx.chat.id,
        ctx.callbackQuery.message.message_id,
        viewAlerts(alerts),
        {
          parse_mode: "HTML",
          reply_markup: alerts_menu,
        }
      );
    } else if (ctx.callbackQuery.data.startsWith("change-alert-")) {
      const alertIndex = parseInt(ctx.callbackQuery.data.slice(13));
      if (isNaN(alertIndex)) {
        await ctx.answerCallbackQuery(
          "Erreur dans le traitement de la requête"
        );
        return;
      } else {
        const alertCount = await countAlertsOfUser(ctx.chat.id);
        const [alert] = await getAlertsOfUser(ctx.chat.id, alertIndex);
        if (!alert) {
          await ctx.answerCallbackQuery("Cette alerte n'existe plus.");
          return;
        }
        await ctx.api.editMessageText(
          ctx.chat.id,
          ctx.callbackQuery.message.message_id,
          showAlert(alert, alertIndex + 1),
          {
            parse_mode: "HTML",
            reply_markup: show_alert_menu(alert.id, alertCount, alertIndex),
          }
        );
      }
    } else if (ctx.callbackQuery.data.startsWith("refresh-alert-")) {
      const alertId = parseInt(ctx.callbackQuery.data.slice(14));
      if (isNaN(alertId)) {
        await ctx.answerCallbackQuery(
          "Erreur dans le traitement de la requête"
        );
        return;
      } else {
        const alert = await getAlert(alertId);
        if (!alert) {
          await ctx.answerCallbackQuery("Cette alerte n'existe plus.");
          return;
        }
        // Assert that the alert belongs to the user
        if (alert.uid !== ctx.chat.id) {
          await ctx.answerCallbackQuery(
            "Vous pouvez rafraîchir cette alerte uniquement depuis le chat dans laquelle elle a été créée."
          );
          return;
        }
        await processAlert(alert);
        await ctx.answerCallbackQuery("Alerte rafraîchie avec succès");
      }
    } else {
      await next();
    }
  });
}
