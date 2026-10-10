"use client";
import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const COLORS = ["#0e6b5c", "#d97706", "#2563eb", "#c2410c", "#7c3aed", "#0891b2", "#be185d", "#65a30d"];
const usd = (v: unknown) => Number(v).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const tip = { background: "#fff", border: "1px solid #e8e5de", borderRadius: 8, fontSize: 13, boxShadow: "0 6px 16px -8px rgba(0,0,0,.15)" };
const axis = { stroke: "#a8a29a", fontSize: 12, tickLine: false, axisLine: false };
const Empty = () => <p className="empty">Nothing to show yet 🌱</p>;

const RANGES = [["1M", 30], ["3M", 90], ["6M", 180], ["All", 0]] as const;

export function AreaTrend({ data, x, y, title }: { data: Record<string, unknown>[]; x: string; y: string; title: string }) {
  const [range, setRange] = useState<number>(0);
  const shown = useMemo(() => {
    if (!range) return data;
    const cutoff = new Date(Date.now() - range * 864e5).toISOString().slice(0, 10);
    return data.filter((d) => String(d[x]) >= cutoff);
  }, [data, range, x]);
  const first = Number(shown[0]?.[y] ?? 0);
  const last = Number(shown.at(-1)?.[y] ?? 0);
  const change = first ? (last - first) / first : 0;

  return (
    <>
      <div className="head">
        <h2>{title} {shown.length > 1 && first > 0 && <span className={change >= 0 ? "pos" : "neg"} style={{ fontWeight: 500, marginLeft: 6 }}>{change >= 0 ? "▲" : "▼"} {(change * 100).toFixed(1)}%</span>}</h2>
        <div className="seg">{RANGES.map(([l, d]) => <button key={l} className={range === d ? "on" : ""} onClick={() => setRange(d)}>{l}</button>)}</div>
      </div>
      {!shown.length ? <Empty /> : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={shown} margin={{ left: -10 }}>
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0e6b5c" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#0e6b5c" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#f0ede6" />
            <XAxis dataKey={x} {...axis} minTickGap={40} />
            <YAxis {...axis} tickFormatter={usd} width={80} domain={["auto", "auto"]} />
            <Tooltip formatter={usd} contentStyle={tip} />
            <Area type="monotone" dataKey={y} stroke="#0e6b5c" fill="url(#g)" strokeWidth={2} activeDot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </>
  );
}

export function MultiLine({ data, x, lines }: { data: Record<string, unknown>[]; x: string; lines: string[] }) {
  const [hidden, setHidden] = useState<string[]>([]);
  if (!data.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ left: -10 }}>
        <CartesianGrid vertical={false} stroke="#f0ede6" />
        <XAxis dataKey={x} {...axis} />
        <YAxis {...axis} tickFormatter={usd} width={80} />
        <Tooltip formatter={usd} contentStyle={tip} />
        <Legend wrapperStyle={{ cursor: "pointer", fontSize: 13 }} onClick={(e) => { const k = String(e.dataKey); setHidden((h) => h.includes(k) ? h.filter((x) => x !== k) : [...h, k]); }} />
        {lines.map((l, i) => <Line key={l} type="monotone" dataKey={l} hide={hidden.includes(l)} stroke={COLORS[i]} strokeWidth={2} dot={{ r: 3 }} />)}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function CashflowBars({ data }: { data: { month: string; income: number; expense: number }[] }) {
  if (!data.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ left: -10 }}>
        <CartesianGrid vertical={false} stroke="#f0ede6" />
        <XAxis dataKey="month" {...axis} />
        <YAxis {...axis} tickFormatter={usd} width={80} />
        <Tooltip formatter={usd} contentStyle={tip} cursor={{ fill: "#f6f5f1" }} />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Bar dataKey="income" fill="#0e6b5c" radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="expense" fill="#e7a35a" radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Donut({ data }: { data: { name: string; value: number }[] }) {
  const [active, setActive] = useState<number | null>(null);
  if (!data.length) return <Empty />;
  const total = data.reduce((s, d) => s + d.value, 0);
  const cur = active === null ? null : data[active];
  return (
    <div style={{ position: "relative" }}>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={68} outerRadius={98} paddingAngle={2} stroke="none" onMouseEnter={(_, i) => setActive(i)} onMouseLeave={() => setActive(null)}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} opacity={active === null || active === i ? 1 : 0.35} />)}
          </Pie>
          <Legend wrapperStyle={{ fontSize: 13 }} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 224, display: "grid", placeItems: "center", pointerEvents: "none", textAlign: "center" }}>
        <div>
          <div className="muted" style={{ fontSize: 12 }}>{cur ? cur.name : "Total"}</div>
          <div style={{ fontWeight: 650, fontSize: 18 }}>{usd(cur ? cur.value : total)}</div>
          {cur && <div className="muted" style={{ fontSize: 12 }}>{((cur.value / total) * 100).toFixed(1)}%</div>}
        </div>
      </div>
    </div>
  );
}
