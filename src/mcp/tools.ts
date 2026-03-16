import { Tool } from "@modelcontextprotocol/sdk/types.js";

import { accountTools } from "./modules/accounts/tools.js";
import { transactionTools } from "./modules/transactions/tools.js";
import { debtTools } from "./modules/debts/tools.js";
import { eventTools } from "./modules/events/tools.js";
import { subscriptionTools } from "./modules/subscriptions/tools.js";
import { coreTools } from "./modules/core/tools.js";

export const tools: Tool[] = [
    ...accountTools,
    ...transactionTools,
    ...debtTools,
    ...eventTools,
    ...subscriptionTools,
    ...coreTools,
];