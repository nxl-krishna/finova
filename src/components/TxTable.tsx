"use client";
import { useMemo, useState } from "react";
import { deleteTransaction } from "@/app/actions";
import { fmt } from "@/lib/finance";
import { DeleteButton } from "./DeleteButton";

type Tx = { id: string; type: "INCOME" | "EXPENSE"; category: string; description: string; amount: number; date: string; account: string | null };

export function TxTable({ txs }: { txs: Tx[] }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState<"ALL" | Tx["type"]>("ALL");
  const [sort, setSort] = useState<{ key: "date" | "amount"; dir: 1 | -1 }>({ key: "date", dir: -1 });

  const rows = useMemo(() => {
    const s = q.toLowerCase();
    return txs
      .filter((t) => (type === "ALL" || t.type === type) && (!s || `${t.category} ${t.description}`.toLowerCase().includes(s)))
      .sort((a, b) => (sort.key === "amount" ? a.amount - b.amount : a.date.localeCompare(b.date)) * sort.dir);
  }, [txs, q, type, sort]);

  const net = rows.reduce((s, t) => s + (t.type === "INCOME" ? t.amount : -t.amount), 0);
  const toggle = (key: "date" | "amount") => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : -1 }));
  const arrow = (key: string) => (sort.key === key ? (sort.dir === 1 ? " ↑" : " ↓") : "");

  return (
    <div className="card">
      <div className="head">
        <input placeholder="🔎 Search category or note" value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: "1 1 220px", maxWidth: 320 }} />
        <div className="seg">
          {(["ALL", "EXPENSE", "INCOME"] as const).map((t) => (
            <button key={t} className={type === t ? "on" : ""} onClick={() => setType(t)}>{t === "ALL" ? "All" : t === "INCOME" ? "Income" : "Expenses"}</button>
          ))}
        </div>
      </div>
      <table data-testid="tx-table">
        <thead>
          <tr>
            <th className="sortable" onClick={() => toggle("date")}>Date{arrow("date")}</th>
            <th>Category</th><th>Note</th><th>Account</th>
            <th className="num sortable" onClick={() => toggle("amount")}>Amount{arrow("amount")}</th><th />
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id}>
              <td className="muted">{t.date}</td>
              <td>{t.category}</td>
              <td className="muted">{t.description}</td>
              <td className="muted">{t.account ?? "—"}</td>
              <td className={`num ${t.type === "INCOME" ? "pos" : ""}`}>{t.type === "INCOME" ? "+" : "-"}{fmt(t.amount)}</td>
              <td className="num"><DeleteButton action={deleteTransaction.bind(null, t.id)} what="this transaction" /></td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={6} className="empty">{txs.length ? "No matches for that filter." : "No transactions yet. Add your first one above 👆"}</td></tr>}
        </tbody>
      </table>
      {rows.length > 0 && <p className="muted" style={{ fontSize: ".85rem", margin: ".8rem 0 0" }}>{rows.length} shown · net <b className={net >= 0 ? "pos" : "neg"}>{fmt(net)}</b></p>}
    </div>
  );
}
