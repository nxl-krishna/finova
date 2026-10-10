"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import type { FormState } from "@/app/actions";

export function ActionForm({
  action,
  children,
  submit = "Save",
  className = "form-row",
}: {
  action: (s: FormState, fd: FormData) => Promise<FormState>;
  children: React.ReactNode;
  submit?: string;
  className?: string;
}) {
  const [state, run, pending] = useActionState(action, undefined);
  const [saved, setSaved] = useState(0);
  const ref = useRef<HTMLFormElement>(null);
  const submitted = useRef(false);
  useEffect(() => {
    if (pending) submitted.current = true;
    else if (submitted.current && !state?.error) {
      ref.current?.reset();
      setSaved((n) => n + 1);
    }
  }, [pending, state]);
  return (
    <form ref={ref} action={run} className={className}>
      {children}
      <button disabled={pending}>{pending ? "Saving…" : submit}</button>
      {saved > 0 && !state?.error && <span key={saved} className="saved">✓ Saved</span>}
      {state?.error && <p className="error">{state.error}</p>}
    </form>
  );
}
