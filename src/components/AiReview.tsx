"use client";
import { useState, useTransition } from "react";
import { aiReview } from "@/app/actions";

function inline(s: string) {
  return s.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") ? <b key={i}>{p.slice(2, -2)}</b> : p));
}

function Markdown({ text }: { text: string }) {
  const out: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) out.push(<ul key={out.length}>{list.map((l, i) => <li key={i}>{inline(l)}</li>)}</ul>);
    list = [];
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (/^[-*] |^\d+\. /.test(line)) { list.push(line.replace(/^[-*] |^\d+\. /, "")); continue; }
    flush();
    if (line.startsWith("#")) out.push(<h3 key={out.length}>{line.replace(/^#+\s*/, "")}</h3>);
    else if (line) out.push(<p key={out.length}>{inline(line)}</p>);
  }
  flush();
  return <div className="review">{out}</div>;
}

export function AiReview() {
  const [res, setRes] = useState<{ text?: string; error?: string }>();
  const [pending, start] = useTransition();
  return (
    <div className="card">
      <div className="head">
        <div>
          <h2 style={{ marginBottom: ".2rem" }}>📝 Written review</h2>
          <span className="muted" style={{ fontSize: ".85rem" }}>A language model reads your numbers and writes a plain-English breakdown.</span>
        </div>
        <button onClick={() => start(async () => setRes(await aiReview()))} disabled={pending}>
          {pending ? "Analysing your portfolio…" : res?.text ? "Regenerate" : "Generate review"}
        </button>
      </div>
      {res?.error && <p className="muted" style={{ margin: 0 }}>{res.error}</p>}
      {res?.text && <Markdown text={res.text} />}
    </div>
  );
}
