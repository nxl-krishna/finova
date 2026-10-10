import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const daysAgo = (n: number) => new Date(new Date(Date.now() - n * 864e5).toISOString().slice(0, 10));

async function main() {
  await db.user.deleteMany({ where: { email: "demo@finova.dev" } });
  const user = await db.user.create({
    data: { name: "Demo", email: "demo@finova.dev", passwordHash: await bcrypt.hash("password123", 10) },
  });
  const checking = await db.account.create({ data: { userId: user.id, name: "Checking", type: "ASSET", balance: 8200 } });
  await db.account.createMany({
    data: [
      { userId: user.id, name: "Savings", type: "ASSET", balance: 15000 },
      { userId: user.id, name: "Credit Card", type: "LIABILITY", balance: 1250 },
      { userId: user.id, name: "Car Loan", type: "LIABILITY", balance: 9800 },
    ],
  });

  const cats = ["Groceries", "Rent", "Dining", "Transport", "Utilities", "Entertainment"];
  const txs = [];
  for (let m = 0; m < 6; m++) {
    txs.push({ userId: user.id, accountId: checking.id, type: "INCOME" as const, category: "Salary", description: "Monthly salary", amount: 5200, date: daysAgo(m * 30 + 1) });
    txs.push({ userId: user.id, accountId: checking.id, type: "EXPENSE" as const, category: "Rent", description: "Apartment", amount: 1600, date: daysAgo(m * 30 + 2) });
    for (let i = 0; i < 8; i++) {
      const category = cats[(i + m) % cats.length];
      if (category === "Rent") continue;
      txs.push({ userId: user.id, type: "EXPENSE" as const, category, description: `${category} purchase`, amount: Math.round((20 + ((i * 37 + m * 13) % 180)) * 100) / 100, date: daysAgo(m * 30 + 3 + i * 3) });
    }
  }
  await db.transaction.createMany({ data: txs });
  await db.budget.createMany({
    data: [["Groceries", 400], ["Dining", 250], ["Transport", 150], ["Entertainment", 120], ["Utilities", 200]].map(([category, limit]) => ({ userId: user.id, category: category as string, limit: limit as number })),
  });

  const assets: [string, string, number, number][] = [["AAPL", "Apple", 170, 0.012], ["MSFT", "Microsoft", 380, 0.009], ["BTC", "Bitcoin", 52000, 0.03]];
  for (const [symbol, name, start, vol] of assets) {
    const prices = Array.from({ length: 180 }, (_, i) => {
      const drift = 1 + (i / 180) * 0.25;
      const wave = 1 + Math.sin(i / 9) * vol * 4;
      return { date: daysAgo(179 - i), price: Math.round(start * drift * wave * 100) / 100 };
    });
    const asset = await db.asset.create({ data: { userId: user.id, symbol, name, currentPrice: prices.at(-1)!.price, prices: { createMany: { data: prices } } } });
    const q = symbol === "BTC" ? 0.15 : 20;
    await db.trade.createMany({
      data: [
        { assetId: asset.id, side: "BUY", quantity: q, price: prices[0].price, fee: 5, date: prices[0].date },
        { assetId: asset.id, side: "BUY", quantity: q / 2, price: prices[60].price, fee: 5, date: prices[60].date },
        { assetId: asset.id, side: "SELL", quantity: q / 2, price: prices[140].price, fee: 5, date: prices[140].date },
      ],
    });
  }

  await db.netWorthSnapshot.createMany({
    data: Array.from({ length: 6 }, (_, i) => ({ userId: user.id, date: daysAgo((5 - i) * 30), assets: 30000 + i * 1800, liabilities: 13000 - i * 400 })),
  });
  console.log("Seeded demo@finova.dev / password123");
}

main().finally(() => db.$disconnect());
