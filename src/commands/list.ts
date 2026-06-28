import chalk from "chalk";
import { getDb, runMigrations, type Transaction } from "../db.js";

export interface ListOptions {
  month?: string;
  category?: string;
  type?: "income" | "expense";
  limit: string;
}

const COL = {
  id: 5,
  date: 12,
  type: 9,
  amount: 12,
  category: 16,
  note: 28,
};

function pad(str: string, len: number): string {
  return str.length > len ? str.slice(0, len - 1) + "…" : str.padEnd(len);
}

export async function listTransactions(opts: ListOptions): Promise<void> {
  await runMigrations();
  const db = getDb();

  let query = db("transactions").orderBy("date", "desc");

  if (opts.month) {
    // Filter by YYYY-MM
    if (!/^\d{4}-\d{2}$/.test(opts.month)) {
      console.error(chalk.red("✖  Month must be in YYYY-MM format."));
      process.exit(1);
    }
    query = query.whereRaw("strftime('%Y-%m', date) = ?", [opts.month])
      .orWhereRaw("LEFT(CAST(date AS VARCHAR), 7) = ?", [opts.month]);

    // Use a db-agnostic approach
    query = db("transactions")
      .orderBy("date", "desc")
      .whereBetween("date", [
        opts.month + "-01",
        opts.month + "-31",
      ]);
  }

  if (opts.category) {
    query = query.where("category", opts.category.toLowerCase());
  }

  if (opts.type) {
    query = query.where("type", opts.type);
  }

  const limit = parseInt(opts.limit, 10) || 20;
  const rows: Transaction[] = await query.limit(limit);

  if (rows.length === 0) {
    console.log(chalk.gray("\n  No transactions found.\n"));
    return;
  }

  const divider = chalk.gray("─".repeat(88));
  const header =
    chalk.bold(pad("ID", COL.id)) +
    chalk.bold(pad("Date", COL.date)) +
    chalk.bold(pad("Type", COL.type)) +
    chalk.bold(pad("Amount", COL.amount)) +
    chalk.bold(pad("Category", COL.category)) +
    chalk.bold(pad("Note", COL.note));

  console.log("\n" + divider);
  console.log("  " + header);
  console.log(divider);

  for (const row of rows) {
    const sign = row.type === "income" ? chalk.green("+") : chalk.red("-");
    const amtRaw = `${sign}${Number(row.amount).toFixed(2)} ${row.currency}`;
    const typeLabel =
      row.type === "income"
        ? chalk.green(pad(row.type, COL.type))
        : chalk.red(pad(row.type, COL.type));

    console.log(
      "  " +
        chalk.gray(pad(String(row.id ?? ""), COL.id)) +
        pad(row.date, COL.date) +
        typeLabel +
        pad(amtRaw.replace(/\x1b\[[0-9;]*m/g, ""), COL.amount).replace(
          /^([+-])/,
          row.type === "income"
            ? chalk.green("$1")
            : chalk.red("$1")
        ) +
        chalk.cyan(pad(row.category, COL.category)) +
        chalk.gray(pad(row.note ?? "", COL.note))
    );
  }

  console.log(divider + "\n");
}
