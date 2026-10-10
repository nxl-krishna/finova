import { describe, expect, it } from "vitest";
import { budgetProgress, computePosition, monthlyCashflow, portfolioHistory } from "./finance";

const d = (s: string) => new Date(s);

describe("computePosition", () => {
  it("computes average cost and unrealized P&L", () => {
    const p = computePosition(
      [
        { side: "BUY", quantity: 10, price: 100, date: d("2026-01-01") },
        { side: "BUY", quantity: 10, price: 200, date: d("2026-02-01") },
      ],
      180,
    );
    expect(p).toMatchObject({ quantity: 20, avgCost: 150, costBasis: 3000, marketValue: 3600, unrealized: 600, realized: 0, unrealizedPct: 20 });
  });

  it("realizes gains on sell using average cost and fees", () => {
    const p = computePosition(
      [
        { side: "BUY", quantity: 10, price: 100, fee: 10, date: d("2026-01-01") },
        { side: "SELL", quantity: 5, price: 150, fee: 5, date: d("2026-03-01") },
      ],
      120,
    );
    // avg = 101, realized = 5*(150-101) - 5 = 240
    expect(p.realized).toBe(240);
    expect(p.quantity).toBe(5);
    expect(p.costBasis).toBe(505);
    expect(p.unrealized).toBe(95);
  });

  it("rejects overselling", () => {
    expect(() => computePosition([{ side: "SELL", quantity: 1, price: 1, date: d("2026-01-01") }], 1)).toThrow();
  });
});

describe("portfolioHistory", () => {
  it("values holdings at each price date", () => {
    const h = portfolioHistory([
      {
        trades: [{ side: "BUY", quantity: 2, price: 10, date: d("2026-01-02") }],
        prices: [
          { date: d("2026-01-01"), price: 10 },
          { date: d("2026-01-02"), price: 11 },
          { date: d("2026-01-03"), price: 12 },
        ],
      },
    ]);
    expect(h.map((x) => x.value)).toEqual([0, 22, 24]);
  });
});

describe("budget & cashflow", () => {
  it("computes budget usage", () => {
    expect(budgetProgress([{ category: "Food", limit: 200 }], { Food: 150 })[0]).toMatchObject({ spent: 150, remaining: 50, pct: 75 });
  });
  it("groups cashflow by month", () => {
    const r = monthlyCashflow([
      { type: "INCOME", amount: 1000, date: d("2026-01-05") },
      { type: "EXPENSE", amount: 200, date: d("2026-01-10") },
      { type: "EXPENSE", amount: 50, date: d("2026-02-01") },
    ]);
    expect(r).toEqual([
      { month: "2026-01", income: 1000, expense: 200 },
      { month: "2026-02", income: 0, expense: 50 },
    ]);
  });
});
