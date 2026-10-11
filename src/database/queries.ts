import { getDB } from './init';
import { Transaction, Debt } from '../types';

// ─── TRANSACTIONS ──────────────────────────────────────────────────────────

export async function addTransaction(tx: Omit<Transaction, 'created_at'>): Promise<void> {
  const db = await getDB();
  await db.execAsync('BEGIN TRANSACTION;');
  try {
    await db.runAsync(
      `INSERT INTO transactions (id, type, amount, currency, amount_uzs, category, note, date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [tx.id, tx.type, tx.amount, tx.currency, tx.amount_uzs, tx.category, tx.note ?? null, tx.date]
    );

    const operator = tx.type === 'income' ? '+' : '-';
    if (tx.currency === 'USD') {
      await db.runAsync(`UPDATE balance SET amount_usd = amount_usd ${operator} ? WHERE id = 1`, [tx.amount]);
    } else {
      await db.runAsync(`UPDATE balance SET amount_uzs = amount_uzs ${operator} ? WHERE id = 1`, [tx.amount]);
    }
    await db.execAsync('COMMIT;');
  } catch (e) {
    await db.execAsync('ROLLBACK;');
    throw e;
  }
}

export async function getTransactions(limit = 50, offset = 0): Promise<Transaction[]> {
  const db = await getDB();
  return await db.getAllAsync<Transaction>(
    `SELECT * FROM transactions ORDER BY date DESC, datetime(created_at) DESC, rowid DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  );
}

export async function getTransactionsByDateRange(from: string, to: string): Promise<Transaction[]> {
  const db = await getDB();
  return await db.getAllAsync<Transaction>(
    `SELECT * FROM transactions WHERE date >= ? AND date <= ? ORDER BY date DESC, datetime(created_at) DESC, rowid DESC`,
    [from, to]
  );
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = await getDB();
  await db.execAsync('BEGIN TRANSACTION;');
  try {
    const tx = await db.getFirstAsync<Transaction>(`SELECT * FROM transactions WHERE id = ?`, [id]);
    if (tx) {
      const operator = tx.type === 'income' ? '-' : '+';
      if (tx.currency === 'USD') {
        await db.runAsync(`UPDATE balance SET amount_usd = amount_usd ${operator} ? WHERE id = 1`, [tx.amount]);
      } else {
        await db.runAsync(`UPDATE balance SET amount_uzs = amount_uzs ${operator} ? WHERE id = 1`, [tx.amount]);
      }
      await db.runAsync(`DELETE FROM transactions WHERE id = ?`, [id]);
    }
    await db.execAsync('COMMIT;');
  } catch (e) {
    await db.execAsync('ROLLBACK;');
    throw e;
  }
}

export async function getTotalByType(type: 'income' | 'expense', from?: string, to?: string): Promise<number> {
  const db = await getDB();
  let query = `SELECT COALESCE(SUM(amount_uzs), 0) as total FROM transactions WHERE type = ?`;
  const params: any[] = [type];
  if (from && to) {
    query += ` AND date >= ? AND date <= ?`;
    params.push(from, to);
  }
  const result = await db.getFirstAsync<{ total: number }>(query, params);
  return result?.total ?? 0;
}

export async function getCategoryBreakdown(from: string, to: string): Promise<{ category: string; total: number }[]> {
  const db = await getDB();
  return await db.getAllAsync<{ category: string; total: number }>(
    `SELECT category, SUM(amount_uzs) as total
     FROM transactions
     WHERE type = 'expense' AND date >= ? AND date <= ?
     GROUP BY category
     ORDER BY total DESC`,
    [from, to]
  );
}

// ─── BALANCE ──────────────────────────────────────────────────────────────

export async function getBalance(): Promise<{ amount_uzs: number; amount_usd: number }> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ amount_uzs: number; amount_usd: number }>(
    `SELECT amount_uzs, amount_usd FROM balance WHERE id = 1`
  );
  return row ?? { amount_uzs: 0, amount_usd: 0 };
}

export async function updateBalance(amount_uzs: number, amount_usd: number): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `UPDATE balance SET amount_uzs = ?, amount_usd = ?, updated_at = datetime('now') WHERE id = 1`,
    [amount_uzs, amount_usd]
  );
}

// ─── DEBTS ────────────────────────────────────────────────────────────────

export async function addDebt(debt: Omit<Debt, 'created_at'>): Promise<void> {
  const db = await getDB();
  await db.execAsync('BEGIN TRANSACTION;');
  try {
    await db.runAsync(
      `INSERT INTO debts (id, person_name, amount, currency, type, note, due_date, is_paid)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [debt.id, debt.person_name, debt.amount, debt.currency, debt.type, debt.note ?? null, debt.due_date ?? null, 0]
    );

    const operator = debt.type === 'borrowed' ? '+' : '-';
    if (debt.currency === 'USD') {
      await db.runAsync(`UPDATE balance SET amount_usd = amount_usd ${operator} ? WHERE id = 1`, [debt.amount]);
    } else {
      await db.runAsync(`UPDATE balance SET amount_uzs = amount_uzs ${operator} ? WHERE id = 1`, [debt.amount]);
    }
    await db.execAsync('COMMIT;');
  } catch (e) {
    await db.execAsync('ROLLBACK;');
    throw e;
  }
}

export async function getDebts(): Promise<Debt[]> {
  const db = await getDB();
  return await db.getAllAsync<Debt>(
    `SELECT * FROM debts ORDER BY is_paid ASC, created_at DESC`
  );
}

export async function markDebtPaid(id: string): Promise<void> {
  const db = await getDB();
  await db.execAsync('BEGIN TRANSACTION;');
  try {
    const debt = await db.getFirstAsync<Debt>(`SELECT * FROM debts WHERE id = ? AND is_paid = 0`, [id]);
    if (debt) {
      await db.runAsync(`UPDATE debts SET is_paid = 1 WHERE id = ?`, [id]);
      const operator = debt.type === 'borrowed' ? '-' : '+';
      if (debt.currency === 'USD') {
        await db.runAsync(`UPDATE balance SET amount_usd = amount_usd ${operator} ? WHERE id = 1`, [debt.amount]);
      } else {
        await db.runAsync(`UPDATE balance SET amount_uzs = amount_uzs ${operator} ? WHERE id = 1`, [debt.amount]);
      }
    }
    await db.execAsync('COMMIT;');
  } catch (e) {
    await db.execAsync('ROLLBACK;');
    throw e;
  }
}

export async function deleteDebt(id: string): Promise<void> {
  const db = await getDB();
  await db.execAsync('BEGIN TRANSACTION;');
  try {
    const debt = await db.getFirstAsync<Debt>(`SELECT * FROM debts WHERE id = ?`, [id]);
    if (debt && debt.is_paid === 0) {
      const operator = debt.type === 'borrowed' ? '-' : '+';
      if (debt.currency === 'USD') {
        await db.runAsync(`UPDATE balance SET amount_usd = amount_usd ${operator} ? WHERE id = 1`, [debt.amount]);
      } else {
        await db.runAsync(`UPDATE balance SET amount_uzs = amount_uzs ${operator} ? WHERE id = 1`, [debt.amount]);
      }
    }
    await db.runAsync(`DELETE FROM debts WHERE id = ?`, [id]);
    await db.execAsync('COMMIT;');
  } catch (e) {
    await db.execAsync('ROLLBACK;');
    throw e;
  }
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDB();
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM settings WHERE key = ?`, [key]
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))`,
    [key, value]
  );
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const db = await getDB();
  const rows = await db.getAllAsync<{ key: string; value: string }>(`SELECT key, value FROM settings`);
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}
