import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import dotenv from "dotenv";

dotenv.config();
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
      
      // Enable foreign key constraints
      db.run('PRAGMA foreign_keys = ON', (err) => {
        if (err) {
          console.error('Error enabling foreign keys:', err);
          reject(err);
          return;
        }
        createTables().then(resolve).catch(reject);
      });
    });
  });
}

async function createTables(): Promise<void> {
  const run = promisify(db.run.bind(db));

  try {
    // Create users table
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'employee',
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
      )
    `);

    // Create refresh_tokens table for JWT token management
    await run(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token_hash TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        user_agent TEXT,
        ip_address TEXT,
        is_revoked BOOLEAN DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // Create indexes for refresh_tokens table
    await run(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)`);
    await run(`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at)`);

    // Create repairs table
    await run(`
      CREATE TABLE IF NOT EXISTS repairs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_type TEXT NOT NULL,
        brand TEXT NOT NULL,
        model TEXT NOT NULL,
        serial_number TEXT,
        repair_number TEXT,
        client_name TEXT NOT NULL,
        client_phone TEXT NOT NULL,
        client_email TEXT,
        issue_description TEXT NOT NULL,
        repair_status TEXT NOT NULL DEFAULT 'pending',
        estimated_cost DECIMAL(10,2),
        actual_cost DECIMAL(10,2),
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        notes TEXT,
        FOREIGN KEY (created_by) REFERENCES users (id)
      )
    `);

    // Create repair_status_history table
    await run(`
      CREATE TABLE IF NOT EXISTS repair_status_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repair_id INTEGER NOT NULL,
        old_status TEXT,
        new_status TEXT NOT NULL,
        changed_by INTEGER,
        changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        FOREIGN KEY (repair_id) REFERENCES repairs (id) ON DELETE CASCADE,
        FOREIGN KEY (changed_by) REFERENCES users (id)
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

    // Create repair_photos table
    await run(`
      CREATE TABLE IF NOT EXISTS repair_photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repair_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        file_path TEXT NOT NULL,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        uploaded_by INTEGER,
        FOREIGN KEY (repair_id) REFERENCES repairs (id) ON DELETE CASCADE,
        FOREIGN KEY (uploaded_by) REFERENCES users (id)
      )
    `);

    // Create index for repair_photos
    await run(`CREATE INDEX IF NOT EXISTS idx_repair_photos_repair_id ON repair_photos(repair_id)`);

    if (process.env.NODE_ENV !== 'test') {
      console.log('Database tables created successfully');
    }
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
          if (process.env.NODE_ENV !== 'test') {
            console.log('Database connection closed');
          }
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
} 