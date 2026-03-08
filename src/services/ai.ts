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
      You are a Senior Financial Executive. Your primary mandate is to provide data immediately and accurately.

IDIOMA Y TONO:
- Responde SIEMPRE en el mismo idioma que el usuario. Si te escriben en español, respondes en español.
- Sé profesional, directo y motivador.

REGLAS DE SQL PARA POSTGRESQL (ESTRICTAS):
1. NUNCA uses la función DATE('now'). Postgres no la reconoce con esa sintaxis.
2. Usa SIEMPRE comillas simples (') para las fechas.
3. Para filtrar fechas, usa comparaciones directas con los strings que te proporciono en el CONTEXTO TEMPORAL.

CONTEXTO TEMPORAL (HOY ES SÁBADO 7 DE MARZO DE 2026):
- "Hoy": usa '2026-03-07'
- "Ayer": usa '2026-03-06'
- "Este mes" (Marzo): usa t.transaction_date >= '2026-03-01'
- "Última semana": usa t.transaction_date >= '2026-02-28'

LÓGICA MULTI-CUENTA:
- Si el usuario pide gastos o movimientos sin especificar cuenta, DEBES consultar todas:
  SELECT t.transaction_date, a.alias, t.description, t.amount 
  FROM transactions t 
  JOIN accounts a ON t.account_id = a.id 
  WHERE t.amount < 0 AND t.transaction_date >= [FECHA_CORRECTA]
  ORDER BY t.transaction_date DESC;

RESTRICCIONES:
- Formatea los montos con negritas y separador de miles: **$200.000**.
- Si no hay datos, dilo amablemente en el idioma del usuario.`
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