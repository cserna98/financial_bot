import { pool } from '../config/database.js';
import { debtRepository } from '../db/debts.js';
import { creditCardRepository } from '../db/credit_cards.js';

async function testFlow() {
    const client = await pool.connect();
    try {
        console.log("🧪 Iniciando Test de Flujo de Tarjeta...");
        await client.query('BEGIN'); // Iniciamos transacción para poder hacer ROLLBACK

        // 1. Crear una tarjeta de prueba
        console.log("1. Creando tarjeta 'Test-Visa'...");
        const cardRes = await client.query(
            "INSERT INTO debts (lender, type, total_amount, remaining_amount, interest_rate, total_installments, next_payment_date) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
            ['Test-Visa', 'credit_card', 0, 0, 0, 1, new Date()]
        );
        const card = cardRes.rows[0];
        console.log(`✅ Tarjeta creada ID: ${card.id}`);

        // 2. Registrar dos compras
        console.log("2. Registrando compras...");
        await creditCardRepository.createPurchase({
            debt_id: card.id,
            description: 'Compra A (Antigua)',
            total_amount: 100000,
            remaining_amount: 100000,
            interest_rate: 2.1,
            total_installments: 3
        });

        await creditCardRepository.createPurchase({
            debt_id: card.id,
            description: 'Compra B (Nueva)',
            total_amount: 200000,
            remaining_amount: 200000,
            interest_rate: 2.5,
            total_installments: 6
        });

        // Verificamos saldo de la tarjeta
        const cardAfterPurchases = await debtRepository.getById(card.id);
        console.log(`📊 Saldo total tarjeta después de compras: $${cardAfterPurchases?.remaining_amount}`);

        // 3. Realizar un pago parcial ($150,000)
        // Debería pagar COMPLETA la Compra A ($100k) y abonar $50k a la Compra B
        console.log("3. Realizando pago de $150.000...");
        await creditCardRepository.applyPaymentToPurchases(card.id, 150000);

        // 4. Verificar resultados
        const purchases = await creditCardRepository.getPurchasesByDebtId(card.id);
        console.log("🔍 Resultados de las compras:");
        purchases.forEach(p => {
            console.log(`   - ${p.description}: Restante=$${p.remaining_amount}, Cuotas Pagadas=${p.paid_installments}`);
        });

        const finalCard = await debtRepository.getById(card.id);
        console.log(`📊 Saldo final tarjeta: $${finalCard?.remaining_amount}`);

        // Validaciones
        if (Number(purchases[0].remaining_amount) === 0 && Number(purchases[1].remaining_amount) === 150000) {
            console.log("🏆 TEST PASADO: El pago se aplicó en cascada correctamente.");
        } else {
            console.log("❌ TEST FALLIDO: La distribución del pago no fue la esperada.");
        }

    } catch (err) {
        console.error("💥 Error en el test:", err);
    } finally {
        console.log("♻️ Haciendo ROLLBACK para no afectar la base de datos real.");
        await client.query('ROLLBACK');
        client.release();
        await pool.end();
    }
}

testFlow();
