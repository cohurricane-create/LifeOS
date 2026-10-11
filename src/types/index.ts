// All TypeScript types for the LifeOS app

export type Currency = 'UZS' | 'USD';
export type TransactionType = 'income' | 'expense';
export type DebtType = 'borrowed' | 'lent'; // borrowed = men oldim, lent = men berdim
export type Priority = 'low' | 'normal' | 'high';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other';
export type Language = 'uz' | 'en';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  amount_uzs: number; // always in UZS for calculations
  category: string;
  note?: string;
  date: string; // YYYY-MM-DD
  created_at: string;
}

export interface Balance {
  amount_uzs: number;
  amount_usd: number;
}

export interface Debt {
  id: string;
  person_name: string;
  amount: number;
  currency: Currency;
  type: DebtType;
  note?: string;
  due_date?: string;
  is_paid: number; // 0 or 1
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  is_done: number; // 0 or 1
  priority: Priority;
  category: string;
  created_at: string;
}

export interface HealthLog {
  id: string;
  date: string;
  sleep_start?: string;
  sleep_end?: string;
  sleep_hours: number;
  workout_minutes: number;
  workout_type?: string;
  calories_consumed: number;
  calories_goal: number;
  water_ml: number;
  notes?: string;
  created_at: string;
}

export interface FoodLog {
  id: string;
  health_log_id?: string;
  date: string;
  food_name: string;
  calories: number;
  meal_type: MealType;
  photo_uri?: string;
  created_at: string;
}

export interface BudgetLimit {
  id: string;
  category: string;
  monthly_limit: number;
  is_active: number;
  currency: Currency;
  created_at: string;
}

export interface CategoryBreakdown {
  category: string;
  total: number;
  percentage?: number;
}

export interface AppSettings {
  language: Language;
  currency: Currency;
  usd_rate: string;
  notifications_enabled: string;
  openai_key: string;
  calories_goal: string;
  onboarding_done: string;
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
