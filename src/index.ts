// index.ts
import 'dotenv/config';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { AIService } from "./services/ai.js";
import { tools } from "./mcp/tools.js";
import { startWhatsAppBot } from "./bot/whatsapp.js";
import { startTelegramBot } from "./bot/telegram.js"; // <--- 1. Importar aquí

async function bootstrap() {
    try {
        console.log("🏗️ Iniciando Orquestador...");

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

        const ai = new AIService(mcpClient, tools);
        console.log("🧠 Cerebro de IA listo.");

        // 2. ARRANCAR AMBOS CANALES
        startWhatsAppBot(ai);
        console.log("📱 WhatsApp Channel: ON");

        startTelegramBot(ai); // <--- 3. Activar aquí

    } catch (error) {
        console.error("❌ Fallo crítico:", error);
    }
}

bootstrap();