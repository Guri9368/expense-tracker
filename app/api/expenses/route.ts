import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CreateExpenseBody } from "@/types";

async function ensureTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Expense" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "amount_cents" INTEGER NOT NULL,
      "category" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "date" DATETIME NOT NULL,
      "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "idempotency_key" TEXT NOT NULL UNIQUE
    )
  `);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Expense_category_idx" ON "Expense"("category")`);
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Expense_date_idx" ON "Expense"("date")`);
}

function rupeesToCents(amount: number): number {
  return Math.round(amount * 100);
}

function formatExpense(expense: {
  id: string;
  amount_cents: number;
  category: string;
  description: string;
  date: Date;
  created_at: Date;
}) {
  return {
    id: expense.id,
    amount_cents: expense.amount_cents,
    amount: expense.amount_cents / 100,
    category: expense.category,
    description: expense.description,
    date: expense.date.toISOString(),
    created_at: expense.created_at.toISOString(),
  };
}

export async function POST(req: NextRequest) {
  await ensureTable();

  const idempotencyKey = req.headers.get("Idempotency-Key");

  if (!idempotencyKey) {
    return NextResponse.json(
      { error: "Idempotency-Key header is required" },
      { status: 400 }
    );
  }

  let body: CreateExpenseBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { amount, category, description, date } = body;

  const errors: Record<string, string> = {};

  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    errors.amount = "Amount is required and must be a number";
  } else if (Number(amount) <= 0) {
    errors.amount = "Amount must be greater than 0";
  }

  if (!category || typeof category !== "string" || category.trim() === "") {
    errors.category = "Category is required";
  }

  if (!date || typeof date !== "string" || date.trim() === "") {
    errors.date = "Date is required";
  } else {
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
      errors.date = "Date must be a valid ISO date string";
    }
  }

  if (Object.keys(errors).length > 0) {
    return NextResponse.json(
      { error: "Validation failed", details: errors },
      { status: 422 }
    );
  }

  const existing = await prisma.expense.findUnique({
    where: { idempotency_key: idempotencyKey },
  });

  if (existing) {
    return NextResponse.json(formatExpense(existing), { status: 200 });
  }

  const expense = await prisma.expense.create({
    data: {
      amount_cents: rupeesToCents(Number(amount)),
      category: category.trim(),
      description: (description ?? "").trim(),
      date: new Date(date),
      idempotency_key: idempotencyKey,
    },
  });

  return NextResponse.json(formatExpense(expense), { status: 201 });
}

export async function GET(req: NextRequest) {
  await ensureTable();

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const sort = searchParams.get("sort");

  const where = category && category !== "all"
    ? { category: { equals: category } }
    : {};

  const orderBy =
    sort === "date_desc"
      ? { date: "desc" as const }
      : { created_at: "desc" as const };

  const expenses = await prisma.expense.findMany({
    where,
    orderBy,
  });

  return NextResponse.json(expenses.map(formatExpense));
}