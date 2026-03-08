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

OUTPUT FORMATTING:
- Format currency with bold markers and thousand separators: **$200.000**.
- If no data is found, explain it clearly in the user's language.`
        });

        this.chat = this.model.startChat();
    }

    async processMessage(userInput: string) {
        try {
            let result = await this.chat.sendMessage(userInput);
            let response = result.response;

            console.log("🤔 IA thinking...");

            // LOOP DE HERRAMIENTAS
            while (response.functionCalls()?.length) {
                const toolPart = []; // Cambiamos el nombre para claridad (Parts de Gemini)
                const calls = response.functionCalls()!;

                for (const call of calls) {
                    console.log(`📡 CALLING TOOL: ${call.name} with args:`, call.args);

                    const toolResult = await this.mcpClient.callTool({
                        name: call.name,
                        arguments: call.args as any
                    });

                    console.log(`✅ TOOL RESPONSE RECEIVED:`, toolResult.content);

                    // IMPORTANTE: Gemini espera que el resultado de la función 
                    // se pase como una 'part' específica de FunctionResponse
                    toolPart.push({
                        functionResponse: {
                            name: call.name,
                            response: { content: toolResult.content }
                        }
                    });
                }

                // Enviamos los resultados de las herramientas de vuelta
                result = await this.chat.sendMessage(toolPart);
                response = result.response;
            }

            // --- PARCHE SENIOR: VALIDACIÓN DE RESPUESTA FINAL ---
            let finalOutput = response.text();

            if (!finalOutput || finalOutput.trim() === "") {
                console.log("⚠️ Respuesta vacía detectada, solicitando narrativa final...");
                // Si está vacío, le pedimos explícitamente que hable basándose en lo anterior
                const followUp = await this.chat.sendMessage("Analiza los datos obtenidos y dame una respuesta corta y natural para el usuario.");
                finalOutput = followUp.response.text();
            }

            return finalOutput;

        } catch (error: any) {
            console.error("❌ AIService Error:", error.message);
            return "Hubo un error en el motor de IA. Por favor, intenta de nuevo en un momento.";
        }
    }
}