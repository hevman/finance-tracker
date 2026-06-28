import chalk from "chalk";
import { getDb, runMigrations, type Transaction } from "../db.js";

export interface AddOptions {
  amount: string;
  category: string;
  type: "income" | "expense";
  note?: string;
  date?: string;
  currency: string;
}

export async function addTransaction(opts: AddOptions): Promise<void> {
  await runMigrations();
  const db = getDb();

  const amount = parseFloat(opts.amount);
  if (isNaN(amount) || amount <= 0) {
    console.error(chalk.red("✖  Amount must be a positive number."));
    process.exit(1);
  }

  const date = opts.date ?? new Date().toISOString().split("T")[0]!;

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.error(chalk.red("✖  Date must be in YYYY-MM-DD format."));
    process.exit(1);
  }

  const tx: Omit<Transaction, "id" | "created_at" | "updated_at"> = {
    type: opts.type,
    amount,
    currency: opts.currency.toUpperCase(),
    category: opts.category.toLowerCase(),
    note: opts.note ?? null,
    date,
  };

  const [id] = await db("transactions").insert(tx);

  const sign = opts.type === "income" ? chalk.green("+") : chalk.red("-");
  const amtStr = `${sign}${amount.toFixed(2)} ${tx.currency}`;
  const typeLabel =
    opts.type === "income" ? chalk.green("income") : chalk.red("expense");

  console.log(
    `\n  ✔  Transaction added  ${chalk.gray(`#${id}`)}\n` +
      `     Amount:    ${amtStr}\n` +
      `     Type:      ${typeLabel}\n` +
      `     Category:  ${chalk.cyan(tx.category)}\n` +
      `     Date:      ${chalk.gray(date)}` +
      (tx.note ? `\n     Note:      ${chalk.gray(tx.note)}` : "") +
      "\n"
  );
}
