# Expense Tracker

A minimal, production-quality personal expense tracker built with Next.js 14, TypeScript, Tailwind CSS, Prisma, and SQLite.

## Live Demo

🔗 **Live App:** https://expense-tracker-seven-tau-80.vercel.app

📦 **GitHub Repo:** https://github.com/Guri9368/expense-tracker

## Features

- Add expenses with amount, category, description, and date
- View all expenses in a sortable, filterable table
- Filter by category; sort by date or creation time
- Total amount updates dynamically based on visible expenses
- Category summary with breakdown and progress bars in sidebar
- Idempotency-safe: duplicate submissions (retries, double-clicks) never create duplicate records
- Loading and error states throughout
- 17 unit tests covering money conversion, validation, idempotency, and aggregation

---

## Design Decisions

### Why SQLite?

SQLite is a file-based relational database that requires zero infrastructure. For a personal finance tool with modest write volume, it's entirely appropriate and avoids the complexity (and cost) of a managed database service. The Prisma ORM provides a clean abstraction that makes migrating to PostgreSQL straightforward if needed later.

**Trade-off on Vercel:** Vercel's serverless functions run on a read-only filesystem except for `/tmp`. SQLite data stored in `/tmp` is ephemeral — it resets on cold starts. The app handles this gracefully by using `CREATE TABLE IF NOT EXISTS` at runtime, so the table is always recreated automatically on first request after a cold start. For a real production deployment, replacing SQLite with a hosted database (e.g., Neon, Supabase) requires changing only the `DATABASE_URL` and `provider` in `schema.prisma`.

### Why Integer Cents (`amount_cents`)?

Floating-point arithmetic is not safe for money. `0.1 + 0.2 === 0.30000000000000004` in JavaScript. Storing amounts as integers in the smallest unit (paise) eliminates this class of bug entirely.

- User inputs `₹99.99` → stored as `9999` (integer)
- All arithmetic on the backend and for totals operates on integers
- Display layer divides by `100` only at render time

### How Idempotency Works

Every `POST /api/expenses` request must include an `Idempotency-Key` header (a UUID generated client-side per form submission).

1. The server checks if that key already exists in the database (`idempotency_key` has a `UNIQUE` constraint).
2. If it does, the existing expense is returned with `200 OK` — no duplicate is created.
3. If it doesn't, a new expense is created and returned with `201 Created`.

This means a user can safely click Submit multiple times, lose network mid-request and retry, or refresh the page — only one expense record is ever created per intentional form submission. A new UUID is generated client-side only after a confirmed success.

---

## Trade-offs Due to Timebox

- **No authentication:** Single-user tool. Adding auth would require a session layer and was out of scope.
- **No pagination:** The expense list fetches all records. For a personal tool this is fine; at scale, cursor-based pagination would be added.
- **No edit/delete:** Out of scope per the assignment. The Prisma model supports it trivially.
- **SQLite on Vercel is ephemeral:** Acceptable for demo purposes. See the SQLite note above.
- **Category list is hardcoded on the frontend:** Categories are a fixed enum for simplicity. A `categories` table with user-defined values would be the next step.

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Local Development

```bash
# 1. Clone and install
git clone https://github.com/Guri9368/expense-tracker.git
cd expense-tracker
npm install

# 2. Set up environment
cp .env.example .env
# .env already has: DATABASE_URL="file:./dev.db"

# 3. Create the database
npx prisma generate
npx prisma db push

# 4. Start the dev server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

### Run Tests

```bash
npm test
```

---

## Deploying to Vercel

1. Push to GitHub
2. Import repo at vercel.com/new
3. Add environment variable: `DATABASE_URL = file:/tmp/prod.db`
4. Override build command: `prisma generate && prisma db push && next build`
5. Deploy

---

## Project Structure

```
expense-tracker/
├── app/
│   ├── api/
│   │   └── expenses/
│   │       └── route.ts           # POST and GET handlers with idempotency
│   ├── components/
│   │   ├── ExpenseForm.tsx        # Add expense form
│   │   ├── ExpenseList.tsx        # Table of expenses with totals
│   │   ├── FilterBar.tsx          # Category filter + sort controls
│   │   └── CategorySummary.tsx    # Per-category breakdown with progress bars
│   ├── globals.css                # Full design system (dark theme)
│   ├── layout.tsx
│   └── page.tsx                   # Main page, orchestrates state
├── lib/
│   └── prisma.ts                  # Prisma singleton
├── prisma/
│   └── schema.prisma              # Data model
├── types/
│   └── index.ts                   # Shared TypeScript types
├── __tests__/
│   └── core.test.ts               # 17 unit tests
├── .env.example
├── package.json
└── vercel.json
```

---

## API Reference

### `POST /api/expenses`

**Headers:**
- `Content-Type: application/json`
- `Idempotency-Key: <uuid>` (required)

**Body:**
```json
{
  "amount": 250.50,
  "category": "Food",
  "description": "Lunch at Café",
  "date": "2024-02-15T00:00:00.000Z"
}
```

**Responses:**
- `201 Created` — new expense created
- `200 OK` — duplicate key, returning existing expense
- `400 Bad Request` — missing Idempotency-Key
- `422 Unprocessable Entity` — validation errors

### `GET /api/expenses`

**Query params:**
- `category=Food` — filter by category
- `sort=date_desc` — sort by expense date, newest first

**Response:** Array of expense objects with `amount_cents` and computed `amount` in rupees.
