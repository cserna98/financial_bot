import { Tool } from "@modelcontextprotocol/sdk/types.js";

export const debtTools: Tool[] = [
    {
        name: "get_debts",
        description: "Lists all debts, including lender, interest rate, and remaining amount.",
        inputSchema: { type: "object", properties: {} }
    },
    {
        name: "create_debt",
        description: "Registra una deuda o compra a cuotas. Puede ser de una tarjeta de crédito, préstamo personal, o cualquier acreedor. La cuenta/tarjeta es opcional: si no se proporciona, la deuda se registra como préstamo personal sin afectar ninguna cuenta. Opcionalmente, puede asociarse a un evento.",
        inputSchema: {
            type: "object",
            properties: {
                account_identifier: {
                    type: "string",
                    description: "OPCIONAL. Alias de la cuenta o tarjeta usada (ej. 'mastercard'). Si no se proporciona, la deuda se registra sin afectar ninguna cuenta."
                },
                lender: {
                    type: "string",
                    description: "Qué se compró o a quién se le debe (ej. 'Almacenes Éxito', 'iPhone', 'Banco')"
                },
                total_amount: {
                    type: "number",
                    description: "Monto total de la deuda o compra (ej. 500000)"
                },
                total_installments: {
                    type: "number",
                    description: "Número de cuotas (por defecto 1)"
                },
                description: {
                    type: "string",
                    description: "Detalles adicionales de la compra o el motivo (ej. 'maleta de viaje')"
                },
                event_name: {
                    type: "string",
                    description: "OPCIONAL. Nombre del evento al que pertenece esta deuda (ej. 'Viaje Medellín')"
                }
            },
            required: ["lender", "total_amount"]
        }
    },
    {
        name: "pay_debt",
        description: "Paga la cuota de una deuda. Si la deuda pertenece a una tarjeta de crédito, incluye el alias en destination_account_identifier para liberar el cupo.",
        inputSchema: {
            type: "object",
            properties: {
                source_account_identifier: {
                    type: "string",
                    description: "Cuenta de donde sale el dinero (ej. 'nomina')"
                },
                debt_identifier: {
                    type: "string",
                    description: "Nombre de la deuda (ej. 'iPhone')"
                },
                destination_account_identifier: {
                    type: "string",
                    description: "OPCIONAL. Alias de la tarjeta de crédito a la que se le libera cupo (ej. 'mastercard')"
                },
                amount: { type: "number" },
                description: { type: "string" }
            },
            required: ["source_account_identifier", "debt_identifier", "amount"]
        }
    }
];
