"use client";

import { Expense } from "@/types";

interface Props {
  expenses: Expense[];
  loading: boolean;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatAmount(cents: number): string {
  return (cents / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const CATEGORY_META: Record<string, { icon: string; cls: string }> = {
  Food:          { icon: "🍜", cls: "cat-food" },
  Transport:     { icon: "🚌", cls: "cat-transport" },
  Shopping:      { icon: "🛍️", cls: "cat-shopping" },
  Health:        { icon: "💊", cls: "cat-health" },
  Entertainment: { icon: "🎬", cls: "cat-entertainment" },
  Utilities:     { icon: "💡", cls: "cat-utilities" },
  Rent:          { icon: "🏠", cls: "cat-rent" },
  Other:         { icon: "📦", cls: "cat-other" },
};

function CategoryBadge({ category }: { category: string }) {
  const meta = CATEGORY_META[category] ?? { icon: "📦", cls: "cat-other" };
  return (
    <span className={`cat-badge ${meta.cls}`}>
      {meta.icon} {category}
    </span>
  );
}

export default function ExpenseList({ expenses, loading }: Props) {
  const total = expenses.reduce((sum, e) => sum + e.amount_cents, 0);

  if (loading) {
    return (
      <div className="expense-table-card">
        <div className="table-state">
          <div className="table-state-icon">⏳</div>
          Loading expenses…
        </div>
      </div>
    );
  }

  return (
    <div className="expense-table-card">
      <div className="expense-table-header">
        <div className="expense-table-title">
          Expenses
          <span className="expense-table-count">
            ({expenses.length} {expenses.length === 1 ? "entry" : "entries"})
          </span>
        </div>
        <div className="expense-total">
          Total: ₹{formatAmount(total)}
        </div>
      </div>

      {expenses.length === 0 ? (
        <div className="table-state">
          <div className="table-state-icon">💸</div>
          No expenses found. Add one above.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="expense-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th className="right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td className="td-date">{formatDate(expense.date)}</td>
                  <td><CategoryBadge category={expense.category} /></td>
                  <td className="td-desc">
                    {expense.description
                      ? expense.description
                      : <span className="td-desc-empty">—</span>
                    }
                  </td>
                  <td className="td-amount">₹{formatAmount(expense.amount_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
