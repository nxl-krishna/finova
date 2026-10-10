import { fmt } from "@/lib/finance";

export function Stat({ label, icon, value, signed, note, testId }: { label: string; icon?: string; value: number; signed?: boolean; note?: string; testId?: string }) {
  return (
    <div className="card stat">
      <div className="label">{icon && <span>{icon}</span>}{label}</div>
      <div className={`value ${signed ? (value >= 0 ? "pos" : "neg") : ""}`} data-testid={testId}>{fmt(value)}</div>
      {note && <div className="muted" style={{ fontSize: ".8rem", marginTop: ".2rem" }}>{note}</div>}
    </div>
  );
}
