import { InlineKeyboardMarkup, InlineKeyboardButton } from "grammy/types";
import { availableStationsCodes, getStationLabel } from "../api/stations.js";
import { AugmentedContext, AugmentedConversation } from "../types/grammy.js";
import { search_gare } from "./markups.js";

function findStationCode(ctx: AugmentedContext) {
  if (ctx.hasText(/^([A-Z]{5})/)) {
    return ctx.match[1];
  }
  if (
    ctx.hasCallbackQuery(/^station-([A-Z]{5})$/) &&
    Array.isArray(ctx.match)
  ) {
    void ctx.answerCallbackQuery();
    return ctx.match[1];
  }
}

export async function askStationCode(
  conversation: AugmentedConversation
): Promise<string> {
  for (;;) {
    const ctx = await conversation.wait();
    const pendingCode = findStationCode(ctx);
    if (!pendingCode) continue;
    if (!availableStationsCodes.includes(pendingCode)) {
      await ctx.reply("Merci de rentrer un code gare valide");
      continue;
    }
    return pendingCode;
  }
}

export function generateStations(ctx: AugmentedContext): InlineKeyboardMarkup {
  const favoriteButtons =
    ctx.session.favorites.favoriteStations?.map<InlineKeyboardButton>(
      (station) => ({
        text: `⭐ ${getStationLabel(station)}`,
        callback_data: `station-${station}`,
      })
    ) || [];
  return {
    inline_keyboard: [
      search_gare,
      ...favoriteButtons.reduce<InlineKeyboardButton[][]>(
        (buttonRows, button, index) => {
          const chunkIndex = Math.floor(index / 2);

          if (!buttonRows[chunkIndex]) {
            buttonRows[chunkIndex] = []; // start a new chunk
          }

          buttonRows[chunkIndex].push(button);

          return buttonRows;
        },
        []
      ),
    ],
  };
}
