import {
  InlineKeyboardButton,
  InlineKeyboardMarkup,
  ReplyKeyboardRemove,
} from "grammy/types";

export const search_gare: InlineKeyboardButton[] = [
  { text: "Chercher une gare", switch_inline_query_current_chat: "" },
];

export const remove_keyboard: ReplyKeyboardRemove = {
  remove_keyboard: true,
};

export const alerts_menu: InlineKeyboardMarkup = {
  inline_keyboard: [
    [{ text: "Première alerte ▶️", callback_data: "change-alert-0" }],
  ],
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
              text: "◀️ Liste des alertes",
              callback_data: "change-alert-menu",
            },
            {
              text: "Alerte suivante ▶️",
              callback_data: "change-alert-" + (alertIndex + 1),
            },
          ],
        ]
      : []),
    ...(alertIndex === 0 && alertCount === 1
      ? [
          [
            {
              text: "◀️ Liste des alertes",
              callback_data: "change-alert-menu",
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
