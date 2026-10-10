import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", db: "up", latencyMs: Date.now() - started, version: process.env.APP_VERSION ?? "dev" });
  } catch {
    return Response.json({ status: "degraded", db: "down" }, { status: 503 });
  }
}
