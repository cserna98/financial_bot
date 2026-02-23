# Servidor MCP - Asistente Financiero Personal

Servidor MCP (Model Context Protocol) para gestión financiera con PostgreSQL, implementado en TypeScript.

## 🚀 Características

- **Consulta de Saldos**: Obtiene los balances de todas las cuentas
- **Registro de Transacciones**: Crea transacciones con actualización automática de balances
- **Manejo de Errores**: Gestión robusta de errores de base de datos
- **TypeScript Estricto**: Tipado fuerte y validaciones en tiempo de compilación
- **Transacciones Atómicas**: Uso de BEGIN/COMMIT/ROLLBACK para integridad de datos

## 📋 Requisitos Previos

- Node.js v18 o superior
- PostgreSQL con las tablas: `accounts`, `ledger`, `assets`
- Túnel SSH activo (si la DB está en VPS remoto)

## 🔧 Instalación

1. **Instalar dependencias**:
```bash
npm install
```

2. **Configurar variables de entorno**:
```bash
cp .env.example .env
```

Edita `.env` con tus credenciales de PostgreSQL:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=financial_db
DB_USER=postgres
DB_PASSWORD=tu_contraseña
```

3. **Compilar el proyecto**:
```bash
npm run build
```

## 🎯 Uso

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm run build
npm start
```

## 🛠️ Herramientas Disponibles

### 1. `consultar_saldos`
Consulta los saldos actuales de todas las cuentas.

**Parámetros**: Ninguno

**Ejemplo de respuesta**:
```json
[
  {
    "name": "Cuenta Corriente",
    "balance": 5000.50
  },
  {
    "name": "Ahorro",
    "balance": 15000.00
  }
]
```

### 2. `registrar_transaccion`
Registra una nueva transacción y actualiza los balances de las cuentas.

**Parámetros**:
- `description` (string): Descripción de la transacción
- `amount` (number): Monto (debe ser positivo)
- `debit_account_id` (number): ID de cuenta de débito (de donde sale el dinero)
- `credit_account_id` (number): ID de cuenta de crédito (a donde llega el dinero)

**Ejemplo de respuesta**:
```json
{
  "id": 123,
  "mensaje": "Transacción registrada exitosamente con ID 123"
}
```

## 🗄️ Estructura de la Base de Datos

### Tabla `accounts`
```sql
CREATE TABLE accounts (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  balance DECIMAL(15, 2) DEFAULT 0
);
```

### Tabla `ledger`
```sql
CREATE TABLE ledger (
  id SERIAL PRIMARY KEY,
  description TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  debit_account_id INTEGER REFERENCES accounts(id),
  credit_account_id INTEGER REFERENCES accounts(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🔒 Seguridad

- ✅ Validación de parámetros en todas las herramientas
- ✅ Uso de consultas parametrizadas (prevención de SQL injection)
- ✅ Transacciones atómicas con ROLLBACK en caso de error
- ✅ Manejo exhaustivo de errores con mensajes claros
- ✅ Variables de entorno para credenciales sensibles

## 📁 Estructura del Proyecto

```
MCP/
├── src/
│   └── index.ts          # Servidor MCP principal
├── build/                # Código TypeScript compilado
├── .env                  # Variables de entorno (no commitear)
├── .env.example          # Plantilla de variables de entorno
├── package.json          # Dependencias y scripts
├── tsconfig.json         # Configuración de TypeScript
└── README.md             # Este archivo
```

## 🐛 Manejo de Errores

El servidor retorna respuestas claras al LLM en caso de error:

```json
{
  "error": true,
  "mensaje": "Descripción detallada del error"
}
```

Errores comunes manejados:
- Conexión fallida a la base de datos
- Parámetros inválidos o faltantes
- Cuentas inexistentes
- Violaciones de integridad referencial

## 📝 Notas Adicionales

- El servidor usa `StdioServerTransport` para comunicación con el cliente MCP
- Los logs de sistema se escriben a `stderr` para no interferir con la comunicación MCP
- Las transacciones usan doble entrada contable: débito en una cuenta, crédito en otra
