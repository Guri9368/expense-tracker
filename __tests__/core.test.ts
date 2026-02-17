/**
 * Unit tests for core business logic.
 * These test the pure functions in isolation — no HTTP, no DB.
 */

// ── Money conversion ─────────────────────────────────────────────────────────

function rupeesToCents(amount: number): number {
  return Math.round(amount * 100);
}

describe("rupeesToCents", () => {
  it("converts whole rupees correctly", () => {
    expect(rupeesToCents(100)).toBe(10000);
    expect(rupeesToCents(1)).toBe(100);
    expect(rupeesToCents(0)).toBe(0);
  });

  it("converts decimal rupees without floating point error", () => {
    // 0.1 + 0.2 = 0.30000000000000004 in JS — must be handled
    expect(rupeesToCents(0.1 + 0.2)).toBe(30);
    expect(rupeesToCents(99.99)).toBe(9999);
    expect(rupeesToCents(1.01)).toBe(101); // rounds correctly
  });

  it("handles large amounts", () => {
    expect(rupeesToCents(150000)).toBe(15000000);
  });
});

// ── Input validation ──────────────────────────────────────────────────────────

interface ValidateResult {
  errors: Record<string, string>;
}

function validateExpenseInput(body: unknown): ValidateResult {
  const errors: Record<string, string> = {};

  if (!body || typeof body !== "object") {
    return { errors: { body: "Invalid request body" } };
  }

  const { amount, category, date } = body as Record<string, unknown>;

  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    errors.amount = "Amount is required and must be a number";
  } else if (Number(amount) <= 0) {
    errors.amount = "Amount must be greater than 0";
  }

  if (!category || typeof category !== "string" || (category as string).trim() === "") {
    errors.category = "Category is required";
  }

  if (!date || typeof date !== "string" || (date as string).trim() === "") {
    errors.date = "Date is required";
  } else if (isNaN(new Date(date as string).getTime())) {
    errors.date = "Date must be a valid ISO date string";
  }

  return { errors };
}

describe("validateExpenseInput", () => {
  const valid = {
    amount: 250,
    category: "Food",
    description: "Lunch",
    date: "2024-02-15T00:00:00.000Z",
  };

  it("accepts valid input with no errors", () => {
    const { errors } = validateExpenseInput(valid);
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it("rejects negative amount", () => {
    const { errors } = validateExpenseInput({ ...valid, amount: -10 });
    expect(errors.amount).toBeDefined();
  });

  it("rejects zero amount", () => {
    const { errors } = validateExpenseInput({ ...valid, amount: 0 });
    expect(errors.amount).toBeDefined();
  });

  it("rejects missing category", () => {
    const { errors } = validateExpenseInput({ ...valid, category: "" });
    expect(errors.category).toBeDefined();
  });

  it("rejects whitespace-only category", () => {
    const { errors } = validateExpenseInput({ ...valid, category: "   " });
    expect(errors.category).toBeDefined();
  });

  it("rejects missing date", () => {
    const { errors } = validateExpenseInput({ ...valid, date: "" });
    expect(errors.date).toBeDefined();
  });

  it("rejects invalid date string", () => {
    const { errors } = validateExpenseInput({ ...valid, date: "not-a-date" });
    expect(errors.date).toBeDefined();
  });

  it("rejects non-object body", () => {
    const { errors } = validateExpenseInput("bad");
    expect(errors.body).toBeDefined();
  });

  it("allows description to be empty (optional field)", () => {
    const { errors } = validateExpenseInput({ ...valid, description: "" });
    expect(errors.description).toBeUndefined();
  });
});

// ── Idempotency key logic ─────────────────────────────────────────────────────

describe("idempotency key format", () => {
  // Mirrors the generateUUID function used on the frontend
  function generateUUID(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  it("generates a valid UUID v4 format", () => {
    const uuid = generateUUID();
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  it("generates unique keys on each call", () => {
    const keys = new Set(Array.from({ length: 100 }, generateUUID));
    expect(keys.size).toBe(100);
  });
});

// ── Category total aggregation ────────────────────────────────────────────────

interface Expense {
  amount_cents: number;
  category: string;
}

function aggregateByCategory(expenses: Expense[]): Record<string, number> {
  return expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount_cents;
    return acc;
  }, {});
}

describe("aggregateByCategory", () => {
  it("sums amounts correctly per category", () => {
    const expenses: Expense[] = [
      { category: "Food", amount_cents: 500 },
      { category: "Food", amount_cents: 300 },
      { category: "Transport", amount_cents: 200 },
    ];
    const result = aggregateByCategory(expenses);
    expect(result["Food"]).toBe(800);
    expect(result["Transport"]).toBe(200);
  });

  it("returns empty object for no expenses", () => {
    expect(aggregateByCategory([])).toEqual({});
  });

  it("handles a single expense", () => {
    const result = aggregateByCategory([{ category: "Rent", amount_cents: 1500000 }]);
    expect(result["Rent"]).toBe(1500000);
  });
});
