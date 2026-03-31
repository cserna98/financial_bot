import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const reportTools: Tool[]  = [
    {
        name: "generate_expense_report",
        description: "Genera un reporte de gastos en Google Sheets para un periodo (semana, 15 dias, mes, 3 meses).",
        inputSchema: {
            type: "object",
            properties: {
                period: { 
                    type: "string", 
                    description: "El periodo del reporte (ej: 'ultima semana', 'ultimos 15 dias', 'este mes')" 
                }
            },
            required: ["period"]
        }
    }
];