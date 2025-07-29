import { initDatabase, closeDatabase, getDatabase } from '../database/init';
import { createTestAdminUser, dbRun } from './testUtils';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config();

// Set test database name and JWT secret
process.env.DB_NAME = 'test-repairs.db';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_EXPIRES_IN = '1h';
process.env.BCRYPT_ROUNDS = '4'; // Lower rounds for faster tests

const TEST_DB_PATH = path.join(process.cwd(), 'test-repairs.db');

// Global setup - runs once before all tests
beforeAll(async () => {
  // Remove existing test database
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
  
  // Initialize test database
  await initDatabase();
  
  // Create test admin user
  await createTestAdminUser();
});

// Global teardown - runs once after all tests
afterAll(async () => {
  await closeDatabase();
  
  // Clean up test database
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
});

// Clear all data before each test (except the admin user)
beforeEach(async () => {
  const db = getDatabase();
  
  try {
    // Clear all tables in correct order (respecting foreign keys)
    await dbRun(db, 'DELETE FROM repair_parts');
    await dbRun(db, 'DELETE FROM repair_status_history');
    await dbRun(db, 'DELETE FROM repairs');
    await dbRun(db, 'DELETE FROM parts');
    
    // Reset auto-increment sequences for consistent IDs in tests
    await dbRun(db, 'DELETE FROM sqlite_sequence WHERE name IN (?, ?, ?, ?)', 
                ['repairs', 'parts', 'repair_parts', 'repair_status_history']);
                
    // Only delete non-admin users that are not referenced by any remaining data
    // Since we cleared all repairs/history, we can now safely clear non-admin users
    await dbRun(db, 'DELETE FROM users WHERE role != ?', ['admin']);
    
    // Don't reset users sequence to preserve admin user ID
  } catch (error) {
    console.error('Error clearing test data:', error);
    throw error;
  }
}); 