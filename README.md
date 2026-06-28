# finance-tracker

A personal finance tracker CLI with multi-currency support and multiple database backends.

```
  📊  Summary — Month 2026-06
  ──────────────────────────────────────────────────────────
  EUR    Income: €500.00   Expenses: €0.00    Balance: +€500.00
  USD    Income: $5,800.00 Expenses: $2,665.00 Balance: +$3,135.00
  ──────────────────────────────────────────────────────────
  💸  Expenses by category

    rent             ████████████████████████       $1,800.00
    food             ██████░░░░░░░░░░░░░░░░░░         $420.00 ⚠ over budget! (limit: $350.00)
    entertainment    ███░░░░░░░░░░░░░░░░░░░░░         $200.00
    transport        ██░░░░░░░░░░░░░░░░░░░░░░         $180.00
    subscriptions    █░░░░░░░░░░░░░░░░░░░░░░░          $65.00
  ──────────────────────────────────────────────────────────
```

## Features

- **Multi-currency** — USD, EUR, GBP, JPY and any other ISO code. Each currency tracked separately with its own symbol
- **Multiple databases** — SQLite (zero config), PostgreSQL, MySQL, MSSQL — switch with one line in `.env`
- **Transactions** — add income and expenses with category, note, date and currency
- **Monthly & yearly summaries** — visual bar chart of spending per category
- **Budget alerts** — set monthly limits per category, get warned when you exceed them
- **CSV export** — export any time range to CSV for Excel or Google Sheets
- **JSON output** — pipe-friendly for scripting and CI

## Supported databases

| Database    | Driver         | `DB_CLIENT` value |
|-------------|----------------|-------------------|
| SQLite      | better-sqlite3 | `sqlite`          |
| PostgreSQL  | pg             | `postgresql`      |
| MySQL       | mysql2         | `mysql`           |
| MSSQL       | tedious        | `mssql`           |

## Installation

```bash
npm install -g finance-tracker-cli
```

## Configuration

Copy `.env.example` to `.env` in your working directory and set your database:

```env
# SQLite — zero config, file-based (default)
DB_CLIENT=sqlite
DB_FILENAME=./finance.db

# PostgreSQL
DB_CLIENT=postgresql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=finance_user
DB_PASSWORD=secret
DB_NAME=finance_tracker

# MySQL
DB_CLIENT=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=finance_user
DB_PASSWORD=secret
DB_NAME=finance_tracker

# MSSQL
DB_CLIENT=mssql
DB_HOST=127.0.0.1
DB_PORT=1433
DB_USER=finance_user
DB_PASSWORD=secret
DB_NAME=finance_tracker
```

The database schema (tables) is created automatically on first run — no manual migration needed.

## Usage

### Add a transaction

```bash
# Expense (default)
finance add --amount 1800 --category rent --note "Monthly rent"

# Income
finance add --amount 5800 --category salary --type income --note "August paycheck"

# Different currency
finance add --amount 500 --category freelance --type income --currency EUR --note "EU client"

# Specific date
finance add --amount 65 --category subscriptions --date 2026-06-01
```

### View summary

```bash
# Current month
finance summary

# Specific month
finance summary --month 2026-06

# Entire year
finance summary --year 2026
```

### List transactions

```bash
# Last 20 transactions
finance list

# Filter by month
finance list --month 2026-06

# Filter by category
finance list --category food

# Filter by type
finance list --type expense --limit 50
```

### Budgets

```bash
# Set a monthly limit
finance budget set --category food --limit 350
finance budget set --category entertainment --limit 200 --currency USD

# View all budgets
finance budget list
```

### Export to CSV

```bash
# Export all transactions
finance export

# Export specific month
finance export --month 2026-06 --output june-2026.csv

# Export only expenses
finance export --type expense
```

### Database info

```bash
finance db-info
```

## Currencies

Default currency is **USD**. Pass `--currency` to use any ISO 4217 code:

```bash
finance add --amount 1200 --category rent --currency GBP
finance add --amount 800  --category rent --currency EUR
finance add --amount 150000 --category rent --currency JPY
```

Supported symbols: `$` USD, `€` EUR, `£` GBP, `¥` JPY, `CA$` CAD, `A$` AUD, `CHF` — all others display as `amount CODE`.

## Requirements

- Node.js >= 18
- git (optional, for version tracking)
- Database driver installed for your chosen backend (optional dependencies)

## License

MIT
