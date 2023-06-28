import type { Bot } from "grammy";
import type { AugmentedContext } from "../types/grammy.js";
import { availableStationsCodes } from "../api/stations.js";
import {
  addAStationToFavorites,
  howToUseFavoritesStations,
  removeAStationFromFavorites,
  stationAddedToFavorites,
  stationRemovedFromFavorites,
} from "../utils/messages.js";
import { ConversationFn, createConversation } from "@grammyjs/conversations";
import { search_gare } from "../utils/markups.js";
import { askStationCode, generateStations } from "../utils/conversation.js";

async function addToFavorites(
  session: AugmentedContext["session"],
  ctx: AugmentedContext,
  station: string
) {
  session.favorites.favoriteStations ||= [];
  if (!session.favorites.favoriteStations.includes(station))
    session.favorites.favoriteStations.push(station);
  await ctx.reply(stationAddedToFavorites(station), {
    parse_mode: "HTML",
  });
}

async function removeFromFavorites(
  session: AugmentedContext["session"],
  ctx: AugmentedContext,
  station: string
) {
  session.favorites.favoriteStations ||= [];
  if (session.favorites.favoriteStations.includes(station))
    session.favorites.favoriteStations =
      session.favorites.favoriteStations.filter(
        (favoritedStation) => favoritedStation !== station
      );
  await ctx.reply(stationRemovedFromFavorites(station), {
    parse_mode: "HTML",
  });
}

const addFavoriteConversation: ConversationFn<AugmentedContext> =
  async function addFavorite(conversation, ctx) {
    await ctx.reply(addAStationToFavorites, {
      reply_markup: {
        inline_keyboard: [search_gare],
      },
    });
    const station = await askStationCode(conversation);
    await addToFavorites(conversation.session, ctx, station);
  };

const removeFavoriteConversation: ConversationFn<AugmentedContext> =
  async function removeFavorite(conversation, ctx) {
    await ctx.reply(removeAStationFromFavorites, {
      reply_markup: generateStations(ctx),
    });
    const station = await askStationCode(conversation);
    await removeFromFavorites(conversation.session, ctx, station);
  };

export default function (bot: Bot<AugmentedContext>) {
  bot.command("start", async (ctx, next) => {
    if (ctx.match === "favorites-help") {
      await ctx.reply(howToUseFavoritesStations);
    } else await next();
  });
  bot
    .use(createConversation(addFavoriteConversation))
    .command("add_favorite", async (ctx) => {
      await ctx.conversation.enter("addFavorite", {
        overwrite: true,
      });
    });
  bot
    .use(createConversation(removeFavoriteConversation))
    .command("remove_favorite", async (ctx) => {
      await ctx.conversation.enter("removeFavorite", {
        overwrite: true,
      });
    });
  bot.callbackQuery(/^add-favorite-([A-Z]{5})/, async (ctx) => {
    await ctx.answerCallbackQuery();
    if (!Array.isArray(ctx.match)) return;
    if (availableStationsCodes.includes(ctx.match[1]))
      await addToFavorites(ctx.session, ctx, ctx.match[1]);
  });
  bot.callbackQuery(/^del-favorite-([A-Z]{5})/, async (ctx) => {
    await ctx.answerCallbackQuery();
    if (!Array.isArray(ctx.match)) return;
    if (availableStationsCodes.includes(ctx.match[1]))
      await removeFromFavorites(ctx.session, ctx, ctx.match[1]);
  });
}
