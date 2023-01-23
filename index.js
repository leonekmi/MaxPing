var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Telegraf } from "telegraf";
import { PrismaClient } from '@prisma/client';
if (!process.env.BOT_TOKEN) {
    console.warn('You should set a bot token!');
    process.exit(1);
}
const bot = new Telegraf(process.env.BOT_TOKEN);
const prisma = new PrismaClient();
bot.command('/register_alert', (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    ctx.sendChatAction('typing');
    ctx.sendMessage('pouet');
}));
bot.launch();
// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
