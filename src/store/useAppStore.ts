import { create } from 'zustand';
import { Transaction, Balance, Debt, Task, HealthLog, AppSettings, Language, Currency } from '../types';
import {
  getTransactions, getBalance, getDebts, getSetting, getAllSettings, updateBalance,
  getCategoryBreakdown, getTotalByType
} from '../database/queries';
import { getTasksByDate, getHealthLogByDate } from '../database/healthQueries';
import { format } from 'date-fns';

interface AppStore {
  // Settings
  settings: Partial<AppSettings>;
  language: Language;
  usdRate: number;
  isLoading: boolean;
  isBalanceHidden: boolean;

  // Finance
  transactions: Transaction[];
  balance: Balance;
  debts: Debt[];
  monthlyIncome: number;
  monthlyExpense: number;
  categoryBreakdown: { category: string; total: number; percentage: number }[];

  // Planner
  todayTasks: Task[];
  tomorrowTasks: Task[];

  // Health
  todayHealth: HealthLog | null;

  // Actions
  toggleBalanceHidden: () => void;
  loadSettings: () => Promise<void>;
  loadFinanceData: () => Promise<void>;
  loadTodayTasks: () => Promise<void>;
  loadHealthData: () => Promise<void>;
  setBalance: (uzs: number, usd: number) => Promise<void>;
  refreshAll: () => Promise<void>;
  formatAmount: (amount: number, currency?: Currency) => string;
  toUZS: (amount: number, currency: Currency) => number;
}

export const useAppStore = create<AppStore>((set, get) => ({
  settings: {},
  language: 'uz',
  usdRate: 12700,
  isLoading: false,
  isBalanceHidden: false,
  transactions: [],
  balance: { amount_uzs: 0, amount_usd: 0 },
  debts: [],
  monthlyIncome: 0,
  monthlyExpense: 0,
  categoryBreakdown: [],
  todayTasks: [],
  tomorrowTasks: [],
  todayHealth: null,

  toggleBalanceHidden: () => set(state => ({ isBalanceHidden: !state.isBalanceHidden })),

  loadSettings: async () => {
    const settings = await getAllSettings();
    set({
      settings: settings as Partial<AppSettings>,
      language: (settings.language as Language) ?? 'uz',
      usdRate: parseInt(settings.usd_rate ?? '12700'),
    });
  },

  loadFinanceData: async () => {
    const today = new Date();
    const from = format(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd');
    const to = format(today, 'yyyy-MM-dd');

    const [txs, bal, dbs, income, expense, breakdown] = await Promise.all([
      getTransactions(50),
      getBalance(),
      getDebts(),
      getTotalByType('income', from, to),
      getTotalByType('expense', from, to),
      getCategoryBreakdown(from, to),
    ]);

    const totalExpense = breakdown.reduce((s, b) => s + b.total, 0);
    const breakdownWithPct = breakdown.map(b => ({
      ...b,
      percentage: totalExpense > 0 ? Math.round((b.total / totalExpense) * 100) : 0,
    }));

    set({
      transactions: txs,
      balance: bal,
      debts: dbs,
      monthlyIncome: income,
      monthlyExpense: expense,
      categoryBreakdown: breakdownWithPct,
    });
  },

  loadTodayTasks: async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const tomorrow = format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');
    const [todayTasks, tomorrowTasks] = await Promise.all([
      getTasksByDate(today),
      getTasksByDate(tomorrow),
    ]);
    set({ todayTasks, tomorrowTasks });
  },

  loadHealthData: async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const health = await getHealthLogByDate(today);
    set({ todayHealth: health });
  },

  setBalance: async (uzs: number, usd: number) => {
    await updateBalance(uzs, usd);
    set({ balance: { amount_uzs: uzs, amount_usd: usd } });
  },

  refreshAll: async () => {
    set({ isLoading: true });
    await Promise.all([
      get().loadSettings(),
      get().loadFinanceData(),
      get().loadTodayTasks(),
      get().loadHealthData(),
    ]);
    set({ isLoading: false });
  },

  formatAmount: (amount: number, currency = 'UZS' as Currency) => {
    if (currency === 'USD') {
      return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    }
    return `${Math.round(amount).toLocaleString('uz-UZ')} so'm`;
  },

  toUZS: (amount: number, currency: Currency) => {
    const rate = get().usdRate;
    return currency === 'USD' ? amount * rate : amount;
  },
}));
