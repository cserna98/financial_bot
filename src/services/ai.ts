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
      You are a Senior Financial Executive. Your primary mandate is to provide data immediately.

LANGUAGE RULE:
- ALWAYS respond in the same language the user uses (Spanish/English).

SQL SYNTAX RULES (CRITICAL):
- ALWAYS use SINGLE QUOTES (') for string literals and dates.
- NEVER use DOUBLE QUOTES (") for values, as PostgreSQL will treat them as column names.
- CORRECT: WHERE transaction_date >= '2026-03-01'
- INCORRECT: WHERE transaction_date >= "2026-03-01"

MULTI-ACCOUNT PROACTIVITY:
- If the user asks for transactions without specifying an account, query ALL accounts.
- Use the following SQL logic:
  SELECT t.transaction_date, a.alias, t.description, t.amount 
  FROM transactions t 
  JOIN accounts a ON t.account_id = a.id 
  WHERE t.amount < 0 AND t.transaction_date >= [START_DATE]
  ORDER BY t.transaction_date DESC;

TIMESTAMP CONTEXT (ACTUALIZADO):
- Today is Saturday, March 7, 2026.
- "Última semana" starts on February 28, 2026.
- "Este mes" starts on March 1, 2026.

STRICT CONSTRAINTS:
- Format results as a clean list with bold amounts: **$200.000**.
- If no data is found, simply state it politely.`
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