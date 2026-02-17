"use client";

import { useState } from "react";
import { ExpenseFormData } from "@/types";

interface Props {
  onExpenseCreated: () => void;
}

function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const CATEGORIES = [
  "Food", "Transport", "Shopping", "Health",
  "Entertainment", "Utilities", "Rent", "Other",
];

const today = new Date().toISOString().split("T")[0];

export default function ExpenseForm({ onExpenseCreated }: Props) {
  const [form, setForm] = useState<ExpenseFormData>({
    amount: "", category: "", description: "", date: today,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(generateUUID);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          amount: parseFloat(form.amount),
          category: form.category,
          description: form.description,
          date: new Date(form.date).toISOString(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const message = data.details
          ? Object.values(data.details).join(", ")
          : data.error ?? "Something went wrong";
        setError(message);
        return;
      }

      onExpenseCreated();
      setForm({ amount: "", category: "", description: "", date: today });
      setIdempotencyKey(generateUUID());
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="form-card">
      <div className="form-card-title">Add Expense</div>

      {error && <div className="form-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-field">
            <label className="form-label">Amount (₹)</label>
            <input
              type="number"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              placeholder="0.00"
              step="0.01"
              min="0.01"
              required
              className="form-input"
            />
          </div>

          <div className="form-field">
            <label className="form-label">Category</label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              required
              className="form-select"
            >
              <option value="">Select category</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="form-field form-field-full">
            <label className="form-label">Description</label>
            <input
              type="text"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="What was this for?"
              className="form-input"
            />
          </div>

          <div className="form-field">
            <label className="form-label">Date</label>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              required
              className="form-input"
            />
          </div>
        </div>

        <button type="submit" disabled={loading} className="form-submit">
          {loading ? "Saving…" : "Add Expense"}
        </button>
      </form>
    </div>
  );
}
