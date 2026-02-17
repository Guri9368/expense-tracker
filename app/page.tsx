"use client";

import { useState, useEffect, useCallback } from "react";
import ExpenseForm from "./components/ExpenseForm";
import ExpenseList from "./components/ExpenseList";
import FilterBar from "./components/FilterBar";
import CategorySummary from "./components/CategorySummary";
import { Expense } from "@/types";

export default function HomePage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("created_desc");

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams();
      if (category && category !== "all") params.set("category", category);
      if (sort === "date_desc") params.set("sort", "date_desc");
      const res = await fetch(`/api/expenses?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch expenses");
      const data: Expense[] = await res.json();
      setExpenses(data);
    } catch {
      setFetchError("Could not load expenses. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, [category, sort]);

  const fetchAllExpenses = useCallback(async () => {
    try {
      const res = await fetch("/api/expenses");
      if (!res.ok) return;
      const data: Expense[] = await res.json();
      setAllExpenses(data);
    } catch {}
  }, []);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);
  useEffect(() => { fetchAllExpenses(); }, [fetchAllExpenses, expenses]);

  const allCategories = Array.from(new Set(allExpenses.map((e) => e.category))).sort();
  const grandTotal = allExpenses.reduce((sum, e) => sum + e.amount_cents, 0);

  function handleFilterChange(newCategory: string, newSort: string) {
    setCategory(newCategory);
    setSort(newSort);
  }

  function handleExpenseCreated() {
    fetchExpenses();
    fetchAllExpenses();
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">₹</div>
          <div>
            <div className="logo-title">Paisa</div>
            <div className="logo-sub">expense tracker</div>
          </div>
        </div>

        <div className="sidebar-stat">
          <div className="stat-label">Total Spent</div>
          <div className="stat-value">
            ₹{(grandTotal / 100).toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="stat-count">{allExpenses.length} {allExpenses.length === 1 ? "expense" : "expenses"}</div>
        </div>

        <CategorySummary expenses={allExpenses} />
      </aside>

      <main className="main-content">
        <header className="page-header">
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">Record and review where your money goes</p>
        </header>

        <ExpenseForm onExpenseCreated={handleExpenseCreated} />

        <div className="list-section">
          <FilterBar
            category={category}
            sort={sort}
            categories={allCategories}
            onChange={handleFilterChange}
          />

          {fetchError && (
            <div className="error-banner">
              <span>{fetchError}</span>
              <button onClick={fetchExpenses} className="retry-btn">Retry</button>
            </div>
          )}

          <ExpenseList expenses={expenses} loading={loading} />
        </div>
      </main>
    </div>
  );
}
