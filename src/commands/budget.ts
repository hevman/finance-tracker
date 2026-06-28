import chalk from "chalk";
import { getDb, runMigrations } from "../db.js";

export interface BudgetSetOptions {
  category: string;
  limit: string;
  currency: string;
}

interface BudgetRow {
  id: number;
  category: string;
  monthly_limit: number;
  currency: string;
}

export async function setBudget(opts: BudgetSetOptions): Promise<void> {
  await runMigrations();
  const db = getDb();

  const limit = parseFloat(opts.limit);
  if (isNaN(limit) || limit <= 0) {
    console.error(chalk.red("✖  Limit must be a positive number."));
    process.exit(1);
  }

  const category = opts.category.toLowerCase();
  const existing = await db("budgets").where({ category }).first<BudgetRow>();

  if (existing) {
    await db("budgets").where({ category }).update({
      monthly_limit: limit,
      currency: opts.currency.toUpperCase(),
    });
    console.log(
      `\n  ✔  Budget updated for ${chalk.cyan(category)}: ` +
        `${chalk.yellow(limit.toFixed(2))} ${opts.currency.toUpperCase()} / month\n`
    );
  } else {
    await db("budgets").insert({
      category,
      monthly_limit: limit,
      currency: opts.currency.toUpperCase(),
    });
    console.log(
      `\n  ✔  Budget set for ${chalk.cyan(category)}: ` +
        `${chalk.yellow(limit.toFixed(2))} ${opts.currency.toUpperCase()} / month\n`
    );
  }
}

export async function listBudgets(): Promise<void> {
  await runMigrations();
  const db = getDb();

  const budgets: BudgetRow[] = await db("budgets").orderBy("category");

  if (budgets.length === 0) {
    console.log(chalk.gray("\n  No budgets configured yet.\n"));
    return;
  }

  const divider = chalk.gray("─".repeat(48));
  console.log("\n" + divider);
  console.log(chalk.bold("  Category         Monthly limit"));
  console.log(divider);

  for (const b of budgets) {
    const name = b.category.padEnd(18);
    const limit = `${Number(b.monthly_limit).toFixed(2)} ${b.currency}`;
    console.log(`  ${chalk.cyan(name)} ${chalk.yellow(limit)}`);
  }

  console.log(divider + "\n");
}
