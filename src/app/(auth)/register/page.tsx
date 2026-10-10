import Link from "next/link";
import { register } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";

export default function Register() {
  return (
    <div className="auth">
      <div className="card">
        <div className="brand" style={{ padding: "0 0 1.2rem" }}><i>F</i>Finova</div>
        <h1>Create your account</h1>
        <p className="sub">Takes about 20 seconds. No card needed.</p>
        <ActionForm action={register} submit="Create account" className="form-col">
          <input name="name" placeholder="Name" required />
          <input name="email" type="email" placeholder="Email" required />
          <input name="password" type="password" placeholder="Password (min 8 chars)" required minLength={8} />
        </ActionForm>
        <p className="muted">Have an account? <Link href="/login">Sign in</Link></p>
      </div>
    </div>
  );
}
