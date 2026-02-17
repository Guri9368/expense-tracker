"use client";

import { Expense } from "@/types";

interface Props {
  expenses: Expense[];
}

const CATEGORY_ICONS: Record<string, string> = {
  Food: "🍜",
  Transport: "🚌",
  Shopping: "🛍️",
  Health: "💊",
  Entertainment: "🎬",
  Utilities: "💡",
  Rent: "🏠",
  Other: "📦",
};

const CATEGORY_COLORS: Record<string, string> = {
  Food: "#f97316",
  Transport: "#3b82f6",
  Shopping: "#a855f7",
  Health: "#22c55e",
  Entertainment: "#ec4899",
  Utilities: "#eab308",
  Rent: "#ef4444",
  Other: "#6b7280",
};

export default function CategorySummary({ expenses }: Props) {
  if (expenses.length === 0) {
    return (
      <div className="summary-empty">
        <p>No expenses yet.</p>
        <p>Add one to see your breakdown.</p>
      </div>
    );
  }

  const totals = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount_cents;
    return acc;
  }, {});

  const grandTotal = Object.values(totals).reduce((a, b) => a + b, 0);

  const sorted = Object.entries(totals).sort(([, a], [, b]) => b - a);

  return (
    <div className="summary-section">
      <div className="summary-heading">By Category</div>
      <div className="summary-list">
        {sorted.map(([cat, cents]) => {
          const pct = grandTotal > 0 ? (cents / grandTotal) * 100 : 0;
          const color = CATEGORY_COLORS[cat] ?? "#6b7280";
          const icon = CATEGORY_ICONS[cat] ?? "📦";
          return (
            <div key={cat} className="summary-row">
              <div className="summary-row-top">
                <span className="summary-cat">
                  <span className="summary-icon">{icon}</span>
                  {cat}
                </span>
                <span className="summary-amt">
                  ₹{(cents / 100).toLocaleString("en-IN", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </span>
              </div>
              <div className="summary-bar-track">
                <div
                  className="summary-bar-fill"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
              <div className="summary-pct">{pct.toFixed(0)}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
