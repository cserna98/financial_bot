/**
 * Categorías estandarizadas para transacciones financieras.
 * 
 * Estas categorías son la fuente de verdad para todo el sistema.
 * La IA las usa para clasificar gastos, y los reportes las agrupan.
 */

// ─── Fixed Categories (Non-negotiable) ───────────────────────
export const FIXED_CATEGORIES = {
    HOUSING: 'Housing',             // Rent, utilities, internet
    FOOD: 'Food',                   // Groceries, household items
    TRANSPORT: 'Transport',         // Tolls, transport apps (Uber/Indriver), taxis
    MOTORCYCLE: 'Motorcycle',       // Gas, SOAT, mechanical maintenance, spare parts, washing
    DEBT_PAYMENT: 'Debt Payment',   // Credit card installments, Crediágil, interests
} as const;

// ─── Lifestyle Categories ────────────────────────────────────
export const LIFESTYLE_CATEGORIES = {
    RESTAURANTS: 'Restaurants',     // Eating out for necessity or quick taste
    LEISURE: 'Leisure',             // Outings with friends, cinema, bars, concerts
} as const;

// ─── Other Categories ────────────────────────────────────────
export const OTHER_CATEGORIES = {
    SUBSCRIPTIONS: 'Subscriptions', // Netflix, Youtube, Google Cloud
    HEALTH: 'Health',               // Pharmacy, gym, hairdresser
    SHOPPING: 'Shopping',           // Clothes, gadgets, tools
    MISCELLANEOUS: 'Miscellaneous', // Unexpected expenses that don't fit anywhere else
    INCOME: 'Income',               // Salary, freelance, refunds
} as const;

// ─── Flat list of all valid categories ──────────────────────
export const ALL_CATEGORIES = [
    ...Object.values(FIXED_CATEGORIES),
    ...Object.values(LIFESTYLE_CATEGORIES),
    ...Object.values(OTHER_CATEGORIES),
] as const;

export type CategoryName = typeof ALL_CATEGORIES[number];

/**
 * Descriptions for the AI and reports.
 * Helps the AI classify expenses correctly while maintaining bilingual support.
 */
export const CATEGORY_DESCRIPTIONS: Record<CategoryName, string> = {
    'Housing': 'Arriendo, servicios públicos (agua, luz, gas), internet',
    'Food': 'Mercado (D1, Éxito, etc.), cosas para la casa, productos de aseo',
    'Transport': 'Peajes, apps de transporte (Uber, Indriver), taxis, buses',
    'Motorcycle': 'Gasolina moto, SOAT, mantenimiento mecánico, repuestos, lavado de moto',
    'Debt Payment': 'Cuotas de tarjetas de crédito, Crediágil, intereses bancarios',
    'Restaurants': 'Comida fuera de casa, almuerzos, comida rápida',
    'Leisure': 'Salidas con amigos, cine, bares, conciertos, entretenimiento',
    'Subscriptions': 'Netflix, Youtube Premium, Spotify, Google Cloud, servicios digitales',
    'Health': 'Droguería, medicamentos, gimnasio, peluquería, cuidado personal',
    'Shopping': 'Ropa, gadgets, herramientas, tecnología, artículos personales',
    'Miscellaneous': 'Gastos inesperados que no encajan en otra categoría',
    'Income': 'Salario, nómina, freelance, reembolsos, transferencias recibidas',
};

/**
 * Generates the enum description for the MCP tool.
 */
export function getCategoryEnumDescription(): string {
    return `Transaction category. MUST be one of: ${ALL_CATEGORIES.map(c => `'${c}'`).join(', ')}. Use functional categories like 'Transport' or 'Restaurants' even for travel/events, and link the event with event_name. RESPONSE ALWAYS IN THE USER'S LANGUAGE.`;
}

/**
 * Validates and resolves the category name. Defaults to 'Miscellaneous'.
 */
export function resolveCategory(input: string): CategoryName {
    const normalized = input.trim().toLowerCase();
    
    // Mapping for common Spanish names to English standard
    const mapping: Record<string, CategoryName> = {
        'vivienda': 'Housing',
        'alimentacion': 'Food',
        'alimentación': 'Food',
        'transporte': 'Transport',
        'moto': 'Motorcycle',
        'pago deudas': 'Debt Payment',
        'pago_deuda': 'Debt Payment',
        'payment': 'Debt Payment',
        'deuda': 'Debt Payment',
        'restaurantes': 'Restaurants',
        'ocio': 'Leisure',
        'ocio y social': 'Leisure',
        'social': 'Leisure',
        'suscripciones': 'Subscriptions',
        'salud': 'Health',
        'salud y cuidado': 'Health',
        'compras': 'Shopping',
        'shopping': 'Shopping',
        'imprevistos': 'Miscellaneous',
        'miscellaneous': 'Miscellaneous',
        'ingresos': 'Income',
        'income': 'Income',
        'salary': 'Income',
        'nómina': 'Income',
        'nomina': 'Income'
    };

    if (mapping[normalized]) return mapping[normalized];

    const match = ALL_CATEGORIES.find(
        c => c.toLowerCase() === normalized
    );
    return (match as CategoryName) ?? 'Miscellaneous';
}
