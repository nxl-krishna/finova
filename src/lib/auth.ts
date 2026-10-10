import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { SESSION_COOKIE, signSession, verifySession } from "./session";

export async function startSession(userId: string) {
  (await cookies()).set(SESSION_COOKIE, await signSession(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Every server query/mutation must go through this to get the authorized user id. */
export async function requireUser() {
  const userId = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  const user = userId ? await db.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true } }) : null;
  if (!user) redirect("/login");
  return user;
}
