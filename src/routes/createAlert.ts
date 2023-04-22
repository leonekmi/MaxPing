import {
  alertErrorMessage,
  cancelMessage,
  createAlertStep1,
  createAlertStep2,
  createAlertStep3,
  createAlertStep4,
  noTrainsMessage,
  trainsPending,
} from "../utils/messages.js";
import { Alert } from "@prisma/client";
import { type Bot } from "grammy";
import { gare, remove_keyboard } from "../utils/markups.js";
import { getDateButtons, keyboardButtonToDate } from "../utils/date.js";
import { getAndCacheMaxableTrains } from "../api/max_planner.js";
import { getStations } from "../api/stations.js";
import { logger } from "../utils/logger.js";
import { MaxPlannerError } from "../utils/errors.js";

export default function (bot: Bot) {
  const pending: Map<number, Partial<Alert>> = new Map();

  bot.command("register_alert", async (ctx) => {
    pending.set(ctx.chat.id, {
      uid: ctx.chat.id,
    });
    await ctx.reply(createAlertStep1, {
      parse_mode: "HTML",
      reply_markup: gare,
    });
  });

  bot.hears(/^(?:[A-Z]{5})/, async (ctx) => {
    if (!ctx.chat || !ctx.message || !ctx.message.text) return; // Channel updates, someone quits, etc.
    const pendingEntry = pending.get(ctx.chat.id);
    if (!pendingEntry) {
      await ctx.reply(
        "Merci de commencer par /register_alert en premier temps",
        {
          reply_markup: remove_keyboard,
        }
      );
      return;
    }
    const resaRail = ctx.message.text.slice(0, 5);
    if (!pendingEntry.origin) {
      pendingEntry.origin = resaRail;
      await ctx.reply(createAlertStep2(pendingEntry), {
        parse_mode: "HTML",
        reply_markup: gare,
      });
    } else if (!pendingEntry.destination) {
      pendingEntry.destination = resaRail;
      await ctx.reply(createAlertStep3(pendingEntry), {
        parse_mode: "HTML",
        reply_markup: {
          keyboard: getDateButtons(),
          selective: true,
          one_time_keyboard: true,
        },
      });
    }
  });

  bot.hears(/(?:lun.|mar.|mer.|jeu.|ven.|sam.|dim.)/, async (ctx) => {
    if (!ctx.chat || !ctx.message || !ctx.message.text) return; // Channel updates, someone quits, etc.
    const pendingEntry = pending.get(ctx.chat.id);
    if (!pendingEntry) {
      await ctx.reply(
        "Merci de commencer par /register_alert en premier temps",
        {
          reply_markup: remove_keyboard,
        }
      );
      return;
    }
    if (pendingEntry.origin && pendingEntry.destination && !pendingEntry.date) {
      pendingEntry.date = keyboardButtonToDate(ctx.message.text);
      const message = await ctx.reply(trainsPending, {
        reply_markup: remove_keyboard,
      });
      await ctx.replyWithChatAction("typing");
      try {
        const [trains, alertId] = await getAndCacheMaxableTrains(
          pendingEntry as Required<Alert>
        );
        logger.info({ trains }, "Alert (first) processed!");
        await ctx.reply(createAlertStep4(pendingEntry, trains.length), {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "🚄 Voir les trains",
                  callback_data: "show-alert-" + alertId,
                },
                { text: "🔎 Voir vos alertes", callback_data: "show-alerts" },
              ],
            ],
          },
        });
      } catch (err) {
        if (err instanceof MaxPlannerError) {
          // This code is returned when there is no eligible trains (eligible, not available)
          if (err.code === "SYG_40416") {
            logger.info({ err }, "No OD");
            await ctx.reply(noTrainsMessage, {
              parse_mode: "HTML",
            });
          } else {
            logger.warn({ err }, "Unexpected Max Planner error");
            await ctx.reply(alertErrorMessage(err), {
              parse_mode: "HTML",
            });
          }
        }
      } finally {
        await ctx.api.deleteMessage(message.chat.id, message.message_id);
        pending.delete(ctx.chat.id);
      }
    }
  });

  bot.inlineQuery(/\w+/, async (ctx) => {
    await ctx.answerInlineQuery(
      ctx.inlineQuery.query.length > 2
        ? getStations(ctx.inlineQuery.query).map((r) => ({
            type: "article",
            id: r.codeStation,
            title: r.station,
            description: r.codeStation,
            input_message_content: {
              message_text: `${r.codeStation}/${r.station}`,
            },
          }))
        : [],
      {
        next_offset: "",
      }
    );
  });

  bot.command("cancel", async (ctx) => {
    pending.delete(ctx.chat.id);
    await ctx.reply(cancelMessage);
  });
}
