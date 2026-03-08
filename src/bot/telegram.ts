// src/bot/telegram.ts
import { Telegraf } from "telegraf";
import { AIService } from "../services/ai.js";
import 'dotenv/config';

export function startTelegramBot(ai: AIService) {
    const bot = new Telegraf(process.env.TELEGRAM_TOKEN!);
    const MY_ID = Number(process.env.MY_TELEGRAM_ID);

    console.log("🏗️ Configurando canal de Telegram...");
    console.log("🏗️ Configurando canal de Telegram...");

    bot.on("text", async (ctx) => {
        if (ctx.from.id !== MY_ID) {
            console.log(`⚠️ Acceso bloqueado: ${ctx.from.id}`);
            return ctx.reply("Este bot es privado.");
        }

        await ctx.sendChatAction("typing");

        try {
            // Usamos la instancia de IA que viene desde el index
            const response = await ai.processMessage(ctx.message.text);

            // Validación Senior anti-mensajes vacíos
            const safeResponse = (response && response.trim().length > 0)
                ? response
                : "He procesado los datos, pero no pude generar un resumen. La operación fue exitosa.";

            await ctx.reply(safeResponse);
        } catch (error) {
            console.error("❌ Error en Telegram:", error);
            await ctx.reply("Hubo un error al procesar tu mensaje.");
        }
    });

    bot.launch();
    console.log("🚀 TELEGRAM Bot: ONLINE");
}