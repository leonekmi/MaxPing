import {
  alertErrorMessage,
  createAlertStep1,
  createAlertStep2,
  createAlertStep3,
  createAlertStep4,
  noTrainsMessage,
  trainsPending,
} from "../utils/messages.js";
import { type Bot } from "grammy";
import { remove_keyboard } from "../utils/markups.js";
import { getDateButtons, keyboardButtonToDate } from "../utils/date.js";
import { getAndStoreMaxableTrains } from "../api/max_planner.js";
import { getStationLabel, getStations } from "../api/stations.js";
import { logger } from "../utils/logger.js";
import { MaxPlannerError } from "../utils/errors.js";
import { MaxErrors } from "../types/sncf.js";

import {
  createConversation,
  type ConversationFn,
} from "@grammyjs/conversations";
import type {
  AugmentedContext,
  AugmentedConversation,
} from "../types/grammy.js";
import { prisma } from "../api/prisma.js";
import { InlineQueryResult } from "grammy/types";
import { askStationCode, generateStations } from "../utils/conversation.js";

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
    await ctx.reply(createAlertStep1, {
      parse_mode: "HTML",
      reply_markup: generateStations(ctx),
    });
    const origin = await askStationCode(conversation);
    await ctx.reply(createAlertStep2(origin), {
      parse_mode: "HTML",
      reply_markup: generateStations(ctx),
    });
    const destination = await askStationCode(conversation);
    await ctx.reply(createAlertStep3(origin, destination), {
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
    const alert = await conversation.external(() => {
      if (!ctx.chat?.id) return;
      return prisma.alert.create({
        data: {
          uid: ctx.chat.id,
          date,
          destination,
          origin,
        },
      });
    });
    if (!alert) return;
    await conversation.external(async () => {
      try {
        const trains = await getAndStoreMaxableTrains(alert);
        logger.info({ trains }, "Alert (first) processed!");
        const isOriginInFavorites =
          conversation.session.favorites.favoriteStations?.includes(
            alert.origin
          );
        const isDestinationInFavorites =
          conversation.session.favorites.favoriteStations?.includes(
            alert.destination
          );
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
              !isOriginInFavorites
                ? [
                    {
                      text: `⭐ Ajouter ${getStationLabel(
                        alert.origin
                      )} aux favoris`,
                      callback_data: `add-favorite-${alert.origin}`,
                    },
                  ]
                : undefined,
              !isDestinationInFavorites
                ? [
                    {
                      text: `⭐ Ajouter ${getStationLabel(
                        alert.destination
                      )} aux favoris`,
                      callback_data: `add-favorite-${alert.destination}`,
                    },
                  ]
                : undefined,
            ].filter(Array.isArray),
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
        await prisma.alert.delete({
          where: { id: alert.id },
        });
      } finally {
        await ctx.api.deleteMessage(
          loadingMessage.chat.id,
          loadingMessage.message_id
        );
      }
    });
  };

const createInlineQueryResult = ([codeStation, station, isFavorite]: [
  string,
  string,
  boolean,
]): InlineQueryResult => ({
  type: "article",
  id: codeStation,
  title: isFavorite ? `⭐ ${station}` : station,
  description: codeStation,
  reply_markup: {
    inline_keyboard: [],
  },
  input_message_content: {
    message_text: `${codeStation}/${station}`,
  },
});

const sortStations = (
  [, aStation, isAFavorite]: [string, string, boolean],
  [, bStation, isBFavorite]: [string, string, boolean]
) => {
  if (isAFavorite && !isBFavorite) {
    return -1;
  } else if (!isAFavorite && isBFavorite) {
    return 1;
  }
  return aStation.localeCompare(bStation);
};

export default function (bot: Bot<AugmentedContext>) {
  bot.on("inline_query", async (ctx) => {
    const favoriteStations = ctx.session.favorites.favoriteStations || [];
    await ctx.answerInlineQuery(
      (ctx.inlineQuery.query.length > 0
        ? getStations(ctx.inlineQuery.query).map<
            Parameters<typeof createInlineQueryResult>[0]
          >((r) => [
            r.codeStation,
            r.station,
            favoriteStations.includes(r.codeStation),
          ])
        : favoriteStations.map<Parameters<typeof createInlineQueryResult>[0]>(
            (stationCode) => [stationCode, getStationLabel(stationCode), true]
          )
      )
        .sort(sortStations)
        .map(createInlineQueryResult)
        .slice(0, 50), // Telegram allows only 50 results,
      {
        next_offset: "",
        is_personal: true,
        button: {
          text: "Gérer vos gares préférées",
          start_parameter: "favorites-help",
        },
      }
    );
  });

  bot
    .use(createConversation(createAlert))
    .command("register_alert", async (ctx) => {
      await ctx.conversation.enter("createAlert", {
        overwrite: true,
      });
    });
}
