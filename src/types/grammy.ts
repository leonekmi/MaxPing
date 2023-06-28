import type { Conversation, ConversationFlavor } from "@grammyjs/conversations";
import type { Context, SessionFlavor } from "grammy";

interface Session {
  favorites: {
    favoriteStations?: string[];
  };
}
export type AugmentedContext = Context &
  SessionFlavor<Session> &
  ConversationFlavor;
export type AugmentedConversation = Conversation<AugmentedContext>;
