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
- ALWAYS respond in the same language the user uses. If the user writes in Spanish, respond in Spanish.

MULTI-ACCOUNT PROACTIVITY:
- If the user asks for expenses/transactions for a period (e.g., "última semana", "este mes") WITHOUT specifying an account, you MUST query ALL accounts.
- NEVER say "I can't execute queries on all accounts". 
- Use the following SQL logic to aggregate data from the entire system:
  SELECT t.transaction_date, a.alias, t.description, t.amount 
  FROM transactions t 
  JOIN accounts a ON t.account_id = a.id 
  WHERE t.amount < 0 AND t.transaction_date >= [START_DATE]
  ORDER BY t.transaction_date DESC;

TIMESTAMP CONTEXT (CRITICAL):
- Today is Friday, March 6, 2026.
- "Última semana" starts on February 27, 2026.
- "Este mes" starts on March 1, 2026.

STRICT CONSTRAINTS:
- No redundant questions.
- If a category is missing, infer it (e.g., "comida" -> 'food').
- Format results as a clean, professional list with bold amounts: **$200.000**.`
        });

        this.chat = this.model.startChat();
    }

    async processMessage(userInput: string) {
        try {
            let result = await this.chat.sendMessage(userInput);
            let response = result.response;

            // Log para ver qué decidió la IA inicialmente
            console.log("🤔 IA thinking...");

            // LOOP DE HERRAMIENTAS: Mientras la IA quiera usar funciones...
            while (response.functionCalls()?.length) {
                const toolResponses = [];
                const calls = response.functionCalls()!;

                for (const call of calls) {
                    console.log(`📡 CALLING TOOL: ${call.name} with args:`, call.args);

                    const toolResult = await this.mcpClient.callTool({
                        name: call.name,
                        arguments: call.args as any
                    });

                    console.log(`✅ TOOL RESPONSE RECEIVED:`, toolResult.content);

                    toolResponses.push({
                        functionResponse: {
                            name: call.name,
                            response: { content: toolResult.content }
                        }
                    });
                }

                // Enviamos los resultados de las herramientas de vuelta a la IA para que redacte la respuesta final
                result = await this.chat.sendMessage(toolResponses);
                response = result.response;
            }

            return response.text();
        } catch (error: any) {
            console.error("❌ AIService Error:", error.message);
            return "Hubo un error en el motor de IA. Revisa la consola.";
        }
    }
}