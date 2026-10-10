import { addAccount, deleteAccount, takeSnapshot } from "@/app/actions";
import { requireUser } from "@/lib/auth";
import { getNetWorth, getSnapshots } from "@/lib/data";
import { fmt } from "@/lib/finance";
import { ActionForm } from "@/components/ActionForm";
import { MultiLine } from "@/components/Charts";
import { Stat } from "@/components/Stat";
import { DeleteButton } from "@/components/DeleteButton";

export default async function NetWorth() {
  const user = await requireUser();
  const [nw, snapshots] = await Promise.all([getNetWorth(user.id), getSnapshots(user.id)]);

  return (
    <>
      <h1>Net worth</h1>
      <p className="sub">What you own minus what you owe. Investments are included at today&apos;s prices.</p>
      <div className="grid">
        <Stat label="Net worth" value={nw.netWorth} testId="nw-total" />
        <Stat label="Total assets" value={nw.assets} />
        <Stat label="Investments" value={nw.investments} />
        <Stat label="Liabilities" value={nw.liabilities} />
      </div>
      <div className="card">
        <div className="head">
          <h2>Net worth history</h2>
          <form action={takeSnapshot}><button className="ghost">📌 Record snapshot</button></form>
        </div>
        <MultiLine data={snapshots} x="date" lines={["netWorth", "assets", "liabilities"]} />
      </div>
      <div className="card">
        <h2>Accounts</h2>
        <ActionForm action={addAccount} submit="Add account">
          <input name="name" placeholder="Account name" required />
          <select name="type" aria-label="Account type"><option value="ASSET">Asset</option><option value="LIABILITY">Liability</option></select>
          <input name="balance" type="number" step="0.01" min="0" placeholder="Balance" required />
        </ActionForm>
        <table style={{ marginTop: "1rem" }}>
          <thead><tr><th>Name</th><th>Type</th><th className="num">Balance</th><th /></tr></thead>
          <tbody>
            {nw.accounts.map((a) => (
              <tr key={a.id}>
                <td>{a.name}</td><td className="muted">{a.type === "ASSET" ? "Asset" : "Liability"}</td>
                <td className={`num ${a.type === "LIABILITY" ? "neg" : ""}`}>{fmt(a.balance)}</td>
                <td className="num"><DeleteButton action={deleteAccount.bind(null, a.id)} what={a.name} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
