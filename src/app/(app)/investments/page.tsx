import { addAsset, addTrade, deleteAsset, updatePrice } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { getPortfolio } from "@/lib/data";
import { fmt } from "@/lib/finance";
import { ActionForm } from "@/components/ActionForm";
import { AreaTrend, Donut } from "@/components/Charts";
import { Stat } from "@/components/Stat";
import { DeleteButton } from "@/components/DeleteButton";

export default async function Investments() {
  const user = await requireUser();
  const { holdings, totals, history } = await getPortfolio(user.id);
  const today = new Date().toISOString().slice(0, 10);
  const trades = holdings.flatMap((h) => h.trades.map((t) => ({ ...t, symbol: h.symbol }))).sort((a, b) => +b.date - +a.date);

  return (
    <>
      <h1>Investments</h1>
      <p className="sub">Positions, trades and how they&apos;re performing.</p>
      <div className="grid">
        <Stat icon="💼" label="Market value" value={totals.marketValue} testId="market-value" />
        <Stat icon="🧮" label="Cost basis" value={totals.costBasis} />
        <Stat label="Unrealized P&L" value={totals.unrealized} signed testId="unrealized" />
        <Stat label="Realized P&L" value={totals.realized} signed testId="realized" />
      </div>
      <div className="grid2">
        <div className="card"><AreaTrend title="Portfolio value" data={history} x="date" y="value" /></div>
        <div className="card"><h2>Allocation</h2><Donut data={holdings.filter((h) => h.position.marketValue > 0).map((h) => ({ name: h.symbol, value: h.position.marketValue }))} /></div>
      </div>
      <div className="card">
        <h2>Holdings</h2>
        <table>
          <thead><tr><th>Symbol</th><th className="num">Qty</th><th className="num">Avg cost</th><th className="num">Price</th><th className="num">Value</th><th className="num">Unrealized</th><th className="num">Realized</th><th /></tr></thead>
          <tbody>
            {holdings.map(({ id, symbol, name, currentPrice, position: p }) => (
              <tr key={id}>
                <td><b>{symbol}</b> <span className="muted">{name}</span></td>
                <td className="num">{p.quantity}</td>
                <td className="num">{fmt(p.avgCost)}</td>
                <td className="num">{fmt(currentPrice)}</td>
                <td className="num">{fmt(p.marketValue)}</td>
                <td className={`num ${p.unrealized >= 0 ? "pos" : "neg"}`}>{fmt(p.unrealized)} ({p.unrealizedPct}%)</td>
                <td className={`num ${p.realized >= 0 ? "pos" : "neg"}`}>{fmt(p.realized)}</td>
                <td className="num"><DeleteButton action={deleteAsset.bind(null, id)} what={`${symbol} and its trades`} /></td>
              </tr>
            ))}
            {!holdings.length && <tr><td colSpan={8} className="muted">No assets yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="grid2">
        <div className="card">
          <h2>Add asset</h2>
          <ActionForm action={addAsset} submit="Add asset">
            <input name="symbol" placeholder="Symbol" required />
            <input name="name" placeholder="Name" required />
            <input name="currentPrice" type="number" step="0.0001" min="0.0001" placeholder="Current price" required />
          </ActionForm>
        </div>
        <div className="card">
          <h2>Update price</h2>
          <ActionForm action={updatePrice} submit="Update">
            <select name="assetId" aria-label="Asset">{holdings.map((h) => <option key={h.id} value={h.id}>{h.symbol}</option>)}</select>
            <input name="price" type="number" step="0.0001" min="0.0001" placeholder="New price" required />
          </ActionForm>
        </div>
      </div>
      <div className="card">
        <h2>Record trade</h2>
        <ActionForm action={addTrade} submit="Record">
          <select name="assetId" aria-label="Trade asset">{holdings.map((h) => <option key={h.id} value={h.id}>{h.symbol}</option>)}</select>
          <select name="side" aria-label="Side"><option value="BUY">Buy</option><option value="SELL">Sell</option></select>
          <input name="quantity" type="number" step="0.000001" min="0.000001" placeholder="Quantity" required />
          <input name="price" type="number" step="0.0001" min="0.0001" placeholder="Price" required />
          <input name="fee" type="number" step="0.01" min="0" placeholder="Fee" />
          <input name="date" type="date" defaultValue={today} required aria-label="Trade date" />
        </ActionForm>
      </div>
      <div className="card">
        <h2>Trade history</h2>
        <table>
          <thead><tr><th>Date</th><th>Symbol</th><th>Side</th><th className="num">Qty</th><th className="num">Price</th><th className="num">Fee</th><th className="num">Total</th></tr></thead>
          <tbody>
            {trades.map((t) => (
              <tr key={t.id}>
                <td>{t.date.toISOString().slice(0, 10)}</td><td>{t.symbol}</td>
                <td className={t.side === "BUY" ? "pos" : "neg"}>{t.side}</td>
                <td className="num">{t.quantity}</td><td className="num">{fmt(t.price)}</td><td className="num">{fmt(t.fee)}</td>
                <td className="num">{fmt(t.quantity * t.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
