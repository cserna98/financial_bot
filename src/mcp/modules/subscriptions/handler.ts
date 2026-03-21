import { subscriptionRepository } from "../../../db/subscriptions.js";

type HandlerFn = (args: Record<string, unknown>) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>;

export const subscriptionHandlers: Record<string, HandlerFn> = {

    async add_subscription(args) {
        const { name, amount, billing_day, account_identifier } = args as {
            name: string;
            amount: number;
            billing_day: number;
            account_identifier?: string;
        };

        if (billing_day < 1 || billing_day > 31) {
            throw new Error("El día de cobro debe estar entre 1 y 31.");
        }

        const sub = await subscriptionRepository.create({
            name,
            amount,
            billing_day,
            account_identifier
        });

        return {
            content: [{
                type: "text",
                text: `✅ Suscripción '${sub.name}' registrada: $${Number(amount).toLocaleString("es-CO")}/mes — se cobra el día ${billing_day}.`
            }]
        };
    },

    async list_subscriptions(_args) {
        const subs = await subscriptionRepository.getAll();
        if (!subs.length) {
            return { content: [{ type: "text", text: "📋 No tienes suscripciones registradas aún." }] };
        }
        const total = subs.reduce((sum, s) => sum + parseFloat(s.amount as unknown as string), 0);
        return {
            content: [{
                type: "text",
                text: `📋 Suscripciones (${subs.length}):\n${JSON.stringify(subs, null, 2)}\n\n💰 Total mensual: $${total.toLocaleString("es-CO")}`
            }]
        };
    },

    async check_upcoming_bills(args) {
        const { days_ahead = 7 } = args as { days_ahead?: number };

        const today = new Date();
        const currentDay = today.getDate();
        const endDay = currentDay + (days_ahead as number);

        const subs = await subscriptionRepository.getAll();
        const upcoming = subs.filter(s =>
            s.billing_day >= currentDay && s.billing_day <= endDay
        );

        if (!upcoming.length) {
            return {
                content: [{ type: "text", text: `✅ No tienes cobros en los próximos ${days_ahead} días.` }]
            };
        }

        const total = upcoming.reduce((sum, s) => sum + parseFloat(s.amount as unknown as string), 0);
        return {
            content: [{
                type: "text",
                text: `⚠️ Cobros en los próximos ${days_ahead} días:\n${JSON.stringify(upcoming, null, 2)}\n\n💸 Total próximo: $${total.toLocaleString("es-CO")}`
            }]
        };
    },

    async update_subscription(args) {
        const { subscription_id, ...updates } = args as { subscription_id: number } & any;
        const updated = await subscriptionRepository.update(subscription_id, updates);
        if (!updated) {
            throw new Error(`Suscripción con ID ${subscription_id} no encontrada.`);
        }
        return {
            content: [{ type: "text", text: `✅ Suscripción '${updated.name}' actualizada correctamente.` }]
        };
    },

    async delete_subscription(args) {
        const { subscription_id } = args as { subscription_id: number };
        await subscriptionRepository.delete(subscription_id);
        return {
            content: [{ type: "text", text: `✅ Suscripción con ID ${subscription_id} eliminada correctamente.` }]
        };
    }
};
