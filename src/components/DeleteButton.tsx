"use client";

export function DeleteButton({ action, what }: { action: () => Promise<void>; what: string }) {
  return (
    <form action={action} onSubmit={(e) => { if (!confirm(`Delete ${what}?`)) e.preventDefault(); }}>
      <button className="link" aria-label="Delete" title="Delete">✕</button>
    </form>
  );
}
