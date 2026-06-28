import chalk from "chalk";
import { getDb, runMigrations } from "../db.js";

export interface SummaryOptions {
  month?: string;
  year?: string;
}

const BAR_WIDTH = 24;

function bar(value: number, max: number): string {
  if (max === 0) return chalk.gray("░".repeat(BAR_WIDTH));
  const filled = Math.round((value / max) * BAR_WIDTH);
  return (
    chalk.red("█".repeat(filled)) + chalk.gray("░".repeat(BAR_WIDTH - filled))
  );
}

/** Format amount with currency symbol prefix where known, fallback to suffix */
function fmt(n: number, currency: string): string {
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
    CAD: "CA$",
    AUD: "A$",
    CHF: "CHF ",
  };
  const upper = currency.toUpperCase();
  const symbol = symbols[upper];
  const num = n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return symbol ? `${symbol}${num}` : `${num} ${upper}`;
}

interface CategoryCurrencyRow {
  category: string;
  currency: string;
  total: number;
}

interface SumCurrencyRow {
  currency: string;
  total: number;
}

interface BudgetRow {
  category: string;
  monthly_limit: number;
  currency: string;
}

export async function showSummary(opts: SummaryOptions): Promise<void> {
  await runMigrations();
  const db = getDb();

  // Determine date range
  let label: string;
  let dateFrom: string;
  let dateTo: string;

  if (opts.year && !opts.month) {
    const y = opts.year;
    label = `Year ${y}`;
    dateFrom = `${y}-01-01`;
    dateTo = `${y}-12-31`;
  } else {
    const month = opts.month ?? new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) {
      console.error(chalk.red("✖  Month must be in YYYY-MM format."));
      process.exit(1);
    }
    label = `Month ${month}`;
    dateFrom = `${month}-01`;
    dateTo = `${month}-31`;
  }

  // Income grouped by currency
  const incomeRows: SumCurrencyRow[] = await db("transactions")
    .where("type", "income")
    .whereBetween("date", [dateFrom, dateTo])
    .groupBy("currency")
    .select("currency")
    .sum({ total: "amount" });

  // Expenses grouped by currency
  const expenseRows: SumCurrencyRow[] = await db("transactions")
    .where("type", "expense")
    .whereBetween("date", [dateFrom, dateTo])
    .groupBy("currency")
    .select("currency")
    .sum({ total: "amount" });

  // Collect all currencies
  const allCurrencies = [
    ...new Set([
      ...incomeRows.map((r) => r.currency),
      ...expenseRows.map((r) => r.currency),
    ]),
  ].sort();

  const incomeMap = new Map(incomeRows.map((r) => [r.currency, Number(r.total)]));
  const expenseMap = new Map(expenseRows.map((r) => [r.currency, Number(r.total)]));

  // Expenses by category + currency
  const categories: CategoryCurrencyRow[] = await db("transactions")
    .where("type", "expense")
    .whereBetween("date", [dateFrom, dateTo])
    .groupBy("category", "currency")
    .orderBy("total", "desc")
    .select("category", "currency")
    .sum({ total: "amount" });

  // Budgets
  const budgets: BudgetRow[] = await db("budgets").select("*");
  const budgetMap = new Map<string, { limit: number; currency: string }>(
    budgets.map((b) => [b.category, { limit: Number(b.monthly_limit), currency: b.currency }])
  );

  const divider = chalk.gray("─".repeat(58));

  console.log();
  console.log(chalk.bold.cyan(`  📊  Summary — ${label}`));
  console.log(divider);

  if (allCurrencies.length === 0) {
    console.log(chalk.gray("  No transactions found for this period.\n"));
    return;
  }

  // Per-currency totals
  for (const cur of allCurrencies) {
    const income = incomeMap.get(cur) ?? 0;
    const expenses = expenseMap.get(cur) ?? 0;
    const balance = income - expenses;

    const label = cur.padEnd(5);
    const inc = chalk.green(fmt(income, cur));
    const exp = chalk.red(fmt(expenses, cur));
    const bal =
      balance >= 0
        ? chalk.bold.green(`+${fmt(balance, cur)}`)
        : chalk.bold.red(`-${fmt(Math.abs(balance), cur)}`);

    console.log(`  ${chalk.bold(label)}  Income: ${inc}   Expenses: ${exp}   Balance: ${bal}`);
  }

  console.log(divider);

  if (categories.length > 0) {
    console.log(chalk.bold("  💸  Expenses by category\n"));

    // Group by currency for bar scaling
    const maxByCurrency = new Map<string, number>();
    for (const cat of categories) {
      const cur = cat.currency;
      const prev = maxByCurrency.get(cur) ?? 0;
      if (Number(cat.total) > prev) maxByCurrency.set(cur, Number(cat.total));
    }

    for (const cat of categories) {
      const total = Number(cat.total);
      const cur = cat.currency;
      const maxVal = maxByCurrency.get(cur) ?? total;

      const budget = budgetMap.get(cat.category);
      const overBudget =
        budget !== undefined &&
        budget.currency.toUpperCase() === cur.toUpperCase() &&
        total > budget.limit;

      const nameStr = cat.category.padEnd(16);
      const amtStr = fmt(total, cur).padStart(14);
      const budgetStr =
        budget !== undefined && budget.currency.toUpperCase() === cur.toUpperCase()
          ? overBudget
            ? chalk.red(` ⚠ over budget! (limit: ${fmt(budget.limit, cur)})`)
            : chalk.gray(` (limit: ${fmt(budget.limit, cur)})`)
          : "";

      console.log(
        `    ${chalk.cyan(nameStr)} ${bar(total, maxVal)}  ${chalk.yellow(amtStr)}${budgetStr}`
      );
    }
    console.log();
  } else {
    console.log(chalk.gray("  No expenses found for this period.\n"));
  }

  console.log(divider + "\n");
}
