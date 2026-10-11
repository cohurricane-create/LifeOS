import { getDB } from './init';
import { Task, HealthLog, FoodLog } from '../types';

// ─── TASKS ────────────────────────────────────────────────────────────────

export async function addTask(task: Omit<Task, 'created_at'>): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `INSERT INTO tasks (id, title, description, date, time, is_done, priority, category)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [task.id, task.title, task.description ?? null, task.date, task.time ?? null,
     task.is_done ? 1 : 0, task.priority ?? 'normal', task.category ?? 'general']
  );
}

export async function getTasksByDate(date: string): Promise<Task[]> {
  const db = await getDB();
  return await db.getAllAsync<Task>(
    `SELECT * FROM tasks WHERE date = ? ORDER BY is_done ASC, time ASC, datetime(created_at) ASC, rowid ASC`,
    [date]
  );
}

export async function getTasksByDateRange(from: string, to: string): Promise<Task[]> {
  const db = await getDB();
  return await db.getAllAsync<Task>(
    `SELECT * FROM tasks WHERE date >= ? AND date <= ? ORDER BY date ASC, time ASC, rowid ASC`,
    [from, to]
  );
}

export async function getUpcomingTasks(): Promise<Task[]> {
  const db = await getDB();
  return await db.getAllAsync<Task>(
    `SELECT * FROM tasks WHERE date >= date('now', 'localtime') AND is_done = 0 AND time IS NOT NULL ORDER BY date ASC, time ASC`,
  );
}

export async function getTaskById(id: string): Promise<Task | null> {
  const db = await getDB();
  return await db.getFirstAsync<Task>(
    `SELECT * FROM tasks WHERE id = ?`,
    [id]
  );
}

export async function getRecentTasks(limit = 30): Promise<Task[]> {
  const db = await getDB();
  return await db.getAllAsync<Task>(
    `SELECT * FROM tasks ORDER BY date DESC, time ASC LIMIT ?`,
    [limit]
  );
}

export async function toggleTask(id: string, is_done: boolean): Promise<void> {
  const db = await getDB();
  await db.runAsync(`UPDATE tasks SET is_done = ? WHERE id = ?`, [is_done ? 1 : 0, id]);
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<void> {
  const db = await getDB();
  const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = Object.values(updates);
  await db.runAsync(`UPDATE tasks SET ${fields} WHERE id = ?`, [...values, id]);
}

export async function deleteTask(id: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(`DELETE FROM tasks WHERE id = ?`, [id]);
}

// ─── HEALTH LOGS ──────────────────────────────────────────────────────────

export async function upsertHealthLog(log: Partial<HealthLog> & { date: string; id: string }): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `INSERT INTO health_logs (id, date, sleep_start, sleep_end, sleep_hours, workout_minutes, workout_type, calories_consumed, calories_goal, water_ml, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       sleep_start = COALESCE(excluded.sleep_start, sleep_start),
       sleep_end = COALESCE(excluded.sleep_end, sleep_end),
       sleep_hours = COALESCE(excluded.sleep_hours, sleep_hours),
       workout_minutes = COALESCE(excluded.workout_minutes, workout_minutes),
       workout_type = COALESCE(excluded.workout_type, workout_type),
       calories_consumed = COALESCE(excluded.calories_consumed, calories_consumed),
       calories_goal = COALESCE(excluded.calories_goal, calories_goal),
       water_ml = COALESCE(excluded.water_ml, water_ml),
       notes = COALESCE(excluded.notes, notes)`,
    [
      log.id, log.date,
      log.sleep_start ?? null, log.sleep_end ?? null, log.sleep_hours ?? 0,
      log.workout_minutes ?? 0, log.workout_type ?? null,
      log.calories_consumed ?? 0, log.calories_goal ?? 2000,
      log.water_ml ?? 0, log.notes ?? null
    ]
  );
}

export async function getHealthLogByDate(date: string): Promise<HealthLog | null> {
  const db = await getDB();
  return await db.getFirstAsync<HealthLog>(
    `SELECT * FROM health_logs WHERE date = ?`, [date]
  ) ?? null;
}

export async function getHealthLogsByRange(from: string, to: string): Promise<HealthLog[]> {
  const db = await getDB();
  return await db.getAllAsync<HealthLog>(
    `SELECT * FROM health_logs WHERE date >= ? AND date <= ? ORDER BY date DESC`,
    [from, to]
  );
}

// ─── FOOD LOGS ────────────────────────────────────────────────────────────

export async function addFoodLog(food: Omit<FoodLog, 'created_at'>): Promise<void> {
  const db = await getDB();
  await db.execAsync('BEGIN TRANSACTION;');
  try {
    // Ensure health_log exists
    await db.runAsync(
      `INSERT INTO health_logs (id, date, calories_consumed)
       VALUES (?, ?, 0)
       ON CONFLICT(date) DO NOTHING`,
       [food.health_log_id || food.id, food.date]
    );

    await db.runAsync(
      `INSERT INTO food_logs (id, health_log_id, date, food_name, calories, meal_type, photo_uri)
       VALUES (?, (SELECT id FROM health_logs WHERE date = ?), ?, ?, ?, ?, ?)`,
      [food.id, food.date, food.date, food.food_name, food.calories, food.meal_type ?? 'other', food.photo_uri ?? null]
    );

    // Update total calories in health_logs
    await db.runAsync(
      `UPDATE health_logs SET calories_consumed = calories_consumed + ? WHERE date = ?`,
      [food.calories, food.date]
    );
    await db.execAsync('COMMIT;');
  } catch (e) {
    await db.execAsync('ROLLBACK;');
    throw e;
  }
}

export async function getFoodLogsByDate(date: string): Promise<FoodLog[]> {
  const db = await getDB();
  return await db.getAllAsync<FoodLog>(
    `SELECT * FROM food_logs WHERE date = ? ORDER BY created_at ASC`,
    [date]
  );
}

export async function deleteFoodLog(id: string, calories: number, date: string): Promise<void> {
  const db = await getDB();
  await db.runAsync(`DELETE FROM food_logs WHERE id = ?`, [id]);
  await db.runAsync(
    `UPDATE health_logs SET calories_consumed = MAX(0, calories_consumed - ?) WHERE date = ?`,
    [calories, date]
  );
}
