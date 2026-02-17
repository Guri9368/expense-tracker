export interface Expense {
  id: string;
  amount_cents: number;
  category: string;
  description: string;
  date: string;
  created_at: string;
}

export interface ExpenseFormData {
  amount: string;
  category: string;
  description: string;
  date: string;
}

export interface ApiError {
  error: string;
  details?: Record<string, string>;
}

export interface CreateExpenseBody {
  amount: number;
  category: string;
  description: string;
  date: string;
}
