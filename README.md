# Expense Tracker

A minimal, production-quality personal expense tracker built with Next.js 14, TypeScript, Tailwind CSS, Prisma, and SQLite.

## Live Demo

> Add your Vercel deployment URL here after deploying.

## Features

- Add expenses with amount, category, description, and date
- View all expenses in a sortable, filterable table
- Filter by category; sort by date or creation time
- Total amount updates dynamically based on visible expenses
- Idempotency-safe: duplicate submissions (retries, double-clicks) never create duplicate records
- Loading and error states throughout

---

## Design Decisions

### Why SQLite?

SQLite is a file-based relational database that requires zero infrastructure. For a personal finance tool with modest write volume, it's entirely appropriate and avoids the complexity (and cost) of a managed database service. The Prisma ORM provides a clean abstraction that makes migrating to PostgreSQL straightforward if needed later.

**Trade-off on Vercel:** Vercel's serverless functions run on a read-only filesystem except for `/tmp`. This means SQLite data stored in `/tmp` is **ephemeral** — it will reset on cold starts. This is acceptable for a take-home exercise. For a real production deployment, replacing SQLite with a hosted database (e.g., PlanetScale, Supabase, Neon) requires changing only the `DATABASE_URL` and the `provider` in `schema.prisma`.

### Why Integer Cents (`amount_cents`)?

Floating-point arithmetic is not safe for money. `0.1 + 0.2 === 0.30000000000000004` in JavaScript. Storing amounts as integers in the smallest unit (paise/cents) eliminates this class of bug entirely.

- User inputs `₹99.99` → stored as `9999` (integer)
- All arithmetic on the backend and for totals operates on integers
- Display layer divides by `100` only at render time

### How Idempotency Works

Every `POST /api/expenses` request must include an `Idempotency-Key` header (a UUID generated client-side per form submission).

1. The server checks if that key already exists in the database (`idempotency_key` has a `UNIQUE` constraint).
2. If it does, the existing expense is returned with `200 OK` — no duplicate is created.
3. If it doesn't, a new expense is created and returned with `201 Created`.

This means a user can safely click Submit multiple times, lose network mid-request and retry, or refresh the page — only one expense record is ever created per intentional form submission. A new UUID is generated client-side only after a successful response, so the next submission starts fresh.

---

## Trade-offs Due to Timebox

- **No authentication:** This is a single-user tool. Adding auth would require a session layer and was out of scope.
- **No pagination:** The expense list fetches all records. For a personal tool this is fine; at scale, cursor-based pagination would be added.
- **No edit/delete:** Out of scope per the assignment. The Prisma model supports it trivially.
- **SQLite on Vercel is ephemeral:** Acceptable for demo purposes. See the SQLite note above.
- **Category list is hardcoded on the frontend:** Categories are a fixed enum for simplicity. A `categories` table with user-defined values would be the next step.
- **No automated tests:** Time constraint. Key units to test would be: the cents conversion, the idempotency check, and the GET filter/sort logic.

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Local Development

```bash
# 1. Clone and install
git clone <your-repo-url>
cd expense-tracker
npm install

# 2. Set up environment
cp .env.example .env
# .env already has: DATABASE_URL="file:./dev.db"

# 3. Create the database
npm run db:push

# 4. Start the dev server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

---

## Deploying to Vercel

### Important: SQLite on Vercel

Vercel's filesystem is read-only except for `/tmp`. Update your `DATABASE_URL` in Vercel's environment variables to:

```
DATABASE_URL="file:/tmp/prod.db"
```

**Note:** `/tmp` is ephemeral on serverless — data will not persist across cold starts. For persistent storage, replace SQLite with a free-tier hosted database:

- [Neon](https://neon.tech) (Postgres, free tier) — change `provider` to `postgresql`
- [PlanetScale](https://planetscale.com) — change `provider` to `mysql`
- [Turso](https://turso.tech) — LibSQL (SQLite-compatible), works well with Prisma

### Steps

```bash
# 1. Push to GitHub

# 2. Import repo at vercel.com/new

# 3. Add environment variable in Vercel dashboard:
#    DATABASE_URL = file:/tmp/prod.db

# 4. Add a build command override in Vercel:
#    prisma generate && prisma db push && next build

# Or set in vercel.json (see below)
```

### `vercel.json` (optional but recommended)

```json
{
  "buildCommand": "prisma generate && prisma db push && next build"
}
```

---

## Project Structure

```
expense-tracker/
├── app/
│   ├── api/
│   │   └── expenses/
│   │       └── route.ts        # POST and GET handlers
│   ├── components/
│   │   ├── ExpenseForm.tsx     # Add expense form with idempotency
│   │   ├── ExpenseList.tsx     # Table of expenses with totals
│   │   └── FilterBar.tsx       # Category filter + sort controls
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                # Main page, orchestrates state
├── lib/
│   └── prisma.ts               # Prisma singleton
├── prisma/
│   └── schema.prisma           # Data model
├── types/
│   └── index.ts                # Shared TypeScript types
├── .env.example
├── next.config.js
├── package.json
├── tailwind.config.js
└── tsconfig.json
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

**Response:** Array of expense objects with `amount_cents` and computed `amount` (in rupees).
