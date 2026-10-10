import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "./lib/session";

const PUBLIC = ["/login", "/register"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const authed = !!(await verifySession(req.cookies.get(SESSION_COOKIE)?.value));
  const isPublic = PUBLIC.includes(pathname);
  if (!authed && !isPublic) return NextResponse.redirect(new URL("/login", req.url));
  if (authed && (isPublic || pathname === "/")) return NextResponse.redirect(new URL("/dashboard", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next|favicon.ico|api).*)"] };
