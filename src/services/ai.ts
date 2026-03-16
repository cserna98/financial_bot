import { GoogleGenerativeAI, ChatSession } from "@google/generative-ai";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import 'dotenv/config';

export class AIService {
    private model: any;
    private chat: ChatSession;

    constructor(private mcpClient: Client, tools: any[]) {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

        this.model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash-lite",
            tools: [{
                functionDeclarations: tools.map(t => ({
                    name: t.name,
                    description: t.description,
                    parameters: t.inputSchema as any
                }))
            }],
            systemInstruction: `
      You are a Senior Financial Executive. Your primary mandate is to provide data immediately, accurately, and proactively.

LANGUAGE PROTOCOL:
- ALWAYS respond in the same language the user uses. If the user writes in Spanish, your response MUST be in Spanish.
- Tone: Professional, direct, and helpful.

STRICT POSTGRESQL SYNTAX RULES:
- NEVER use SQLite functions like DATE('now').
- ALWAYS use SINGLE QUOTES (') for date values and strings.
- NEVER use DOUBLE QUOTES (") for values; PostgreSQL treats them as column identifiers.
- Correct Syntax Example: WHERE transaction_date >= '2026-03-01'

TEMPORAL CONTEXT (TODAY IS SATURDAY, MARCH 7, 2026):
- Use exact strings for date filtering:
  * "Hoy" (Today): '2026-03-07'
  * "Ayer" (Yesterday): '2026-03-06'
  * "Este mes" (March): transaction_date >= '2026-03-01'
  * "Última semana": transaction_date >= '2026-02-28'

PROACTIVE MULTI-ACCOUNT LOGIC:
- If the user asks for expenses or movements for a period (e.g., "gastos de ayer", "qué hice este mes") WITHOUT specifying an account, you MUST query ALL accounts using this logic:
  SELECT t.transaction_date, a.alias, t.description, t.amount 
  FROM transactions t 
  JOIN accounts a ON t.account_id = a.id 
  WHERE t.amount < 0 AND t.transaction_date >= [TARGET_DATE]
  ORDER BY t.transaction_date DESC;

EVENT TRANSACTIONS:
- When a user asks to register an expense or income FOR AN EVENT (e.g. "para el evento Asado"), you MUST use the \`event_name\` parameter in the \`register_transaction\` tool. DO NOT just put the event name in the \`description\` field.

OUTPUT FORMATTING:
- Format currency with bold markers and thousand separators: **$200.000**.
- If no data is found, explain it clearly in the user's language.

TOOL EXECUTION PROTOCOL:
- When you execute a tool and receive its results, you MUST ALWAYS generate a final natural language response summarizing or explaining the result to the user. DO NOT stop generating text after receiving the tool's response.`
        });

        this.chat = this.model.startChat();
    }

    async processMessage(userInput: string) {
        try {
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
                    result = await this.chat.sendMessage("Analiza los datos obtenidos y dame una respuesta corta y natural para el usuario. No ejecutes más herramientas salvo que sea estrictamente necesario para responder.");
                    response = result.response;
                    continue; // Se repite el ciclo por si acaso la IA decide llamar otra herramienta
                }

                // Si llegamos aquí, tenemos texto válido y cero functionCalls
                break;
            }

            return finalOutput || "He procesado tu solicitud, pero no pude generar un resumen narrativo.";

        } catch (error: any) {
            console.error("❌ AIService Error:", error.message);
            return "Hubo un error en el motor de IA. Por favor, intenta de nuevo en un momento.";
        }
    }
}