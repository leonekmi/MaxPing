import type { Conversation, ConversationFlavor } from "@grammyjs/conversations";
import type { Context, SessionFlavor } from "grammy";

export type AugmentedContext = Context &
  SessionFlavor<Record<string, never>> &
  ConversationFlavor;
export type AugmentedConversation = Conversation<AugmentedContext>;
