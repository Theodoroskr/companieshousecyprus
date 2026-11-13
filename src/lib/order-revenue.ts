/** Shared rules for which orders count as revenue in admin stats and how much they count for. */

export type RevenueOrder = {
  status: string | null;
  total_cents?: number | null;
  charged_total_cents?: number | null;
};

/** Orders that were paid for and not cancelled. Awaiting payment and cancelled orders never count. */
const REVENUE_STATUSES = new Set(["paid", "processing", "delivered", "completed"]);

export function countsAsRevenue(order: Pick<RevenueOrder, "status">): boolean {
  return REVENUE_STATUSES.has(order.status ?? "");
}

/** What the customer was actually charged at checkout; falls back to the quoted total for older orders. */
export function collectedCents(order: RevenueOrder): number {
  if (!countsAsRevenue(order)) return 0;
  return order.charged_total_cents ?? order.total_cents ?? 0;
}

export function sumCollectedCents(orders: RevenueOrder[]): number {
  return orders.reduce((sum, order) => sum + collectedCents(order), 0);
}
