import { Telegraf } from "telegraf";
import { getMaxableTrains } from "./api/max_planner.js";
import { PrismaClient } from '@prisma/client';

if (!process.env.BOT_TOKEN) {
  console.warn('You should set a bot token!');
  process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);
const prisma = new PrismaClient();

bot.command('/register_alert', async (ctx) => {
  ctx.sendChatAction('typing');

  ctx.sendMessage('pouet');
});

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));