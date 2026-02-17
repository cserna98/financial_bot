import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Telegraf } from "telegraf";
import { AIService } from "../services/ai.js";
import { tools } from "../mcp/tools.js";
import 'dotenv/config';

// 1. Configuración del Bot y Seguridad
const bot = new Telegraf(process.env.TELEGRAM_TOKEN!);
const MY_ID = Number(process.env.MY_TELEGRAM_ID);

async function startFinancialBot() {
    console.log("🏗️  Iniciando infraestructura financiera...");

    // 2. Conexión al servidor MCP (El Chef)
    const transport = new StdioClientTransport({
        command: "npx",
        args: ["tsx", "src/mcp/server.ts"]
    });

    const mcpClient = new Client(
        { name: "finance-bot-client", version: "1.0.0" },
        { capabilities: {} }
    );

    await mcpClient.connect(transport);
    console.log("✅ Servidor MCP conectado.");

    // 3. Inicializar el Cerebro de la IA con Gemini 2.5 Flash Lite
    const ai = new AIService(mcpClient, tools);

    // 4. Lógica de mensajes
    bot.on("text", async (ctx) => {
        // Filtro de seguridad
        if (ctx.from.id !== MY_ID) {
            console.log(`⚠️ Intento de acceso bloqueado de ID: ${ctx.from.id}`);
            return ctx.reply("Este bot es privado.");
        }

        await ctx.sendChatAction("typing");

        try {
            const response = await ai.processMessage(ctx.message.text);

            // Usamos una función simple para limpiar caracteres que rompen el Markdown si es necesario
            // O simplemente enviamos el texto plano si prefieres seguridad total:
            await ctx.reply(response);
        } catch (error) {
            console.error("❌ Error enviando a Telegram:", error);
            // En caso de error, enviamos el texto sin formato para que no falle el "can't parse"
            await ctx.reply("Hubo un error de formato, pero la operación pudo haberse realizado.");
        }
    });

    bot.launch();
    console.log("🚀 BOT ONLINE (Gemini 2.5 Flash Lite)");
}

startFinancialBot().catch(console.error);