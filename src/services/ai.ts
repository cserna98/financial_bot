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
      You are a Senior Financial Assistant powered by a PostgreSQL database.
      
      DATABASE SCHEMA:
      
      1. TABLE: accounts (id, name, alias, type, balance, account_number)
      2. TABLE: transactions (id, account_id, amount, description, category, transaction_date)
      3. TABLE: debts 
         - id, lender, type, total_amount, remaining_amount, interest_rate, total_installments, next_payment_date
         - paid_installments (INT): Number of payments made. // CORREGIDO AQUÍ

      STRICT OPERATING RULES:
      1. ABSOLUTE PROHIBITION: NEVER use 'run_sql_query' for INSERT, UPDATE, or DELETE. It is ONLY for SELECT (reports/queries).
      2. To create a debt or a credit card purchase, YOU MUST use the 'create_debt' tool. Do not use raw SQL.
      3. To register an income or expense, YOU MUST use the 'register_transaction' tool.
      4. If the user mentions buying something in installments (cuotas), immediately call 'create_debt' without asking extra questions. Assume paid_installments is 0.
      `
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