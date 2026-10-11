import * as SQLite from 'expo-sqlite';

const DB_NAME = 'lifeos.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME);
  }
  return dbPromise;
}

export async function initDatabase(): Promise<void> {
  const database = await getDB();

  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    -- Transactions (harajat & daromad)
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'UZS',
      amount_uzs REAL NOT NULL,
      category TEXT NOT NULL,
      note TEXT,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Balance (joriy balans)
    CREATE TABLE IF NOT EXISTS balance (
      id INTEGER PRIMARY KEY DEFAULT 1,
      amount_uzs REAL NOT NULL DEFAULT 0,
      amount_usd REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Debts (qarzlar)
    CREATE TABLE IF NOT EXISTS debts (
      id TEXT PRIMARY KEY,
      person_name TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'UZS',
      type TEXT NOT NULL CHECK(type IN ('borrowed', 'lent')),
      note TEXT,
      due_date TEXT,
      is_paid INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Tasks (kunlik vazifalar)
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      date TEXT NOT NULL,
      time TEXT,
      is_done INTEGER NOT NULL DEFAULT 0,
      priority TEXT DEFAULT 'normal',
      category TEXT DEFAULT 'general',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Health (sog'liq ma'lumotlari)
    CREATE TABLE IF NOT EXISTS health_logs (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL UNIQUE,
      sleep_start TEXT,
      sleep_end TEXT,
      sleep_hours REAL DEFAULT 0,
      workout_minutes INTEGER DEFAULT 0,
      workout_type TEXT,
      calories_consumed INTEGER DEFAULT 0,
      calories_goal INTEGER DEFAULT 2000,
      water_ml INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Food logs (ovqat & kaloriya)
    CREATE TABLE IF NOT EXISTS food_logs (
      id TEXT PRIMARY KEY,
      health_log_id TEXT,
      date TEXT NOT NULL,
      food_name TEXT NOT NULL,
      calories INTEGER NOT NULL DEFAULT 0,
      meal_type TEXT DEFAULT 'other',
      photo_uri TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (health_log_id) REFERENCES health_logs(id)
    );

    -- Budget limits
    CREATE TABLE IF NOT EXISTS budget_limits (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL UNIQUE,
      monthly_limit REAL NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      currency TEXT NOT NULL DEFAULT 'UZS',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Settings
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Insert default balance if not exists
    INSERT OR IGNORE INTO balance (id, amount_uzs, amount_usd) VALUES (1, 0, 0);

    -- Default settings
    INSERT OR IGNORE INTO settings (key, value) VALUES ('language', 'uz');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('currency', 'UZS');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('usd_rate', '12700');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('notifications_enabled', 'true');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('openai_key', '');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('calories_goal', '2000');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('onboarding_done', 'false');
  `);
}
