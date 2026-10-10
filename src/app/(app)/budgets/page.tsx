import { deleteBudget, upsertBudget } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSpendByCategory, startOfMonth } from "@/lib/data";
import { budgetProgress, fmt } from "@/lib/finance";
import { ActionForm } from "@/components/ActionForm";
import { DeleteButton } from "@/components/DeleteButton";

export default async function Budgets() {
  const user = await requireUser();
  const [budgets, spend] = await Promise.all([db.budget.findMany({ where: { userId: user.id }, orderBy: { category: "asc" } }), getSpendByCategory(user.id, startOfMonth())]);
  const ids = Object.fromEntries(budgets.map((b) => [b.category, b.id]));
  const rows = budgetProgress(budgets.map((b) => ({ category: b.category, limit: +b.limit })), spend);
  const total = rows.reduce((s, r) => ({ spent: s.spent + r.spent, limit: s.limit + r.limit }), { spent: 0, limit: 0 });
  const now = new Date();
  const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();

  return (
    <>
      <h1>Budgets</h1>
      <p className="sub">
        {rows.length ? <>{fmt(total.spent)} of {fmt(total.limit)} used this month · {daysLeft} days to go</> : "Set a monthly limit for the categories you want to keep an eye on."}
      </p>
      <div className="card">
        <h2>Set a limit</h2>
        <ActionForm action={upsertBudget}>
          <input name="category" placeholder="Category (matches transactions)" required />
          <input name="limit" type="number" step="0.01" min="0.01" placeholder="Monthly limit" required />
        </ActionForm>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>Category</th><th style={{ width: "36%" }}>Progress</th><th className="num">Spent</th><th className="num">Limit</th><th className="num">Left</th><th /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.category} data-testid={`budget-${r.category}`}>
                <td>{r.pct > 100 ? "🔴 " : r.pct >= 80 ? "🟠 " : ""}{r.category}</td>
                <td title={`${r.pct}% used`}><div className="bar"><div className={r.pct > 100 ? "over" : r.pct >= 80 ? "warn" : ""} style={{ width: `${Math.min(100, r.pct)}%` }} /></div></td>
                <td className="num">{fmt(r.spent)}</td>
                <td className="num muted">{fmt(r.limit)}</td>
                <td className={`num ${r.remaining < 0 ? "neg" : ""}`}>{fmt(r.remaining)}</td>
                <td className="num"><DeleteButton action={deleteBudget.bind(null, ids[r.category])} what={`the ${r.category} budget`} /></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={6} className="empty">No budgets yet 🎯</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
