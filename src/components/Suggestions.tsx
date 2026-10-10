"use client";
import { useState } from "react";
import type { Level, Suggestion } from "@/lib/insights";

const LABEL: Record<Level, string> = { high: "Act now", medium: "Worth fixing", low: "Minor", good: "Looks good" };
const FILTERS = ["all", "high", "medium", "low", "good"] as const;

export function Suggestions({ items }: { items: Suggestion[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [open, setOpen] = useState<number | null>(0);
  const shown = items.filter((s) => filter === "all" || s.level === filter);
  return (
    <div className="card">
      <div className="head">
        <h2>Findings &amp; suggestions</h2>
        <div className="seg">
          {FILTERS.map((f) => {
            const n = f === "all" ? items.length : items.filter((s) => s.level === f).length;
            return <button key={f} className={filter === f ? "on" : ""} onClick={() => { setFilter(f); setOpen(null); }}>{f === "all" ? "All" : LABEL[f]} {n}</button>;
          })}
        </div>
      </div>
      {shown.map((s, i) => (
        <div key={s.title} className="tip" onClick={() => setOpen(open === i ? null : i)}>
          <div className="t"><span className={`chip ${s.level}`}>{LABEL[s.level]}</span>{s.title}<span className="area">{s.area} {open === i ? "▴" : "▾"}</span></div>
          {open === i && <p>{s.detail}</p>}
        </div>
      ))}
      {!shown.length && <p className="empty">Nothing in this group.</p>}
    </div>
  );
}
