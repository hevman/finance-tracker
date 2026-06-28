#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import { closeDb } from "./db.js";
import { addTransaction } from "./commands/add.js";
import { listTransactions } from "./commands/list.js";
import { showSummary } from "./commands/summary.js";
import { setBudget, listBudgets } from "./commands/budget.js";
import { exportCSV } from "./commands/export.js";

const program = new Command();

program
  .name("finance")
  .description(
    "Personal finance tracker CLI — supports SQLite, PostgreSQL, MySQL and MSSQL.\n" +
    "Configure the database via .env file (see .env.example)."
  )
  .version("1.0.0");

// ── finance add ────────────────────────────────────────────────────────────
program
  .command("add")
  .description("Add a new transaction")
  .requiredOption("-a, --amount <number>", "Amount (e.g. 1200.50)")
  .requiredOption("-c, --category <name>", "Category (e.g. rent, food, salary)")
  .option("-t, --type <type>", "Transaction type: income or expense", "expense")
  .option("-n, --note <text>", "Optional note")
  .option("-d, --date <YYYY-MM-DD>", "Date (defaults to today)")
  .option("--currency <code>", "Currency code (e.g. USD, EUR, GBP)", "USD")
  .action(async (opts) => {
    if (!["income", "expense"].includes(opts.type)) {
      console.error(chalk.red('✖  --type must be "income" or "expense".'));
      process.exit(1);
    }
    await addTransaction(opts);
    await closeDb();
  });

// ── finance list ───────────────────────────────────────────────────────────
program
  .command("list")
  .description("List recent transactions")
  .option("-m, --month <YYYY-MM>", "Filter by month")
  .option("-c, --category <name>", "Filter by category")
  .option("-t, --type <type>", "Filter by type: income or expense")
  .option("-l, --limit <number>", "Max number of rows to show", "20")
  .action(async (opts) => {
    await listTransactions(opts);
    await closeDb();
  });

// ── finance summary ────────────────────────────────────────────────────────
program
  .command("summary")
  .description("Show income/expense summary with category breakdown")
  .option("-m, --month <YYYY-MM>", "Month to summarize (default: current month)")
  .option("-y, --year <YYYY>", "Summarize entire year instead of a month")
  .action(async (opts) => {
    await showSummary(opts);
    await closeDb();
  });

// ── finance budget ─────────────────────────────────────────────────────────
const budgetCmd = program
  .command("budget")
  .description("Manage monthly category budgets");

budgetCmd
  .command("set")
  .description("Set a monthly spending limit for a category")
  .requiredOption("-c, --category <name>", "Category name")
  .requiredOption("-l, --limit <number>", "Monthly limit amount")
  .option("--currency <code>", "Currency code (e.g. USD, EUR, GBP)", "USD")
  .action(async (opts) => {
    await setBudget(opts);
    await closeDb();
  });

budgetCmd
  .command("list")
  .description("Show all configured budgets")
  .action(async () => {
    await listBudgets();
    await closeDb();
  });

// ── finance export ─────────────────────────────────────────────────────────
program
  .command("export")
  .description("Export transactions to a CSV file")
  .option("-o, --output <filename>", "Output file path")
  .option("-m, --month <YYYY-MM>", "Export only a specific month")
  .option("-t, --type <type>", "Export only income or expense")
  .action(async (opts) => {
    await exportCSV(opts);
    await closeDb();
  });

// ── finance db-info ────────────────────────────────────────────────────────
program
  .command("db-info")
  .description("Show current database configuration")
  .action(async () => {
    const { getConfig } = await import("./config.js");
    const cfg = getConfig();
    console.log("\n  🗄️   Database configuration\n");
    console.log(`  Client:    ${chalk.cyan(cfg.client)}`);
    if (cfg.client === "sqlite") {
      console.log(`  File:      ${chalk.gray(cfg.filename ?? "./finance.db")}`);
    } else {
      console.log(`  Host:      ${chalk.gray(cfg.host)}:${chalk.gray(String(cfg.port))}`);
      console.log(`  Database:  ${chalk.gray(cfg.database)}`);
      console.log(`  User:      ${chalk.gray(cfg.user)}`);
    }
    console.log();
    await closeDb();
  });

program.parseAsync(process.argv).catch((err: Error) => {
  console.error(chalk.red(`\n✖  Error: ${err.message}\n`));
  process.exit(1);
});
