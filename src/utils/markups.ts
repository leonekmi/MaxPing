import {
  InlineKeyboardMarkup,
  ReplyKeyboardRemove,
} from "grammy/out/types.node.js";

export const gare: InlineKeyboardMarkup = {
  inline_keyboard: [
    [{ text: "Chercher une gare", switch_inline_query_current_chat: "" }],
  ],
};

export const remove_keyboard: ReplyKeyboardRemove = {
  remove_keyboard: true,
};

export const show_alert_menu = (
  alertId: number,
  alertCount: number,
  alertIndex: number
): InlineKeyboardMarkup => ({
  inline_keyboard: [
    [
      {
        text: "❌ Supprimer l'alerte",
        callback_data: "delete-alert-" + alertId,
      },
    ],
    [
      {
        text: "🔁 Forcer une actualisation",
        callback_data: "refresh-alert-" + alertId,
      },
    ],
    ...(alertCount === alertIndex + 1 && alertCount > 1
      ? [
          [
            {
              text: "◀️ Alerte précédente",
              callback_data: "change-alert-" + (alertIndex - 1),
            },
          ],
        ]
      : []),
    ...(alertIndex === 0 && alertCount > 1
      ? [
          [
            {
              text: "Alerte suivante ▶️",
              callback_data: "change-alert-" + (alertIndex + 1),
            },
          ],
        ]
      : []),
    ...(alertIndex !== 0 && alertCount > alertIndex + 1
      ? [
          [
            {
              text: "◀️ Alerte précédente",
              callback_data: "change-alert-" + (alertIndex - 1),
            },
            {
              text: "Alerte suivante ▶️",
              callback_data: "change-alert-" + (alertIndex + 1),
            },
          ],
        ]
      : []),
  ],
});
