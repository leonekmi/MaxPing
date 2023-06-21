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
import type { Bot } from "grammy";
import { gare, remove_keyboard } from "../utils/markups.js";
import { getDateButtons, keyboardButtonToDate } from "../utils/date.js";
import { getAndCacheMaxableTrains } from "../api/max_planner.js";
import { availableStationsCodes, getStations } from "../api/stations.js";
import { logger } from "../utils/logger.js";
import { MaxPlannerError } from "../utils/errors.js";
import { MaxErrors } from "../types/sncf.js";
import {
  conversations,
  createConversation,
  type ConversationFn,
} from "@grammyjs/conversations";
import type {
  AugmentedContext,
  AugmentedConversation,
} from "../types/grammy.js";
import { prisma } from "../api/prisma.js";

async function askStationCode(
  conversation: AugmentedConversation
): Promise<string> {
  for (;;) {
    const ctx = await conversation.waitForHears(/^(?:[A-Z]{5})/);
    if (!ctx.chat || !ctx.message || !ctx.message.text) continue; // Channel updates, someone quits, etc.
    const pendingCode = ctx.message.text.slice(0, 5);
    if (!availableStationsCodes.includes(pendingCode)) {
      await ctx.reply("Merci de rentrer un code gare valide");
      continue;
    }
    return pendingCode;
  }
}

async function askDate(conversation: AugmentedConversation): Promise<Date> {
  for (;;) {
    const ctx = await conversation.waitForHears(
      /(?:lun.|mar.|mer.|jeu.|ven.|sam.|dim.)/
    );
    if (!ctx.chat || !ctx.message || !ctx.message.text) continue; // Channel updates, someone quits, etc.
    const pendingDate = keyboardButtonToDate(ctx.message.text);
    if (!pendingDate) {
      await ctx.reply("Merci de rentrer une date valide");
      continue;
    }
    return pendingDate;
  }
}

const createAlert: ConversationFn<AugmentedContext> =
  async function createAlert(conversation, ctx) {
    if (!ctx.chat?.id) return;
    await ctx.reply(createAlertStep1, {
      parse_mode: "HTML",
      reply_markup: gare,
    });
    const originId = await askStationCode(conversation);
    await ctx.reply(createAlertStep2(originId), {
      parse_mode: "HTML",
      reply_markup: gare,
    });
    const destinationId = await askStationCode(conversation);
    await ctx.reply(createAlertStep3(originId, destinationId), {
      parse_mode: "HTML",
      reply_markup: {
        keyboard: getDateButtons(),
        selective: true,
        one_time_keyboard: true,
      },
    });
    const date = await askDate(conversation);
    const loadingMessage = await ctx.reply(trainsPending, {
      reply_markup: remove_keyboard,
    });
    await ctx.replyWithChatAction("typing");
    await conversation.external(async () => {
      try {
        if (!ctx.chat?.id) return;
        const alert = await prisma.alert.create({
          data: {
            date,
            uid: ctx.chat.id,
            itinerary: {
              connectOrCreate: {
                create: {
                  originId,
                  destinationId,
                },
                where: {
                  originId_destinationId: {
                    originId,
                    destinationId,
                  },
                },
              },
            },
          },
          include: {
            itinerary: true,
          },
        });
        const trains = await getAndCacheMaxableTrains(alert);
        logger.info({ trains }, "Alert (first) processed!");
        await ctx.reply(createAlertStep4(alert, trains.length), {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "🚄 Voir les trains",
                  callback_data: "show-alert-" + alert.id,
                },
                { text: "🔎 Voir vos alertes", callback_data: "show-alerts" },
              ],
            ],
          },
        });
      } catch (err) {
        if (err instanceof MaxPlannerError) {
          // This code is returned when there is no eligible trains (eligible, not available)
          if (err.code === MaxErrors.NO_OD) {
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
        } else {
          logger.error({ err }, "Unexpected error");
        }
      } finally {
        await ctx.api.deleteMessage(
          loadingMessage.chat.id,
          loadingMessage.message_id
        );
      }
    });
  };

export default function (bot: Bot<AugmentedContext>) {
  bot.on("inline_query", async (ctx) => {
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

  bot.use(conversations()).command("cancel", async (ctx) => {
    await ctx.conversation.exit();
    await ctx.reply(cancelMessage);
  });

  bot
    .use(createConversation(createAlert))
    .command("register_alert", async (ctx) => {
      await ctx.conversation.enter("createAlert", {
        overwrite: true,
      });
    });
}
