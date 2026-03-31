# Guía de Pruebas: Financial Bot (v2.0)

Esta guía contiene una batería de pruebas para verificar que el LLM está interpretando correctamente tus mensajes y activando las herramientas MCP adecuadas.

---

## 🏦 Módulo 1: Cuentas (Accounts)

| Acción | Mensaje de Telegram (Ejemplo) | Herramienta que activa el LLM | Parámetros detectados por la IA |
|---|---|---|---|
| **Crear cuenta** | "Crea una cuenta de ahorros llamada Bancolombia con saldo de 2.000.000 y alias 'nomi'" | `create_account` | `name: "Bancolombia"`, `type: "savings"`, `balance: 2000000`, `alias: "nomi"` |
| **Ver todas** | "¿Qué cuentas tengo registradas?" | `get_accounts` | (ninguno) |
| **Ver saldo** | "¿Cuánto dinero tengo en nomi?" | `get_account_balance` | `account_identifier: "nomi"` |
| **Editar** | "Cambia el nombre de la cuenta 'nomi' a 'Nómina Principal'" | `update_account` | `account_identifier: "nomi"`, `name: "Nómina Principal"` |

---

## 💸 Módulo 2: Transacciones (Transactions)

| Acción | Mensaje de Telegram (Ejemplo) | Herramienta que activa el LLM | Parámetros detectados por la IA |
|---|---|---|---|
| **Gasto simple** | "Gasté 50.000 en el almuerzo hoy usando efectivo" | `register_transaction` | `account_identifier: "efectivo"`, `amount: 50000`, `description: "almuerzo"`, `category: "food"` |
| **Ingreso** | "Me pagaron 1.500.000 de mi sueldo en Bancolombia" | `register_transaction` | `account_identifier: "Bancolombia"`, `amount: 1500000`, `description: "sueldo"`, `category: "income"` |
| **Ver recientes** | "Muéstrame los últimos 5 movimientos de efectivo" | `get_recent_transactions` | `account_identifier: "efectivo"`, `limit: 5` |
| **Búsqueda** | "¿Cuánto he gastado en comida este mes?" | `get_transactions` | `start_date: "2026-03-01"`, `category: "food"` (La IA calculará la fecha dinámicamente) |

---

## 🧾 Módulo 3: Deudas (Debts)

| Acción | Mensaje de Telegram (Ejemplo) | Herramienta que activa el LLM | Parámetros detectados por la IA |
|---|---|---|---|
| **Registrar deuda** | "Le debo 500.000 a Juan por un préstamo, a 5 cuotas" | `create_debt` | `lender: "Juan"`, `total_amount: 500000`, `total_installments: 5` |
| **Ver deudas** | "¿A quién le debo plata y cuánto?" | `get_debts` | (ninguno) |
| **Pagar cuota** | "Págale 100.000 a Juan usando mi cuenta de efectivo" | `pay_debt` | `source_account_identifier: "efectivo"`, `debt_identifier: "Juan"`, `amount: 100000` |

> [!TIP]
> Si la deuda está enlazada a una tarjeta de crédito, el bot liberará el cupo de la tarjeta automáticamente al registrar un pago.

---

## 📅 Módulo 4: Eventos (Events)

| Acción | Mensaje de Telegram (Ejemplo) | Herramienta que activa el LLM | Parámetros detectados por la IA |
|---|---|---|---|
| **Crear evento** | "Voy a organizar un Asado el fin de semana con presupuesto de 200.000" | `create_event` | `name: "Asado"`, `total_budget: 200000` |
| **Gasto en evento** | "Pagué 80.000 en la carnicería para el evento Asado con efectivo" | `register_transaction` | `amount: 80000`, `event_name: "Asado"`, `account_identifier: "efectivo"` |
| **Ver resumen** | "¿Cómo va el presupuesto del Asado?" | `get_event_summary` | `event_id: (buscado por la IA)` |

---

## 🔄 Módulo 5: Suscripciones (Subscriptions)

| Acción | Mensaje de Telegram (Ejemplo) | Herramienta que activa el LLM | Parámetros detectados por la IA |
|---|---|---|---|
| **Añadir** | "Añade mi suscripción de Netflix por 45.000 los días 15" | `add_subscription` | `name: "Netflix"`, `amount: 45000`, `billing_day: 15` |
| **Listar** | "¿Qué suscripciones tengo activas?" | `list_subscriptions` | (ninguno) |
| **Alertas** | "¿Qué facturas se vencen en los próximos 10 días?" | `check_upcoming_bills` | `days_ahead: 10` |

---

## 📊 Módulo 6: Reportes y SQL (Reports & Core)

| Acción | Mensaje de Telegram (Ejemplo) | Herramienta que activa el LLM | Parámetros detectados por la IA |
|---|---|---|---|
| **Google Sheets** | "Genera un reporte de mis gastos de los últimos 15 días" | `generate_expense_report` | `period: "ultimos 15 dias"` |
| **SQL Crudo** | "Haz una consulta SQL para ver cuántos registros hay en la tabla de transacciones" | `run_sql_query` | `query: "SELECT COUNT(*) FROM transactions"` |

---

## 🧠 Entendimiento del LLM (Proceso Mental)

Cuando envías un mensaje, Gemini realiza estos pasos:

1. **Reconocimiento de Intención:** Identifica si quieres consultar, crear o borrar algo.
2. **Extracción de Entidades:** Busca números (montos), fechas ("hoy", "ayer") y nombres propios (alias de cuentas, nombres de eventos).
3. **Mapeo de Herramienta:** Selecciona la herramienta MCP más específica.
    - *Ejemplo:* Si dices "págale a...", prefiere `pay_debt` sobre `register_transaction`.
4. **Validación de Signos:** La IA está instruida para que "gasté" o "pagué" resulten en montos negativos (`-50000`) automáticamente.
5. **Narración Final:** Una vez que la base de datos responde, la IA analiza el JSON técnico y te lo explica en lenguaje natural:
    - *Input IA:* `{"name": "Bancolombia", "balance": 1500000}`
    - *Output Usuario:* "¡Listo! Tu cuenta Bancolombia tiene un saldo actual de **$1.500.000**."
