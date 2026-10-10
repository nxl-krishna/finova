import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getInsights, getNetWorth, getPortfolio, getSpendByCategory, getTransactions, startOfMonth } from "@/lib/data";
import { fmt, monthlyCashflow } from "@/lib/finance";
import { AreaTrend, CashflowBars, Donut } from "@/components/Charts";
import { Stat } from "@/components/Stat";

function greeting() {
  const h = Number(new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default async function Dashboard() {
  const user = await requireUser();
  const sixMonthsAgo = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 5, 1));
  const [nw, portfolio, txs, spend, insights] = await Promise.all([
    getNetWorth(user.id),
    getPortfolio(user.id),
    getTransactions(user.id, sixMonthsAgo),
    getSpendByCategory(user.id, startOfMonth()),
    getInsights(user.id),
  ]);
  const cashflow = monthlyCashflow(txs);
  const thisMonth = cashflow.at(-1)?.month === new Date().toISOString().slice(0, 7) ? cashflow.at(-1)! : { income: 0, expense: 0 };
  const left = thisMonth.income - thisMonth.expense;
  const top = insights.suggestions.filter((s) => s.level !== "good").slice(0, 2);
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <>
      <h1>{greeting()}, {user.name.split(" ")[0]} 👋</h1>
      <p className="sub">{today}</p>
      <div className="grid">
        <Stat icon="🏦" label="Net worth" value={nw.netWorth} testId="net-worth" />
        <Stat icon="📈" label="Investments" value={portfolio.totals.marketValue} note={`${portfolio.totals.unrealized >= 0 ? "+" : ""}${fmt(portfolio.totals.unrealized)} unrealized`} />
        <Stat icon="💰" label="Income this month" value={thisMonth.income} />
        <Stat icon="💸" label="Spent this month" value={thisMonth.expense} note={left >= 0 ? `${fmt(left)} left over` : `${fmt(-left)} over income`} />
      </div>

      {top.length > 0 && (
        <Link href="/insights" className="card" style={{ display: "flex", gap: "1rem", alignItems: "center", borderColor: "#d8ebe5", background: "#f7fbf9" }}>
          <span style={{ fontSize: "1.4rem" }}>💡</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{top[0].title}</div>
            <div className="muted" style={{ fontSize: ".87rem" }}>{top.length > 1 ? `Also: ${top[1].title.toLowerCase()}` : top[0].area}</div>
          </div>
          <span className="muted" style={{ fontSize: ".87rem", whiteSpace: "nowrap" }}>Health score <b style={{ color: "#1d1b16" }}>{insights.score}</b> →</span>
        </Link>
      )}

      <div className="grid2">
        <div className="card"><h2>Cash flow, last 6 months</h2><CashflowBars data={cashflow} /></div>
        <div className="card"><h2>Where the money went this month</h2><Donut data={Object.entries(spend).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)} /></div>
      </div>
      <div className="card"><AreaTrend title="Portfolio value" data={portfolio.history} x="date" y="value" /></div>
      <div className="card">
        <div className="head"><h2>Recent activity</h2><Link href="/transactions" className="muted" style={{ fontSize: ".87rem" }}>See all →</Link></div>
        <table>
          <tbody>
            {txs.slice(0, 6).map((t) => (
              <tr key={t.id}>
                <td className="muted" style={{ width: 110 }}>{t.date.toISOString().slice(0, 10)}</td>
                <td>{t.category}</td>
                <td className="muted">{t.description}</td>
                <td className={`num ${t.type === "INCOME" ? "pos" : ""}`}>{t.type === "INCOME" ? "+" : "-"}{fmt(t.amount)}</td>
              </tr>
            ))}
            {!txs.length && <tr><td className="empty">No activity yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
