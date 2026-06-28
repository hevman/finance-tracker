import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";
import { getDb, runMigrations, type Transaction } from "../db.js";

export interface ExportOptions {
  output?: string;
  month?: string;
  type?: "income" | "expense";
}

function escapeCSV(value: string | number | null | undefined): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function exportCSV(opts: ExportOptions): Promise<void> {
  await runMigrations();
  const db = getDb();

  let query = db("transactions").orderBy("date", "asc");

  if (opts.month) {
    if (!/^\d{4}-\d{2}$/.test(opts.month)) {
      console.error(chalk.red("✖  Month must be in YYYY-MM format."));
      process.exit(1);
    }
    query = query.whereBetween("date", [
      opts.month + "-01",
      opts.month + "-31",
    ]);
  }

  if (opts.type) {
    query = query.where("type", opts.type);
  }

  const rows: Transaction[] = await query;

  if (rows.length === 0) {
    console.log(chalk.gray("\n  No transactions to export.\n"));
    return;
  }

  const headers = ["id", "date", "type", "amount", "currency", "category", "note"];
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [r.id, r.date, r.type, r.amount, r.currency, r.category, r.note]
        .map(escapeCSV)
        .join(",")
    ),
  ];

  const csv = lines.join("\n");

  const filename =
    opts.output ??
    `finance-export-${new Date().toISOString().slice(0, 10)}.csv`;
  const filepath = path.resolve(filename);

  fs.writeFileSync(filepath, csv, "utf8");

  console.log(
    `\n  ✔  Exported ${chalk.yellow(rows.length)} transactions to:\n` +
      `     ${chalk.cyan(filepath)}\n`
  );
}
