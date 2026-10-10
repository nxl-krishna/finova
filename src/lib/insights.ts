export type InsightInput = {
  holdings: { symbol: string; name: string; marketValue: number; costBasis: number; unrealized: number; realized: number; prices: { date: Date; price: number }[] }[];
  history: { date: string; value: number }[];
  cash: number;
  liabilities: number;
  cashflow: { month: string; income: number; expense: number }[];
  budgets: { category: string; limit: number; spent: number; pct: number }[];
};

export type Level = "high" | "medium" | "low" | "good";
export type Suggestion = { level: Level; area: string; title: string; detail: string };

const CRYPTO = new Set(["BTC", "ETH", "SOL", "XRP", "ADA", "DOGE", "BNB", "AVAX", "DOT", "MATIC"]);
const r1 = (n: number) => Math.round(n * 10) / 10;
const pct = (n: number) => `${r1(n * 100)}%`;
const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function annualVolatility(prices: { price: number }[]) {
  if (prices.length < 3) return 0;
  const rets = prices.slice(1).map((p, i) => p.price / prices[i].price - 1);
  const mean = rets.reduce((s, r) => s + r, 0) / rets.length;
  const variance = rets.reduce((s, r) => s + (r - mean) ** 2, 0) / (rets.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252);
}

export function maxDrawdown(values: number[]) {
  let peak = 0;
  let dd = 0;
  for (const v of values) {
    peak = Math.max(peak, v);
    if (peak > 0) dd = Math.max(dd, (peak - v) / peak);
  }
  return dd;
}

export function analyze(input: InsightInput) {
  const total = input.holdings.reduce((s, h) => s + h.marketValue, 0);
  const rows = input.holdings
    .filter((h) => h.marketValue > 0)
    .map((h) => ({
      symbol: h.symbol,
      name: h.name,
      value: h.marketValue,
      weight: total ? h.marketValue / total : 0,
      returnPct: h.costBasis ? h.unrealized / h.costBasis : 0,
      volatility: annualVolatility(h.prices),
    }))
    .sort((a, b) => b.weight - a.weight);

  const hhi = rows.reduce((s, r) => s + r.weight ** 2, 0);
  const effectiveHoldings = hhi ? 1 / hhi : 0;
  const cryptoShare = rows.filter((r) => CRYPTO.has(r.symbol)).reduce((s, r) => s + r.weight, 0);
  const portfolioVol = rows.reduce((s, r) => s + r.weight * r.volatility, 0);
  // Buy-and-hold index of the current mix, so deposits/withdrawals don't register as drawdowns.
  const series = input.holdings.filter((h) => h.marketValue > 0 && h.prices.length).map((h) => ({ w: h.marketValue / total, prices: h.prices }));
  const dates = [...new Set(series.flatMap((s) => s.prices.map((p) => +p.date)))].sort((a, b) => a - b);
  const index = dates.map((d) => series.reduce((sum, s) => {
    const last = s.prices.filter((p) => +p.date <= d).at(-1) ?? s.prices[0];
    return sum + s.w * (last.price / s.prices[0].price);
  }, 0));
  const drawdown = maxDrawdown(index);
  const costBasis = input.holdings.reduce((s, h) => s + h.costBasis, 0);
  const unrealized = input.holdings.reduce((s, h) => s + h.unrealized, 0);
  const realized = input.holdings.reduce((s, h) => s + h.realized, 0);

  const recent = input.cashflow.slice(-3);
  const income = recent.reduce((s, m) => s + m.income, 0);
  const expense = recent.reduce((s, m) => s + m.expense, 0);
  const avgExpense = recent.length ? expense / recent.length : 0;
  const savingsRate = income ? (income - expense) / income : 0;
  const emergencyMonths = avgExpense ? input.cash / avgExpense : 0;
  const totalAssets = input.cash + total;
  const debtRatio = totalAssets ? input.liabilities / totalAssets : 0;
  const overBudget = input.budgets.filter((b) => b.pct > 100);
  const nearBudget = input.budgets.filter((b) => b.pct >= 80 && b.pct <= 100);

  const s: Suggestion[] = [];
  const add = (level: Level, area: string, title: string, detail: string) => s.push({ level, area, title, detail });

  if (!rows.length) {
    add("medium", "Investing", "You're not invested yet", "Even a small monthly contribution to a broad index fund puts compounding to work. Add an asset on the Investments page to start tracking.");
  } else {
    const top = rows[0];
    if (top.weight > 0.4) add("high", "Allocation", `${top.symbol} is ${pct(top.weight)} of your portfolio`, `A single position this large means one bad quarter for ${top.name} could set your whole portfolio back. Consider capping any one holding around 20–25% and redirecting new money elsewhere.`);
    else if (top.weight > 0.25) add("medium", "Allocation", `${top.symbol} is your heaviest position (${pct(top.weight)})`, "Not alarming, but worth watching. New contributions could go to your smaller positions to even things out.");
    if (effectiveHoldings < 3) add("medium", "Diversification", `Effectively ${r1(effectiveHoldings)} holdings`, "Weighted by size, your portfolio behaves like it holds fewer than three assets. A broad-market ETF is the simplest way to add breadth.");
    else add("good", "Diversification", `Spread across ~${r1(effectiveHoldings)} effective holdings`, "Your weights are reasonably balanced.");
    if (cryptoShare > 0.2) add("high", "Risk", `Crypto is ${pct(cryptoShare)} of investments`, "Crypto routinely drops 50%+ in downturns. Make sure this slice is money you could leave untouched for years.");
    else if (cryptoShare > 0.1) add("medium", "Risk", `Crypto is ${pct(cryptoShare)} of investments`, "A meaningful speculative slice. Many planners suggest keeping it in the 5–10% range.");
    if (portfolioVol > 0.3) add("medium", "Risk", `High volatility (~${pct(portfolioVol)} a year)`, "Expect large swings. Pairing growth assets with bonds or cash-like holdings would smooth the ride.");
    if (drawdown > 0.2) add("medium", "Risk", `Max drawdown of ${pct(drawdown)}`, "Held as it is today, your mix would have fallen this much from its peak in the tracked period. Ask yourself honestly whether you'd hold through a repeat.");
    for (const r of rows) {
      if (r.returnPct < -0.15) add("low", "Positions", `${r.symbol} is down ${pct(-r.returnPct)}`, "Re-check why you bought it. If the reason no longer holds, selling can also bank a tax loss to offset gains.");
      if (r.returnPct > 0.5 && r.weight > 0.2) add("medium", "Positions", `${r.symbol} is up ${pct(r.returnPct)} and now ${pct(r.weight)} of the portfolio`, "Nice run. Trimming a bit locks in some gain and brings your allocation back in line.");
    }
    if (realized > 0) add("low", "Tax", `${usd(realized)} in realized gains`, "These are likely taxable this year. Set aside a portion, or offset with losses before year end.");
  }

  if (avgExpense) {
    if (emergencyMonths < 3) add("high", "Safety net", `Cash covers ${r1(emergencyMonths)} months of spending`, "Aim for 3–6 months in an easy-access account before taking on more investment risk.");
    else if (emergencyMonths < 6) add("medium", "Safety net", `Cash covers ${r1(emergencyMonths)} months`, "You're past the 3-month minimum. Topping up toward 6 months gives more breathing room.");
    else if (emergencyMonths > 12 && total < input.cash) add("low", "Cash", `${r1(emergencyMonths)} months of cash sitting idle`, "Beyond ~6–12 months, extra cash loses ground to inflation. Consider investing part of it.");
    else add("good", "Safety net", `${r1(emergencyMonths)} months of expenses in cash`, "A healthy cushion.");
  }
  if (income) {
    if (savingsRate < 0.1) add("high", "Cash flow", `Savings rate is ${pct(savingsRate)}`, "Over the last 3 months you've kept very little of what came in. Your biggest expense categories are the place to start.");
    else if (savingsRate < 0.2) add("medium", "Cash flow", `Savings rate is ${pct(savingsRate)}`, "Decent. Pushing toward 20% speeds up every long-term goal.");
    else add("good", "Cash flow", `Saving ${pct(savingsRate)} of income`, "Strong habit. Automate it so it stays that way.");
  }
  if (debtRatio > 0.5) add("high", "Debt", `Debt is ${pct(debtRatio)} of assets`, "Pay down the highest-interest balances first. That's a guaranteed return.");
  else if (debtRatio > 0.3) add("medium", "Debt", `Debt is ${pct(debtRatio)} of assets`, "Manageable, but prioritise any card balances charging over ~8%.");
  if (overBudget.length) add("medium", "Budgets", `Over budget in ${overBudget.map((b) => b.category).join(", ")}`, "Either the limit is unrealistic or the spending needs a look. Adjust one of them so the budget stays useful.");
  if (nearBudget.length) add("low", "Budgets", `Close to the limit in ${nearBudget.map((b) => b.category).join(", ")}`, "Ease off these for the rest of the month.");

  const penalty = { high: 15, medium: 7, low: 2, good: 0 };
  const score = Math.max(0, Math.min(100, 100 - s.reduce((t, x) => t + penalty[x.level], 0)));
  const order = { high: 0, medium: 1, low: 2, good: 3 };
  s.sort((a, b) => order[a.level] - order[b.level]);

  return {
    score,
    metrics: { total, costBasis, unrealized, realized, effectiveHoldings: r1(effectiveHoldings), cryptoShare, portfolioVol, drawdown, savingsRate, emergencyMonths, debtRatio },
    rows,
    suggestions: s,
  };
}

export type Analysis = ReturnType<typeof analyze>;
