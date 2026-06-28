import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Load .env from cwd or home directory
const localEnv = path.join(process.cwd(), ".env");
const homeEnv = path.join(
  process.env["HOME"] ?? process.env["USERPROFILE"] ?? "",
  ".finance-tracker.env"
);

if (fs.existsSync(localEnv)) {
  dotenv.config({ path: localEnv });
} else if (fs.existsSync(homeEnv)) {
  dotenv.config({ path: homeEnv });
} else {
  // Defaults to SQLite in current directory
  process.env["DB_CLIENT"] = process.env["DB_CLIENT"] ?? "sqlite";
  process.env["DB_FILENAME"] = process.env["DB_FILENAME"] ?? "./finance.db";
}

export type DbClient = "sqlite" | "postgresql" | "mysql" | "mssql";

export interface Config {
  client: DbClient;
  filename?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  trustedConnection?: boolean;
}

function getClient(): DbClient {
  const raw = (process.env["DB_CLIENT"] ?? "sqlite").toLowerCase();
  if (["sqlite", "postgresql", "mysql", "mssql"].includes(raw)) {
    return raw as DbClient;
  }
  console.warn(`Unknown DB_CLIENT "${raw}", defaulting to sqlite.`);
  return "sqlite";
}

export function getConfig(): Config {
  const client = getClient();
  if (client === "sqlite") {
    return {
      client,
      filename: process.env["DB_FILENAME"] ?? "./finance.db",
    };
  }
  return {
    client,
    host: process.env["DB_HOST"] ?? "127.0.0.1",
    port: parseInt(process.env["DB_PORT"] ?? "5432", 10),
    user: process.env["DB_USER"],
    password: process.env["DB_PASSWORD"],
    database: process.env["DB_NAME"] ?? "finance_tracker",
    trustedConnection: process.env["DB_MSSQL_TRUSTED_CONNECTION"] === "true",
  };
}
