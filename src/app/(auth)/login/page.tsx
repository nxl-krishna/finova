import Link from "next/link";
import { login } from "@/app/actions";
import { ActionForm } from "@/components/ActionForm";

export default function Login() {
  return (
    <div className="auth">
      <div className="card">
        <div className="brand" style={{ padding: "0 0 1.2rem" }}><i>F</i>Finova</div>
        <h1>Welcome back</h1>
        <p className="sub">Sign in to see where your money stands.</p>
        <ActionForm action={login} submit="Sign in" className="form-col">
          <input name="email" type="email" placeholder="Email" required />
          <input name="password" type="password" placeholder="Password" required />
        </ActionForm>
        <p className="muted">No account? <Link href="/register">Create one</Link></p>
      </div>
    </div>
  );
}
