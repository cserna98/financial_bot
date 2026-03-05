import 'dotenv/config';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { AIService } from "./services/ai.js";
import { tools } from "./mcp/tools.js";
import { startWhatsAppBot } from "./bot/whatsapp.js"; // Asegúrate de exportar esta función
// import { startTelegramBot } from "./bot/telegram.js"; // Haz lo mismo con Telegram

async function bootstrap() {
    try {
        console.log("🏗️ Iniciando Orquestador...");

        // 1. CONECTAR AL SERVIDOR MCP (LA DB)
        const transport = new StdioClientTransport({
            command: "npx",
            args: ["tsx", "src/mcp/server.ts"] // La ruta que confirmamos
        });

        const mcpClient = new Client(
            { name: "finance-bot-client", version: "1.0.0" },
            { capabilities: {} }
        );

        await mcpClient.connect(transport);
        console.log("✅ Servidor MCP (Base de Datos) conectado.");

        // 2. INICIALIZAR EL CEREBRO DE IA
        const ai = new AIService(mcpClient, tools);
        console.log("🧠 Cerebro de IA listo.");

        // 3. ARRANCAR LOS CANALES (WhatsApp y/o Telegram)
        // Pasamos la misma 'ai' a ambos para que compartan la base de datos
        startWhatsAppBot(ai);
        console.log("📱 WhatsApp Channel: ON");

        // startTelegramBot(ai); // Cuando lo tengas listo para recibir 'ai'

    } catch (error) {
        console.error("❌ Fallo crítico en el arranque:", error);
    }
}

bootstrap();