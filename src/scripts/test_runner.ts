import { AIService } from '../services/ai.js';
import { dbConfig } from '../config/database.js';
import { tools } from '../mcp/tools.js'; // Importante para que AIService tenga contexto
import dotenv from 'dotenv';
dotenv.config();

// Creamos un dummy client para satisfacer la firma del constructor sin levantar el servidor MCP real
const mockMcpClient = {
    callTool: async () => ({ content: [{ type: "text", text: "Mocked tool response" }] })
} as any;

// Inicializamos el servicio de IA pasándole el mock y las herramientas reales
const aiService = new AIService(mockMcpClient, tools);

const testCases = [
    // --- 🏦 Módulo 1: Cuentas ---
    "Crea una cuenta de ahorros llamada Ualá con saldo de 50.000 y alias 'uala'",
    "¿Qué cuentas tengo registradas?",
    "¿Cuánto dinero tengo en uala?",

    // --- 💸 Módulo 2: Transacciones ---
    "Gasté 15.000 en el almuerzo hoy usando uala",
    "Me pagaron 100.000 de una deuda en uala",
    "Muéstrame los últimos movimientos de uala",

    // --- 🧾 Módulo 3: Deudas ---
    "Le debo 300.000 a Carlos por un préstamo",
    "¿A quién le debo plata y cuánto?",
    "Págale 50.000 a Carlos usando uala",
    "¿Cuánto le debo a Carlos ahora?",

    // --- 📅 Módulo 4: Eventos ---
    "Voy a organizar un Paseo el fin de semana con presupuesto de 500.000",
    "Pagué 100.000 en transporte para el evento Paseo con uala",
    "¿Cómo va el presupuesto del Paseo?",

    // --- 🔄 Módulo 5: Suscripciones ---
    "Añade mi suscripción de Spotify por 20.000 los días 25",
    "¿Qué suscripciones tengo activas?",

    // --- 📊 Módulo 6: Reportes ---
    "Haz una consulta SQL para ver cuántos registros hay en la tabla de accounts",
    "Genera un reporte de mis gastos de los últimos 5 días",

    // --- 🧹 Limpieza de Pruebas ---
    "Borra la cuenta uala por favor",
    "Borra la deuda con Carlos por favor"
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runTests() {
    console.log("🚀 INICIANDO BATERÍA DE PRUEBAS AUTOMATIZADAS 🚀\n");
    console.log("=================================================");

    const TEST_USER_ID = "automated_test_user";
    let successCount = 0;

    for (let i = 0; i < testCases.length; i++) {
        const prompt = testCases[i];
        console.log(`\n\x1b[36m[Prueba ${i + 1}/${testCases.length}]\x1b[0m 📥 Input: "${prompt}"`);
        
        try {
            const startTime = Date.now();
            
            // Enviamos el mensaje directamente al motor de IA
            const responseText = await aiService.processMessage(prompt, TEST_USER_ID);
            
            const endTime = Date.now();
            const timeTaken = ((endTime - startTime) / 1000).toFixed(2);

            console.log(`\x1b[32m🤖 Output:\x1b[0m ${responseText}`);
            console.log(`⏱️  Tiempo: ${timeTaken}s`);
            
            // Evaluamos muy superficialmente si la respuesta parece válida
            if (responseText && !responseText.includes("Error Técnico:")) {
                successCount++;
            } else {
                 console.log(`\x1b[31m⚠️ Posible fallo detectado.\x1b[0m`);
            }

        } catch (error: any) {
            console.error(`\x1b[31m❌ Error crítico durante la prueba:\x1b[0m`, error.message);
        }

        console.log("-------------------------------------------------");
        
        // Pausa de 3 segundos entre peticiones para no saturar la API (Rate Limit Protection)
        if (i < testCases.length - 1) {
            console.log("⏳ Esperando 3 segundos antes del siguiente test...");
            await delay(3000);
        }
    }

    console.log("\n✅===============================================✅");
    console.log(`🎉 Batería completada. Exitosos/Validos (aprox): ${successCount}/${testCases.length}`);
    console.log("✅===============================================✅\n");
    
    // Forzamos salida
    process.exit(0);
}

// Ejecutamos
runTests().catch(console.error);
