import { pool } from "../../../config/database.js";
import { sheets } from "../../../config/googleSheets.js";

export const reportHandlers = {
    async generate_expense_report(args: Record<string, unknown>) {
        const { period } = args as { period: string };
        
        const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
        if (!spreadsheetId) {
            throw new Error("GOOGLE_SHEETS_ID no está definido en el .env");
        }

        let days = 30;
        const p = period.toLowerCase();
        if (p.includes('semana')) days = 7;
        else if (p.includes('15')) days = 15;
        else if (p.includes('3 meses')) days = 90;

        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        try {
            const res = await pool.query(
                `SELECT t.transaction_date, t.description, t.amount, a.name as account
                 FROM transactions t
                 JOIN accounts a ON t.account_id = a.id
                 WHERE t.transaction_date >= $1 AND t.amount < 0
                 ORDER BY t.transaction_date DESC`,
                [startDate]
            );

            const rows = res.rows.map(t => [
                new Date(t.transaction_date).toLocaleDateString(),
                t.description,
                Math.abs(parseFloat(t.amount)),
                t.account
            ]);

            rows.unshift(["FECHA", "DESCRIPCIÓN", "MONTO (COP)", "CUENTA"]);

            // 1. Crear un nombre único para la nueva pestaña
            const timestamp = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];
            const sheetTitle = `Reporte_${period.replace(/\s+/g, '_')}_${timestamp}`;

            // 2. Crear la pestaña en el documento
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                requestBody: {
                    requests: [{
                        addSheet: {
                            properties: {
                                title: sheetTitle
                            }
                        }
                    }]
                }
            });

            // 3. Escribir los datos en la pestaña recién creada
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `'${sheetTitle}'!A1`, 
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: rows },
            });

            return {
                content: [{
                    type: "text",
                    text: `✅ Reporte generado para: ${period}. Se exportaron ${res.rows.length} transacciones.`
                }]
            };
        } catch (error: any) {
            console.error("Error en Google Sheets:", error);
            return {
                content: [{ type: "text", text: `❌ Error al generar reporte: ${error.message}` }],
                isError: true
            };
        }
    }
};