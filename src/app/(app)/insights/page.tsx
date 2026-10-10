import { requireUser } from "@/lib/auth";
import { getInsights } from "@/lib/data";
import { fmt } from "@/lib/finance";
import { AiReview } from "@/components/AiReview";
import { Suggestions } from "@/components/Suggestions";

const p = (n: number) => `${(n * 100).toFixed(1)}%`;

export default async function Insights() {
  const user = await requireUser();
  const { score, metrics: m, rows, suggestions } = await getInsights(user.id);
  const color = score >= 80 ? "#15803d" : score >= 60 ? "#b45309" : "#c2410c";
  const verdict = score >= 80 ? "In good shape" : score >= 60 ? "Solid, with a few gaps" : "Needs attention";
  const urgent = suggestions.filter((s) => s.level === "high").length;

  const facts: [string, string][] = [
    ["Effective holdings", String(m.effectiveHoldings)],
    ["Volatility (yearly)", p(m.portfolioVol)],
    ["Max drawdown", p(m.drawdown)],
    ["Crypto share", p(m.cryptoShare)],
    ["Savings rate (3 mo)", p(m.savingsRate)],
    ["Emergency fund", `${m.emergencyMonths.toFixed(1)} months`],
    ["Debt / assets", p(m.debtRatio)],
    ["Total return", m.costBasis ? p(m.unrealized / m.costBasis) : "—"],
  ];

  return (
    <>
      <h1>Insights</h1>
      <p className="sub">A health check of your portfolio and finances, recalculated every time your data changes.</p>

      <div className="grid2">
        <div className="card score">
          <div className="ring" style={{ "--p": score, "--c": color } as React.CSSProperties}><b data-testid="health-score">{score}</b></div>
          <div>
            <div className="muted" style={{ fontSize: ".83rem" }}>Financial health score</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 650, margin: ".2rem 0" }}>{verdict}</div>
            <div className="muted" style={{ fontSize: ".88rem" }}>{urgent ? `${urgent} thing${urgent > 1 ? "s" : ""} to look at first.` : "Nothing urgent right now."}</div>
          </div>
        </div>
        <div className="card">
          <table><tbody>
            {facts.slice(0, 4).map(([k, v], i) => (
              <tr key={k}><td className="muted">{k}</td><td className="num"><b>{v}</b></td><td className="muted" style={{ paddingLeft: "1.5rem" }}>{facts[i + 4][0]}</td><td className="num"><b>{facts[i + 4][1]}</b></td></tr>
            ))}
          </tbody></table>
        </div>
      </div>

      <Suggestions items={suggestions} />

      <div className="card">
        <h2>Position breakdown</h2>
        <table>
          <thead><tr><th>Holding</th><th style={{ width: "30%" }}>Weight</th><th className="num">Value</th><th className="num">Return</th><th className="num">Volatility</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.symbol}>
                <td><b>{r.symbol}</b> <span className="muted">{r.name}</span></td>
                <td><div style={{ display: "flex", alignItems: "center", gap: 8 }}><div className="bar" style={{ flex: 1 }}><div className={r.weight > 0.4 ? "over" : r.weight > 0.25 ? "warn" : ""} style={{ width: p(r.weight) }} /></div><span className="muted" style={{ fontSize: ".82rem", width: 44 }}>{p(r.weight)}</span></div></td>
                <td className="num">{fmt(r.value)}</td>
                <td className={`num ${r.returnPct >= 0 ? "pos" : "neg"}`}>{p(r.returnPct)}</td>
                <td className="num">{r.volatility ? p(r.volatility) : "—"}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={5} className="empty">No open positions yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <AiReview />
      <p className="muted" style={{ fontSize: ".8rem" }}>For education only. This isn&apos;t financial advice.</p>
    </>
  );
}
