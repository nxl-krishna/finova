"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/app/actions";

const NAV = [
  ["/dashboard", "🏠", "Overview"],
  ["/transactions", "🧾", "Transactions"],
  ["/budgets", "🎯", "Budgets"],
  ["/investments", "📈", "Investments"],
  ["/insights", "🔍", "Insights"],
  ["/net-worth", "🏦", "Net worth"],
];

export function Sidebar({ name }: { name: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <aside className={`side ${open ? "open" : ""}`}>
      <div className="brand"><i>F</i>Finova</div>
      <button className="ghost menu-btn" onClick={() => setOpen(!open)} aria-label="Menu">☰</button>
      <nav onClick={() => setOpen(false)}>
        {NAV.map(([href, icon, label]) => (
          <Link key={href} href={href} className={path.startsWith(href) ? "active" : ""}>
            <span>{icon}</span>{label}
          </Link>
        ))}
      </nav>
      <div className="foot">
        <div style={{ fontWeight: 600 }}>{name}</div>
        <form action={logout}><button className="link" style={{ paddingLeft: 0 }}>Sign out</button></form>
      </div>
    </aside>
  );
}
