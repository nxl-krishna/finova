import { addTransaction } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getTransactions } from "@/lib/data";
import { ActionForm } from "@/components/ActionForm";
import { TxTable } from "@/components/TxTable";

export default async function Transactions() {
  const user = await requireUser();
  const [txs, accounts] = await Promise.all([getTransactions(user.id), db.account.findMany({ where: { userId: user.id }, select: { id: true, name: true } })]);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <h1>Transactions</h1>
      <p className="sub">Everything coming in and going out.</p>
      <div className="card">
        <h2>New transaction</h2>
        <ActionForm action={addTransaction} submit="Add">
          <select name="type" aria-label="Type"><option value="EXPENSE">Expense</option><option value="INCOME">Income</option></select>
          <input name="category" placeholder="Category" required list="cats" />
          <datalist id="cats">{["Groceries", "Rent", "Dining", "Transport", "Utilities", "Entertainment", "Salary"].map((c) => <option key={c} value={c} />)}</datalist>
          <input name="description" placeholder="Note (optional)" />
          <input name="amount" type="number" step="0.01" min="0.01" placeholder="Amount" required />
          <input name="date" type="date" defaultValue={today} required aria-label="Date" />
          <select name="accountId" aria-label="Account"><option value="">No account</option>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
        </ActionForm>
      </div>
      <TxTable txs={txs.map((t) => ({ ...t, date: t.date.toISOString().slice(0, 10) }))} />
    </>
  );
}
