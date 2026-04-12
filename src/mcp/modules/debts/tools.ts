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
                    description: "OPCIONAL. Nombre o Alias literal de la cuenta (ej. 'nomina', 'efectivo'). NO TRADUCIR. Si no se proporciona, la deuda se registra sin afectar ninguna cuenta."
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
                },
                affect_balance: {
                    type: "boolean",
                    description: "SI se marca true, se creará un gasto en la cuenta que descuenta el dinero de inmediato. Úsalo solo para compras nuevas. Por defecto es FALSE."
                }
            },
            required: ["lender", "total_amount"]
        }
    },
    {
        name: "pay_debt",
        description: "Paga la cuota de una deuda, descontando de la cuenta de origen.",
        inputSchema: {
            type: "object",
            properties: {
                source_account_identifier: {
                    type: "string",
                    description: "Literal Name or Alias de la cuenta de origen (ej. 'nomina'). NO TRADUCIR."
                },
                debt_identifier: {
                    type: "string",
                    description: "Nombre EXACTO de la deuda como aparece en la DB (ej. 'Manuela'). NO añadir palabras como 'deuda con'."
                },
                amount: { type: "number" },
                description: { type: "string" }
            },
            required: ["source_account_identifier", "debt_identifier", "amount"]
        }
    },
    {
        name: "register_card_purchase",
        description: "Registra una compra específica en una tarjeta de crédito ya existente. Esto permite trackear cuotas e intereses por cada compra dentro de la tarjeta.",
        inputSchema: {
            type: "object",
            properties: {
                card_name: {
                    type: "string",
                    description: "Nombre o Alias de la tarjeta de crédito en la base de datos (ej. 'Mastercard', 'Visa')."
                },
                description: {
                    type: "string",
                    description: "Qué se compró (ej. 'Televisor', 'Tiquetes')."
                },
                amount: {
                    type: "number",
                    description: "Monto de la compra."
                },
                installments: {
                    type: "number",
                    description: "Número de cuotas de esta compra."
                },
                interest_rate: {
                    type: "number",
                    description: "Tasa de interés mensual (ej. 2.5)."
                }
            },
            required: ["card_name", "description", "amount", "installments"]
        }
    },
    {
        name: "update_debt",
        description: "Actualiza los valores de una deuda existente (monto total, monto restante, etc.). Úsalo para corregir errores o typos sin generar transacciones bancarias.",
        inputSchema: {
            type: "object",
            properties: {
                debt_identifier: {
                    type: "string",
                    description: "Nombre o ID de la deuda a actualizar."
                },
                total_amount: { type: "number" },
                remaining_amount: { type: "number" },
                lender: { type: "string" },
                description: { type: "string" }
            },
            required: ["debt_identifier"]
        }
    },
    {
        name: "delete_debt",
        description: "Elimina una deuda por completo de la base de datos.",
        inputSchema: {
            type: "object",
            properties: {
                debt_identifier: {
                    type: "string",
                    description: "Nombre o ID de la deuda a eliminar."
                }
            },
            required: ["debt_identifier"]
        }
    }
];
