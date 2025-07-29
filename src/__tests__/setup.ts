import { initDatabase, closeDatabase } from '../database/init';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test database name
process.env.DB_NAME = 'test-repairs.db';
process.env.NODE_ENV = 'test';

const TEST_DB_PATH = path.join(process.cwd(), 'test-repairs.db');

// Global setup - runs once before all tests
beforeAll(async () => {
  // Remove existing test database
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
  
  // Initialize test database
  await initDatabase();
});

// Global teardown - runs once after all tests
afterAll(async () => {
  // Close database connection
  await closeDatabase();
  
  // Clean up test database file
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
});

// Reset database between each test
beforeEach(async () => {
  const { getDatabase } = require('../database/init');
  const db = getDatabase();
  
  return new Promise<void>((resolve, reject) => {
    db.serialize(() => {
      db.run('DELETE FROM repair_parts', (err: any) => {
        if (err) reject(err);
      });
      db.run('DELETE FROM repair_status_history', (err: any) => {
        if (err) reject(err);
      });
      db.run('DELETE FROM repairs', (err: any) => {
        if (err) reject(err);
      });
      db.run('DELETE FROM parts', (err: any) => {
        if (err) reject(err);
      });
      db.run('DELETE FROM sqlite_sequence WHERE name IN ("repairs", "parts", "repair_parts", "repair_status_history")', (err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}); 