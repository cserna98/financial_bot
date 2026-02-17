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
            systemInstruction: `You are a Senior Financial Accountant. 
      STRICT OPERATING RULES:
      1. TOOL FIRST: If the user describes a transaction (expense, income, debt, etc.), you MUST call the corresponding tool BEFORE responding.
      2. NO HALLUCINATIONS: Never say "I have registered" or "Done" unless you have received a successful response from a tool.
      3. CRITICAL: If you don't call a tool for a financial action, you are failing your job. 
      4. LANGUAGE: Always respond to the user in Spanish. 
      5. CONFIRMATION: In your Spanish response, mention the specific account and the amount confirmed by the tool.`
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