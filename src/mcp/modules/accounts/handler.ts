import { accountRepository } from "../../../db/accounts.js";

type HandlerFn = (args: Record<string, unknown>) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>;

export const accountHandlers: Record<string, HandlerFn> = {

    async create_account(args) {
        const { name, type, balance, alias, account_number } = args as {
            name: string; type: string; balance: number; alias: string; account_number?: string;
        };
        const acc = await accountRepository.create(name, type, balance, alias, account_number);
        return {
            content: [{ type: "text", text: `✅ Cuenta creada: ${acc.name} (alias: ${acc.alias ?? "—"})` }]
        };
    },

    async get_accounts(_args) {
        const accounts = await accountRepository.getAll();
        return {
            content: [{ type: "text", text: JSON.stringify(accounts, null, 2) }]
        };
    },

    async get_account_balance(args) {
        const { account_identifier } = args as { account_identifier: string };
        const account = await accountRepository.findByIdentifier(account_identifier);
        if (!account) {
            throw new Error(`La cuenta '${account_identifier}' no existe. Revisa el alias.`);
        }
        return {
            content: [{
                type: "text",
                text: `💰 ${account.name} (${account.alias ?? account.account_number}): $${account.balance.toLocaleString("es-CO")}`
            }]
        };
    }
};
