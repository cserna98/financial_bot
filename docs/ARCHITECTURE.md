# Arquitectura del Sistema: Financial Bot

![Diagrama de Arquitectura](file:///c:/Users/crise/.gemini/antigravity/scratch/financial_bot/Financial_bot/docs/architecture_diagram.png)

Este documento describe la estructura y el flujo de datos del proyecto para facilitar su mantenimiento y escalabilidad.

## 📊 Diagrama de Flujo Principal

```mermaid
graph TD
    %% Entradas de Usuario
    User((Usuario)) -- Mensaje de texto --> WhatsApp[src/bot/whatsapp.ts]
    User -- Mensaje de texto --> Telegram[src/bot/telegram.ts]

    %% Capa de Orquestación
    WhatsApp -- "userInput: string" --> AIService[src/services/ai.ts]
    Telegram -- "userInput: string" --> AIService
    
    %% Capa de Inteligencia
    AIService -- "Llamada a Herramienta (JSON)" --> MCPServer[src/mcp/server.ts]
    MCPServer -- "Resultado (JSON)" --> AIService
    AIService -- "Respuesta Final (Texto)" --> WhatsApp
    AIService -- "Respuesta Final (Texto)" --> Telegram

    %% Capa de MCP (Módulos)
    MCPServer -- "Ejecuta Handler" --> Handlers[src/mcp/modules/*/handler.ts]
    Handlers -- "Define interfaz" --> Tools[src/mcp/modules/*/tools.ts]

    %% Capa de Datos (DB)
    Handlers -- "Llama función DB" --> Repositories[src/db/*.ts]
    Repositories -- "SQL Queries" --> DB[(PostgreSQL)]
    DB -- "Rows / Data" --> Repositories
    Repositories -- "Objetos JS" --> Handlers

    %% Configuración
    Config[src/config/database.ts] -. Inyecta pool .-> Repositories
    Categories[src/config/categories.ts] -. Valida texto .-> Handlers
```

## 🏗️ Capas de la Arquitectura

### 1. Capa de Interfaz (`src/bot/`)
Es la puerta de entrada. 
- **WhatsApp/Telegram**: Reciben el mensaje, lo limpian y lo pasan al `AIService`. No tienen lógica de negocio, solo comunicación.

### 2. Capa de Inteligencia (`src/services/ai.ts`)
Es el cerebro del bot.
- Utiliza **Gemini** para entender la intención del usuario.
- Decide qué herramientas llamar según lo que el usuario pida.
- **Importante**: Mantiene el historial de la conversación y refresca la fecha actual cada día.

### 3. Capa de Protocolo (MCP) (`src/mcp/`)
Actúa como un catálogo de funciones para la IA.
- **Server**: El despachador central que recibe órdenes de la IA.
- **Modules**: Carpetas organizadas por tema (Cuentas, Deudas, Transacciones).
    - `tools.ts`: El "contrato" (qué parámetros necesita la función).
    - `handler.ts`: La "ejecución" (qué hace el código realmente).

### 4. Capa de Persistencia (`src/db/`)
La única capa autorizada para tocar la base de datos PostgreSQL.
- Sigue el patrón **Repository**. Cada archivo maneja una tabla específica.

## 🔌 Conexiones (Inputs/Outputs)

| Componente | Entrada (Input) | Salida (Output) |
| :--- | :--- | :--- |
| **Bot** | Mensaje de WhatsApp/Telegram | Texto formateado |
| **AIService** | Texto del usuario | Respuesta narrativa final |
| **MCPServer** | Petición de herramienta (JSON) | Datos crudos (JSON) |
| **DB Repository** | Parámetros de función | Filas de base de datos (Arrays) |

---
*Documento generado automáticamente por Antigravity para documentación técnica.*
