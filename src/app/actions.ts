"use server";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { endSession, requireUser, startSession } from "@/lib/auth";
import { computePosition } from "@/lib/finance";

export type FormState = { error?: string } | undefined;

const money = z.coerce.number().positive().max(1e12);
const parse = <T extends z.ZodType>(schema: T, fd: FormData) => schema.safeParse(Object.fromEntries(fd));
const firstError = (e: z.ZodError) => e.issues[0]?.message ?? "Invalid input";

// ---------- Auth ----------
export async function register(_: FormState, fd: FormData): Promise<FormState> {
  const r = parse(z.object({ name: z.string().trim().min(1), email: z.email().toLowerCase(), password: z.string().min(8, "Password must be at least 8 characters") }), fd);
  if (!r.success) return { error: firstError(r.error) };
  if (await db.user.findUnique({ where: { email: r.data.email } })) return { error: "Email already registered" };
  const user = await db.user.create({
    data: { name: r.data.name, email: r.data.email, passwordHash: await bcrypt.hash(r.data.password, 10) },
  });
  await startSession(user.id);
  redirect("/dashboard");
}

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const r = parse(z.object({ email: z.email().toLowerCase(), password: z.string().min(1) }), fd);
  if (!r.success) return { error: "Invalid email or password" };
  const user = await db.user.findUnique({ where: { email: r.data.email } });
  if (!user || !(await bcrypt.compare(r.data.password, user.passwordHash))) return { error: "Invalid email or password" };
  await startSession(user.id);
  redirect("/dashboard");
}

export async function logout() {
  await endSession();
  redirect("/login");
}

// ---------- Transactions ----------
export async function addTransaction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const r = parse(
    z.object({
      type: z.enum(["INCOME", "EXPENSE"]),
      category: z.string().trim().min(1, "Category required"),
      description: z.string().trim().default(""),
      amount: money,
      date: z.coerce.date(),
      accountId: z.string().optional(),
    }),
    fd,
  );
  if (!r.success) return { error: firstError(r.error) };
  const { accountId, ...data } = r.data;
  const account = accountId ? await db.account.findFirst({ where: { id: accountId, userId: user.id } }) : null;
  await db.$transaction(async (tx) => {
    await tx.transaction.create({ data: { ...data, userId: user.id, accountId: account?.id } });
    if (account) {
      const delta = data.type === "INCOME" ? data.amount : -data.amount;
      await tx.account.update({ where: { id: account.id }, data: { balance: { increment: account.type === "ASSET" ? delta : -delta } } });
    }
  });
  revalidatePath("/", "layout");
}

export async function deleteTransaction(id: string) {
  const user = await requireUser();
  const t = await db.transaction.findFirst({ where: { id, userId: user.id }, include: { account: true } });
  if (!t) return;
  await db.$transaction(async (tx) => {
    await tx.transaction.delete({ where: { id: t.id } });
    if (t.account) {
      const delta = t.type === "INCOME" ? -Number(t.amount) : Number(t.amount);
      await tx.account.update({ where: { id: t.account.id }, data: { balance: { increment: t.account.type === "ASSET" ? delta : -delta } } });
    }
  });
  revalidatePath("/", "layout");
}

// ---------- Budgets ----------
export async function upsertBudget(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const r = parse(z.object({ category: z.string().trim().min(1, "Category required"), limit: money }), fd);
  if (!r.success) return { error: firstError(r.error) };
  await db.budget.upsert({
    where: { userId_category: { userId: user.id, category: r.data.category } },
    create: { ...r.data, userId: user.id },
    update: { limit: r.data.limit },
  });
  revalidatePath("/", "layout");
}

export async function deleteBudget(id: string) {
  const user = await requireUser();
  await db.budget.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/", "layout");
}

// ---------- Accounts / Net worth ----------
export async function addAccount(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const r = parse(z.object({ name: z.string().trim().min(1, "Name required"), type: z.enum(["ASSET", "LIABILITY"]), balance: z.coerce.number().min(0) }), fd);
  if (!r.success) return { error: firstError(r.error) };
  await db.account.create({ data: { ...r.data, userId: user.id } });
  revalidatePath("/", "layout");
}

export async function deleteAccount(id: string) {
  const user = await requireUser();
  await db.account.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/", "layout");
}

export async function takeSnapshot() {
  const user = await requireUser();
  const { getNetWorth } = await import("@/lib/data");
  const nw = await getNetWorth(user.id);
  const date = new Date(new Date().toISOString().slice(0, 10));
  await db.netWorthSnapshot.upsert({
    where: { userId_date: { userId: user.id, date } },
    create: { userId: user.id, date, assets: nw.assets, liabilities: nw.liabilities },
    update: { assets: nw.assets, liabilities: nw.liabilities },
  });
  revalidatePath("/", "layout");
}

// ---------- Investments ----------
export async function addAsset(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const r = parse(z.object({ symbol: z.string().trim().min(1).max(12).toUpperCase(), name: z.string().trim().min(1, "Name required"), currentPrice: money }), fd);
  if (!r.success) return { error: firstError(r.error) };
  if (await db.asset.findUnique({ where: { userId_symbol: { userId: user.id, symbol: r.data.symbol } } })) return { error: "Symbol already exists" };
  const date = new Date(new Date().toISOString().slice(0, 10));
  await db.asset.create({ data: { ...r.data, userId: user.id, prices: { create: { date, price: r.data.currentPrice } } } });
  revalidatePath("/", "layout");
}

export async function updatePrice(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const r = parse(z.object({ assetId: z.string(), price: money }), fd);
  if (!r.success) return { error: firstError(r.error) };
  const asset = await db.asset.findFirst({ where: { id: r.data.assetId, userId: user.id } });
  if (!asset) return { error: "Asset not found" };
  const date = new Date(new Date().toISOString().slice(0, 10));
  await db.$transaction([
    db.asset.update({ where: { id: asset.id }, data: { currentPrice: r.data.price } }),
    db.pricePoint.upsert({ where: { assetId_date: { assetId: asset.id, date } }, create: { assetId: asset.id, date, price: r.data.price }, update: { price: r.data.price } }),
  ]);
  revalidatePath("/", "layout");
}

export async function addTrade(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const r = parse(
    z.object({ assetId: z.string(), side: z.enum(["BUY", "SELL"]), quantity: money, price: money, fee: z.coerce.number().min(0).default(0), date: z.coerce.date() }),
    fd,
  );
  if (!r.success) return { error: firstError(r.error) };
  const asset = await db.asset.findFirst({ where: { id: r.data.assetId, userId: user.id }, include: { trades: true } });
  if (!asset) return { error: "Asset not found" };
  const existing = asset.trades.map((t) => ({ side: t.side, quantity: +t.quantity, price: +t.price, fee: +t.fee, date: t.date }));
  try {
    computePosition([...existing, r.data], +asset.currentPrice);
  } catch (e) {
    return { error: (e as Error).message };
  }
  await db.trade.create({ data: r.data });
  revalidatePath("/", "layout");
}

// ---------- AI review ----------
export async function aiReview(): Promise<{ text?: string; error?: string }> {
  const user = await requireUser();
  const key = process.env.AI_API_KEY;
  if (!key) return { error: "Add AI_API_KEY to your .env to turn on written reviews. The analysis above works without it." };
  const { getInsights } = await import("@/lib/data");
  const a = await getInsights(user.id);
  const payload = {
    healthScore: a.score,
    metrics: a.metrics,
    holdings: a.rows.map((r) => ({ symbol: r.symbol, weight: +r.weight.toFixed(3), returnPct: +r.returnPct.toFixed(3), annualVol: +r.volatility.toFixed(3) })),
    flags: a.suggestions.map((s) => `${s.level}: ${s.title}`),
  };
  try {
    const res = await fetch(`${process.env.AI_BASE_URL ?? "https://api.openai.com/v1"}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.AI_MODEL ?? "gpt-4o-mini",
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              "You are a candid, practical personal-finance reviewer. Using only the JSON provided, write a review in markdown with sections: '## Overall', '## Portfolio', '## Risk', '## Cash & spending', '## Next 3 steps'. Reference actual numbers. Plain language, no hype, no generic filler, under 350 words. End with one line noting this is educational, not financial advice.",
          },
          { role: "user", content: JSON.stringify(payload) },
        ],
      }),
    });
    if (!res.ok) return { error: `AI provider returned ${res.status}. Check your key and model.` };
    const data = await res.json();
    return { text: data.choices?.[0]?.message?.content ?? "No response." };
  } catch {
    return { error: "Couldn't reach the AI provider." };
  }
}

export async function deleteAsset(id: string) {
  const user = await requireUser();
  await db.asset.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/", "layout");
}
