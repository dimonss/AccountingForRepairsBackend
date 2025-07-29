import sqlite3 from 'sqlite3';
import { promisify } from 'util';

const DB_NAME = process.env.DB_NAME || 'repairs.db';

let db: sqlite3.Database;

export function getDatabase(): sqlite3.Database {
  return db;
}

export async function initDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_NAME, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      console.log('Connected to SQLite database');
      createTables().then(resolve).catch(reject);
    });
  });
}

async function createTables(): Promise<void> {
  const run = promisify(db.run.bind(db));

  try {
    // Create repairs table
    await run(`
      CREATE TABLE IF NOT EXISTS repairs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_type TEXT NOT NULL,
        brand TEXT NOT NULL,
        model TEXT NOT NULL,
        serial_number TEXT,
        client_name TEXT NOT NULL,
        client_phone TEXT NOT NULL,
        client_email TEXT,
        issue_description TEXT NOT NULL,
        repair_status TEXT NOT NULL DEFAULT 'pending',
        estimated_cost DECIMAL(10,2),
        actual_cost DECIMAL(10,2),
        parts_cost DECIMAL(10,2) DEFAULT 0,
        labor_cost DECIMAL(10,2) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        notes TEXT
      )
    `);

    // Create repair_status_history table
    await run(`
      CREATE TABLE IF NOT EXISTS repair_status_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repair_id INTEGER NOT NULL,
        old_status TEXT,
        new_status TEXT NOT NULL,
        changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        FOREIGN KEY (repair_id) REFERENCES repairs (id) ON DELETE CASCADE
      )
    `);

    // Create parts table
    await run(`
      CREATE TABLE IF NOT EXISTS parts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        cost DECIMAL(10,2) NOT NULL,
        quantity_in_stock INTEGER DEFAULT 0,
        supplier TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create repair_parts junction table
    await run(`
      CREATE TABLE IF NOT EXISTS repair_parts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repair_id INTEGER NOT NULL,
        part_id INTEGER NOT NULL,
        quantity_used INTEGER NOT NULL DEFAULT 1,
        cost_per_unit DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (repair_id) REFERENCES repairs (id) ON DELETE CASCADE,
        FOREIGN KEY (part_id) REFERENCES parts (id)
      )
    `);

    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  }
}

export async function closeDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Database connection closed');
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
} 