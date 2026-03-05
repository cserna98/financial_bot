import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import { GoogleGenerativeAI, ChatSession } from "@google/generative-ai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { AIService } from '../services/ai'; // Tu clase de IA

const app = express();
app.use(express.json());

const { WHATSAPP_TOKEN, PHONE_NUMBER_ID, VERIFY_TOKEN } = process.env;

// Variable global para la IA
let aiService: AIService;

// 1. FUNCIÓN PARA ARRANCAR EL MOTOR (MCP + IA)
async function initializeAI() {
    try {
        console.log("🔗 Conectando al servidor MCP...");

        // Configuramos el transporte (ajusta la ruta a tu servidor MCP de base de datos)
        const transport = new StdioClientTransport({
            command: "npx",
            args: ["tsx", "src/mcp-server/index.ts"] // <--- ASEGÚRATE QUE ESTA RUTA SEA CORRECTA
        });

        const mcpClient = new Client(
            { name: "whatsapp-bot-client", version: "1.0.0" },
            { capabilities: {} }
        );

        await mcpClient.connect(transport);
        const { tools } = await mcpClient.listTools();

        console.log(`✅ MCP Conectado. ${tools.length} herramientas disponibles.`);

        // Inicializamos tu clase AIService
        aiService = new AIService(mcpClient, tools);
        console.log("🧠 AIService inicializado y listo.");

    } catch (error) {
        console.error("❌ Error inicializando el motor de IA:", error);
        process.exit(1);
    }
}

// 2. WEBHOOK PARA MENSAJES

let ai: any; //

export const startWhatsAppBot = (aiInstance: any) => {

    ai = aiInstance; // Asignamos la instancia que viene del index
    console.log("🤖 IA vinculada al bot de WhatsApp");

    app.post('/webhook', async (req, res) => {
        console.log("--- 📥 NUEVA PETICIÓN ---");
        const messageData = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

        if (messageData) {
            const from = messageData.from;
            const msgText = messageData.text?.body;

            if (msgText) {
                console.log(`📩 De: ${from} | Mensaje: "${msgText}"`);

                try {
                    console.log("🤔 1. Llamando a la IA...");
                    // Agregamos un log justo antes de la IA
                    const respuestaIA = await ai.processMessage(msgText);
                    console.log("✅ 2. IA respondió:", respuestaIA);

                    console.log("📡 3. Enviando a Meta...");
                    const response = await axios.post(
                        `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`,
                        {
                            messaging_product: "whatsapp",
                            to: from,
                            type: "text",
                            text: { body: respuestaIA }
                        },
                        {
                            headers: {
                                Authorization: `Bearer ${WHATSAPP_TOKEN}`,
                                'Content-Type': 'application/json'
                            }
                        }
                    );
                    console.log("🏁 4. ¡ÉXITO! Meta aceptó el mensaje.");
                } catch (error: any) {
                    console.error("❌ ERROR EN EL PROCESO:");
                    if (error.response) {
                        console.error("Detalle de Meta:", JSON.stringify(error.response.data, null, 2));
                    } else {
                        console.error(error.message);
                    }
                }
            }
        }
        res.sendStatus(200);
    });

    // Validación del Webhook (lo que ya tenías)
    app.get('/webhook', (req, res) => {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            return res.status(200).send(challenge);
        }
        res.sendStatus(403);
    });

    app.listen(3000, () => {
        console.log("🚀 WhatsApp escuchando en puerto 3000");
    });
};

