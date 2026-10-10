import { describe, expect, it } from "vitest";
import { analyze, maxDrawdown } from "./insights";

const base = { history: [], cash: 0, liabilities: 0, cashflow: [], budgets: [] };
const h = (symbol: string, marketValue: number, costBasis = marketValue) => ({ symbol, name: symbol, marketValue, costBasis, unrealized: marketValue - costBasis, realized: 0, prices: [] });

describe("analyze", () => {
  it("flags concentration and crypto exposure", () => {
    const a = analyze({ ...base, holdings: [h("BTC", 8000), h("AAPL", 2000)] });
    expect(a.suggestions.map((s) => s.level)).toContain("high");
    expect(a.suggestions.some((s) => s.title.includes("BTC is 80%"))).toBe(true);
    expect(a.metrics.cryptoShare).toBeCloseTo(0.8);
  });

  it("rewards a healthy profile", () => {
    const a = analyze({
      ...base,
      holdings: [h("A", 1000), h("B", 1000), h("C", 1000), h("D", 1000), h("E", 1000)],
      cash: 12000,
      cashflow: [{ month: "2026-01", income: 5000, expense: 2000 }],
    });
    expect(a.score).toBe(100);
    expect(a.suggestions.every((s) => s.level === "good")).toBe(true);
  });

  it("computes drawdown", () => {
    expect(maxDrawdown([100, 120, 90, 130])).toBeCloseTo(0.25);
  });
});
