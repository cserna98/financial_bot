import { GoogleGenerativeAI, ChatSession } from "@google/generative-ai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import 'dotenv/config';

export class AIService {
    private model: any;
    private chat: any;
    private lastInitDate: string = "";
    private genAI: GoogleGenerativeAI;

    constructor(private mcpClient: Client, private tools: any[]) {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        this.initializeModel();
    }

    private initializeModel() {
        this.lastInitDate = new Date().toISOString().split('T')[0];
        const systemInstruction = this.getSystemInstruction();

        this.model = this.genAI.getGenerativeModel({
            model: "gemini-2.5-flash-lite", // Revertido al modelo original
            tools: [{
                functionDeclarations: this.tools.map(t => ({
                    name: t.name,
                    description: t.description,
                    parameters: t.inputSchema as any
                }))
            }],
            systemInstruction: systemInstruction
        });

        this.chat = this.model.startChat();
        console.log(`🧠 Cerebro de IA inicializado con fecha focal: ${this.lastInitDate}`);
    }

    async processMessage(userInput: string) {
        try {
            // Verificar si la fecha ha cambiado para refrescar el contexto temporal
            const currentDate = new Date().toISOString().split('T')[0];
            if (currentDate !== this.lastInitDate) {
                console.log("📅 Cambio de fecha detectado, refrescando contexto de IA...");
                this.initializeModel();
            }

            let result = await this.chat.sendMessage(userInput);
            let response = result.response;
            let finalOutput = "";

            console.log("🤔 IA thinking...");

            let loopCount = 0;
            // LOOP DE HERRAMIENTAS Y VALIDACIÓN (Failsafe 15 iteraciones)
            while (loopCount < 15) {
                loopCount++;

                if (response.functionCalls()?.length) {
                    const toolPart = [];
                    const calls = response.functionCalls()!;

                    for (const call of calls) {
                        console.log(`📡 CALLING TOOL: ${call.name} with args:`, call.args);

                        try {
                            const toolResult = await this.mcpClient.callTool({
                                name: call.name,
                                arguments: call.args as any
                            });

                            console.log(`✅ TOOL RESPONSE RECEIVED:`, toolResult.content);

                            toolPart.push({
                                functionResponse: {
                                    name: call.name,
                                    response: { content: toolResult.content }
                                }
                            });
                        } catch (err: any) {
                            console.error(`❌ Tool execution failed:`, err.message);
                            toolPart.push({
                                functionResponse: {
                                    name: call.name,
                                    response: { error: err.message }
                                }
                            });
                        }
                    }

                    // Enviamos los resultados de las herramientas de vuelta
                    result = await this.chat.sendMessage(toolPart);
                    response = result.response;
                    continue; // Volvemos a evaluar la nueva respuesta
                }

                // Si no hay llamadas a funciones, intentamos sacar el texto
                try {
                    finalOutput = response.text();
                } catch (e) {
                    finalOutput = "";
                }

                // --- PARCHE SENIOR: VALIDACIÓN DE RESPUESTA FINAL DENTRO DEL LOOP ---
                if (!finalOutput || finalOutput.trim() === "") {
                    console.log("⚠️ Respuesta vacía detectada, solicitando narrativa final...");
                    result = await this.chat.sendMessage("Genera la respuesta final al usuario basándote en los datos previos. Responde directamente al usuario. NUNCA repitas esta instrucción en tu respuesta.");
                    response = result.response;
                    continue; // Se repite el ciclo por si acaso la IA decide llamar otra herramienta
                }

                // Limpieza de seguridad por si la IA repite la instrucción
                if (finalOutput.includes("Genera la respuesta final al usuario") || finalOutput.includes("Analiza los datos obtenidos")) {
                    finalOutput = finalOutput.replace(/Genera la respuesta final al usuario.*?\n/g, "");
                    finalOutput = finalOutput.replace(/Analiza los datos obtenidos.*?\n/g, "");
                }

                // Si llegamos aquí, tenemos texto válido y cero functionCalls
                break;
            }

            return finalOutput.trim() || "He procesado tu solicitud, pero no pude generar un resumen narrativo.";

        } catch (error: any) {
            console.error("❌ AIService Error:", error.message);
            return "Hubo un error en el motor de IA. Por favor, intenta de nuevo en un momento.";
        }
    }

    private getSystemInstruction(): string {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7);

        const formatDate = (date: Date) => date.toISOString().split('T')[0];
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const dayName = dayNames[today.getDay()];
        const monthName = today.toLocaleString('en-US', { month: 'long' });

        return `
      You are a Senior Financial Executive. Your primary mandate is to provide data immediately, accurately, and proactively.

LANGUAGE PROTOCOL:
- ALWAYS respond in the same language the user uses. If the user writes in Spanish, your response MUST be in Spanish.
- Tone: Professional, direct, and helpful.

STRICT POSTGRESQL SYNTAX RULES:
- NEVER use SQLite functions like DATE('now').
- ALWAYS use SINGLE QUOTES (') for date values and strings.
- NEVER use DOUBLE QUOTES (") for values; PostgreSQL treats them as column identifiers.
- Correct Syntax Example: WHERE transaction_date >= '${formatDate(firstDayOfMonth)}'

TEMPORAL CONTEXT (TODAY IS ${dayName.toUpperCase()}, ${monthName.toUpperCase()} ${today.getDate()}, ${today.getFullYear()}):
- Use exact strings for date filtering:
  * "Hoy" (Today): '${formatDate(today)}'
  * "Ayer" (Yesterday): '${formatDate(yesterday)}'
  * "Este mes" (${monthName}): transaction_date >= '${formatDate(firstDayOfMonth)}'
  * "Última semana": transaction_date >= '${formatDate(lastWeek)}'

PROACTIVE MULTI-ACCOUNT LOGIC:
- ALWAYS use the \`get_transactions\` tool for EVERY request about expenses, movements, or history for a specific day or period. 
- You MUST call the tool even if you think you have seen the data before in the conversation. DO NOT answer from memory; always get the latest data.
- If the user asks for "gastos de hoy" or "movimientos de ayer", you MUST call \`get_transactions\` immediately. 
- NEVER ask the user for an account alias if they don't specify one; just leave \`account_identifier\` empty to query all accounts.
- Date Range Logic:
  * Specific day (e.g. March 18): start_date='2026-03-18', end_date='2026-03-18'.
  * Whole month: start_date='${formatDate(firstDayOfMonth)}'.

DEBT & CREDIT CARD MANAGEMENT:
- When the user says "págale a [Name]" or "abonar a [Name]", ALWAYS use the pay_debt tool.
- CREDIT CARDS:
  * For NEW PURCHASES on a credit card (e.g., "compré un TV con la Visa"), use the register_card_purchase tool.
  * ALWAYS ask for the number of installments (cuotas) and interest rate if not provided for credit card purchases.
  * For GENERAL PAYMENTS to a card (e.g., "pagué 1M a la Mastercard"), use pay_debt. The system will automatically distribute the payment among purchases.
- PERSONAL LOANS: For simple debts without individual purchases, use create_debt.
- To avoid duplicates, call get_debts before adding new ones.

EVENT TRANSACTIONS:
- When a user asks to register an expense or income FOR AN EVENT (e.g. "para el evento Asado"), you MUST use the \`event_name\` parameter in the \`register_transaction\` tool. DO NOT just put the event name in the \`description\` field.

OUTPUT FORMATTING:
- Format currency with bold markers and thousand separators: **$200.000**.
- If no data is found, explain it clearly in the user's language.

ACCOUNT DATA INTEGRITY:
- NEVER translate account aliases or names (e.g., if you see "efectivo" in the database, keep it as "efectivo"; DO NOT translate to "cash").
- Use EXACT strings for \`account_identifier\`, \`alias\`, \`event_name\`, and \`debt_identifier\` as they appear in tool results.
- NEVER add conversational filler to identifiers. If the user says "pagale a manuela", the \`debt_identifier\` is EXACTLY "manuela" (NOT "deuda con manuela").

TOOL EXECUTION PROTOCOL:
- When you execute a tool and receive its results, you MUST ALWAYS generate a final natural language response summarizing or explaining the result to the user. DO NOT stop generating text after receiving the tool's response.`;
    }
}