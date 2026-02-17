-- Lista todas las cuentas ordenadas por las que tienen más dinero
SELECT
    id,
    name,
    alias,
    type,
    balance,
    account_number
FROM accounts
ORDER BY balance DESC;

--Transacciones
SELECT
    id,
    account_id,
    amount,
    description,
    category,
    transaction_date
FROM transactions
ORDER BY transaction_date DESC;

--Cuentas
SELECT
    id,
    lender,
    total_amount,
    remaining_amount,
    interest_rate,
    total_installments,
    paid_installments
FROM debts
ORDER BY remaining_amount DESC;

--Deudas
SELECT
    id,
    lender,
    total_amount,
    remaining_amount,
    interest_rate,
    total_installments,
    paid_installments
FROM debts
ORDER BY remaining_amount DESC;

-- Ver los últimos 30 movimientos con lujo de detalle
SELECT
    t.id,
    t.transaction_date AT TIME ZONE 'UTC' AT TIME ZONE 'America/Bogota' AS fecha,
    COALESCE(a.alias, a.name) AS cuenta,
    t.amount AS monto,
    t.category AS categoria,
    t.description AS descripcion
FROM transactions t
    JOIN accounts a ON t.account_id = a.id
ORDER BY t.transaction_date DESC
LIMIT 30;

-- Resumen del estado de deudas y progreso de pago
SELECT
    id,
    lender AS acreedor,
    total_amount AS deuda_inicial,
    remaining_amount AS saldo_pendiente,
    interest_rate AS tasa_interes,
    total_installments AS cuotas_totales,
    paid_installments AS cuotas_pagadas,
    (
        total_amount - remaining_amount
    ) AS total_abonado
FROM debts;

-- Dinero total sumando todas las cuentas (excepto tarjetas de crédito si las tienes con balance negativo)
SELECT SUM(balance) AS patrimonio_liquido_total
FROM accounts
WHERE
    type != 'credit_card';

-- Gastos totales por categoría este mes
SELECT category, SUM(ABS(amount)) AS total_gastado
FROM transactions
WHERE
    amount < 0
    AND transaction_date >= DATE_TRUNC ('month', CURRENT_DATE)
GROUP BY
    category
ORDER BY total_gastado DESC;