import knex, { Knex } from "knex";
import { getConfig } from "./config.js";

let _db: Knex | null = null;

export function getDb(): Knex {
  if (_db) return _db;

  const cfg = getConfig();

  switch (cfg.client) {
    case "sqlite":
      _db = knex({
        client: "better-sqlite3",
        connection: { filename: cfg.filename ?? "./finance.db" },
        useNullAsDefault: true,
      });
      break;

    case "postgresql":
      _db = knex({
        client: "pg",
        connection: {
          host: cfg.host,
          port: cfg.port,
          user: cfg.user,
          password: cfg.password,
          database: cfg.database,
        },
        pool: { min: 0, max: 10 },
      });
      break;

    case "mysql":
      _db = knex({
        client: "mysql2",
        connection: {
          host: cfg.host,
          port: cfg.port,
          user: cfg.user,
          password: cfg.password,
          database: cfg.database,
        },
        pool: { min: 0, max: 10 },
      });
      break;

    case "mssql":
      _db = knex({
        client: "mssql",
        connection: {
          server: cfg.host ?? "localhost",
          port: cfg.port ?? 1433,
          user: cfg.user,
          password: cfg.password,
          database: cfg.database,
          options: {
            trustedConnection: cfg.trustedConnection ?? false,
            enableArithAbort: true,
            encrypt: false,
          },
        },
        pool: { min: 0, max: 10 },
      });
      break;
  }

  return _db!;
}

export async function closeDb(): Promise<void> {
  if (_db) {
    await _db.destroy();
    _db = null;
  }
}

// ── Migrations (run automatically on first use) ────────────────────────────

export async function runMigrations(): Promise<void> {
  const db = getDb();

  const hasTransactions = await db.schema.hasTable("transactions");
  if (!hasTransactions) {
    await db.schema.createTable("transactions", (t) => {
      t.increments("id").primary();
      t.enum("type", ["income", "expense"]).notNullable();
      t.decimal("amount", 12, 2).notNullable();
      t.string("currency", 3).notNullable().defaultTo("PLN");
      t.string("category", 64).notNullable();
      t.string("note", 255).nullable();
      t.date("date").notNullable();
      t.timestamps(true, true);
    });
  }

  const hasBudgets = await db.schema.hasTable("budgets");
  if (!hasBudgets) {
    await db.schema.createTable("budgets", (t) => {
      t.increments("id").primary();
      t.string("category", 64).notNullable().unique();
      t.decimal("monthly_limit", 12, 2).notNullable();
      t.string("currency", 3).notNullable().defaultTo("PLN");
      t.timestamps(true, true);
    });
  }
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface Transaction {
  id?: number;
  type: "income" | "expense";
  amount: number;
  currency: string;
  category: string;
  note?: string | null;
  date: string;
  created_at?: string;
  updated_at?: string;
}

export interface Budget {
  id?: number;
  category: string;
  monthly_limit: number;
  currency: string;
}
