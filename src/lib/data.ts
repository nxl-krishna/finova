import "server-only";
import { db } from "./db";
import { budgetProgress, computePosition, monthlyCashflow, portfolioHistory } from "./finance";
import { analyze } from "./insights";

/** All reads take the authorized userId — never trust ids coming from the client. */

export async function getPortfolio(userId: string) {
  const assets = await db.asset.findMany({
    where: { userId },
    include: { trades: { orderBy: { date: "asc" } }, prices: { orderBy: { date: "asc" } } },
    orderBy: { symbol: "asc" },
  });
  const normalized = assets.map((a) => ({
    id: a.id,
    symbol: a.symbol,
    name: a.name,
    currentPrice: +a.currentPrice,
    trades: a.trades.map((t) => ({ id: t.id, side: t.side, quantity: +t.quantity, price: +t.price, fee: +t.fee, date: t.date })),
    prices: a.prices.map((p) => ({ date: p.date, price: +p.price })),
  }));
  const holdings = normalized.map((a) => ({ ...a, position: computePosition(a.trades, a.currentPrice) }));
  const totals = holdings.reduce(
    (s, h) => ({
      marketValue: s.marketValue + h.position.marketValue,
      costBasis: s.costBasis + h.position.costBasis,
      realized: s.realized + h.position.realized,
      unrealized: s.unrealized + h.position.unrealized,
    }),
    { marketValue: 0, costBasis: 0, realized: 0, unrealized: 0 },
  );
  return { holdings, totals, history: portfolioHistory(normalized) };
}

export async function getNetWorth(userId: string) {
  const [accounts, portfolio] = await Promise.all([db.account.findMany({ where: { userId }, orderBy: { name: "asc" } }), getPortfolio(userId)]);
  const sum = (t: "ASSET" | "LIABILITY") => accounts.filter((a) => a.type === t).reduce((s, a) => s + +a.balance, 0);
  const assets = sum("ASSET") + portfolio.totals.marketValue;
  const liabilities = sum("LIABILITY");
  return {
    accounts: accounts.map((a) => ({ id: a.id, name: a.name, type: a.type, balance: +a.balance })),
    investments: portfolio.totals.marketValue,
    assets,
    liabilities,
    netWorth: assets - liabilities,
  };
}

export async function getTransactions(userId: string, from?: Date) {
  const txs = await db.transaction.findMany({ where: { userId, ...(from && { date: { gte: from } }) }, orderBy: { date: "desc" }, include: { account: { select: { name: true } } } });
  return txs.map((t) => ({ id: t.id, type: t.type, category: t.category, description: t.description, amount: +t.amount, date: t.date, account: t.account?.name ?? null }));
}

export async function getSpendByCategory(userId: string, from: Date) {
  const rows = await db.transaction.groupBy({ by: ["category"], where: { userId, type: "EXPENSE", date: { gte: from } }, _sum: { amount: true } });
  return Object.fromEntries(rows.map((r) => [r.category, +(r._sum.amount ?? 0)]));
}

export async function getSnapshots(userId: string) {
  const s = await db.netWorthSnapshot.findMany({ where: { userId }, orderBy: { date: "asc" } });
  return s.map((x) => ({ date: x.date.toISOString().slice(0, 10), assets: +x.assets, liabilities: +x.liabilities, netWorth: +x.assets - +x.liabilities }));
}

export async function getInsights(userId: string) {
  const sixMonthsAgo = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 5, 1));
  const [portfolio, nw, txs, budgets, spend] = await Promise.all([
    getPortfolio(userId),
    getNetWorth(userId),
    getTransactions(userId, sixMonthsAgo),
    db.budget.findMany({ where: { userId } }),
    getSpendByCategory(userId, startOfMonth()),
  ]);
  return analyze({
    holdings: portfolio.holdings.map((h) => ({ symbol: h.symbol, name: h.name, prices: h.prices, ...h.position })),
    history: portfolio.history,
    cash: nw.assets - nw.investments,
    liabilities: nw.liabilities,
    cashflow: monthlyCashflow(txs),
    budgets: budgetProgress(budgets.map((b) => ({ category: b.category, limit: +b.limit })), spend),
  });
}

export const startOfMonth = () => {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1));
};
