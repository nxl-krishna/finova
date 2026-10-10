export type TradeInput = { side: "BUY" | "SELL"; quantity: number; price: number; fee?: number; date: Date };

export type Position = {
  quantity: number;
  avgCost: number;
  costBasis: number;
  marketValue: number;
  realized: number;
  unrealized: number;
  unrealizedPct: number;
};

const round = (n: number, d = 2) => Math.round((n + Number.EPSILON) * 10 ** d) / 10 ** d;

/** Average-cost method. Buy fees are capitalised into cost; sell fees reduce realized P&L. */
export function computePosition(trades: TradeInput[], currentPrice: number): Position {
  let quantity = 0;
  let costBasis = 0;
  let realized = 0;
  for (const t of [...trades].sort((a, b) => +a.date - +b.date)) {
    const fee = t.fee ?? 0;
    if (t.side === "BUY") {
      quantity += t.quantity;
      costBasis += t.quantity * t.price + fee;
    } else {
      if (t.quantity > quantity + 1e-9) throw new Error("Cannot sell more than held");
      const avg = quantity ? costBasis / quantity : 0;
      realized += t.quantity * (t.price - avg) - fee;
      costBasis -= avg * t.quantity;
      quantity -= t.quantity;
      if (quantity < 1e-9) { quantity = 0; costBasis = 0; }
    }
  }
  const marketValue = quantity * currentPrice;
  const unrealized = marketValue - costBasis;
  return {
    quantity: round(quantity, 6),
    avgCost: quantity ? round(costBasis / quantity, 4) : 0,
    costBasis: round(costBasis),
    marketValue: round(marketValue),
    realized: round(realized),
    unrealized: round(unrealized),
    unrealizedPct: costBasis ? round((unrealized / costBasis) * 100) : 0,
  };
}

export function quantityAt(trades: TradeInput[], date: Date) {
  return trades.reduce((q, t) => (t.date <= date ? q + (t.side === "BUY" ? t.quantity : -t.quantity) : q), 0);
}

/** Portfolio value per date using the most recent known price on or before each date. */
export function portfolioHistory(
  assets: { trades: TradeInput[]; prices: { date: Date; price: number }[] }[],
): { date: string; value: number }[] {
  const dates = [...new Set(assets.flatMap((a) => a.prices.map((p) => p.date.toISOString().slice(0, 10))))].sort();
  return dates.map((d) => {
    const at = new Date(d + "T23:59:59Z");
    const value = assets.reduce((sum, a) => {
      const last = a.prices.filter((p) => p.date <= at).sort((x, y) => +y.date - +x.date)[0];
      return last ? sum + quantityAt(a.trades, at) * last.price : sum;
    }, 0);
    return { date: d, value: round(value) };
  });
}

export function budgetProgress(budgets: { category: string; limit: number }[], spent: Record<string, number>) {
  return budgets.map((b) => {
    const s = round(spent[b.category] ?? 0);
    return { ...b, spent: s, remaining: round(b.limit - s), pct: b.limit ? Math.min(999, round((s / b.limit) * 100)) : 0 };
  });
}

export function monthlyCashflow(txs: { type: "INCOME" | "EXPENSE"; amount: number; date: Date }[]) {
  const map = new Map<string, { month: string; income: number; expense: number }>();
  for (const t of txs) {
    const m = t.date.toISOString().slice(0, 7);
    const row = map.get(m) ?? { month: m, income: 0, expense: 0 };
    row[t.type === "INCOME" ? "income" : "expense"] += t.amount;
    map.set(m, row);
  }
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month)).map((r) => ({ ...r, income: round(r.income), expense: round(r.expense) }));
}

export const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
