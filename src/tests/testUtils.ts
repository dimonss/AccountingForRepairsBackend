import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../database/init';

// Helper function to promisify database operations for tests
export function dbRun(db: sqlite3.Database, query: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(this: any, err: any) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export function dbGet(db: sqlite3.Database, query: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err: any, row: any) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function dbAll(db: sqlite3.Database, query: string, params: any[] = []): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err: any, rows: any[]) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Test admin user credentials
export const TEST_ADMIN = {
  username: 'DiCh',
  email: 'faimos69@gmail.com', // Fix typo to match real admin user
  password: 'Repa1722',
  full_name: 'Chalysh Dmitrii',
  role: 'admin'
};

// Create test admin user
export async function createTestAdminUser() {
  const db = getDatabase();
  
  // Check if admin already exists
  const existingAdmin = await dbGet(db, 'SELECT id FROM users WHERE username = ?', [TEST_ADMIN.username]);
  if (existingAdmin) {
    return existingAdmin;
  }

  // Hash password
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '4');
  const passwordHash = await bcrypt.hash(TEST_ADMIN.password, saltRounds);

  // Create admin user
  const result = await dbRun(db, `
    INSERT INTO users (username, email, password_hash, full_name, role)
    VALUES (?, ?, ?, ?, ?)
  `, [TEST_ADMIN.username, TEST_ADMIN.email, passwordHash, TEST_ADMIN.full_name, TEST_ADMIN.role]);

  return { id: result.lastID, ...TEST_ADMIN };
}

// Generate test JWT token
export function generateTestToken(userId: number): string {
  const jwtSecret = process.env.JWT_SECRET!;
  return jwt.sign(
    { userId },
    jwtSecret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' } as jwt.SignOptions
  );
}

// Get admin user and token for tests
export async function getTestAdminAuth() {
  const db = getDatabase();
  const admin = await dbGet(db, 'SELECT * FROM users WHERE username = ?', [TEST_ADMIN.username]);
  
  if (!admin) {
    throw new Error('Test admin user not found. Make sure setup is called properly.');
  }
  
  const token = generateTestToken(admin.id);
  
  return {
    user: admin,
    token,
    authHeader: `Bearer ${token}`
  };
}

// Create test employee user
export async function createTestEmployee(overrides: any = {}) {
  const db = getDatabase();
  
  // Generate unique username to avoid conflicts
  const timestamp = Date.now();
  const randomNum = Math.floor(Math.random() * 1000);
  
  const employeeData = {
    username: `testemployee_${timestamp}_${randomNum}`,
    email: `employee_${timestamp}_${randomNum}@test.com`,
    password: 'testpass123',
    full_name: 'Test Employee',
    role: 'employee',
    ...overrides
  };

  // Hash password
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '4');
  const passwordHash = await bcrypt.hash(employeeData.password, saltRounds);

  // Create employee user
  const result = await dbRun(db, `
    INSERT INTO users (username, email, password_hash, full_name, role)
    VALUES (?, ?, ?, ?, ?)
  `, [employeeData.username, employeeData.email, passwordHash, employeeData.full_name, employeeData.role]);

  const token = generateTestToken(result.lastID);
  
  return {
    user: { id: result.lastID, ...employeeData },
    token,
    authHeader: `Bearer ${token}`
  };
}

// Test data factories
export const createTestRepair = (overrides: any = {}) => ({
  device_type: 'smartphone',
  brand: 'Apple',
  model: 'iPhone 14',
  serial_number: 'TEST123456',
  client_name: 'Тест Клиент',
  client_phone: '+7-999-000-00-00',
  client_email: 'test@example.com',
  issue_description: 'Тестовая проблема',
  estimated_cost: 10000,
  notes: 'Тестовые заметки',
  ...overrides
});

export const createTestPart = (overrides: any = {}) => ({
  name: 'Test Part',
  description: 'Test part description',
  cost: 5000,
  quantity_in_stock: 10,
  supplier: 'Test Supplier',
  ...overrides
});

// Helper to create repair in database with user tracking
export async function createRepairInDB(repairData: any = {}, createdByUserId?: number) {
  const db = getDatabase();
  const repair = createTestRepair(repairData);
  
  // Get admin user if no creator specified
  if (!createdByUserId) {
    const admin = await dbGet(db, 'SELECT id FROM users WHERE username = ?', [TEST_ADMIN.username]);
    createdByUserId = admin.id;
  }
  
  const result = await dbRun(db, `
    INSERT INTO repairs (
      device_type, brand, model, serial_number, client_name, 
      client_phone, client_email, issue_description, estimated_cost, 
      assigned_to, created_by, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    repair.device_type, repair.brand, repair.model, repair.serial_number,
    repair.client_name, repair.client_phone, repair.client_email,
    repair.issue_description, repair.estimated_cost,
    repair.assigned_to || null, createdByUserId, repair.notes
  ]);
  
  return { id: result.lastID, ...repair, created_by: createdByUserId };
}

// Helper to create part in database
export async function createPartInDB(partData: any = {}) {
  const db = getDatabase();
  const part = createTestPart(partData);
  
  const result = await dbRun(db, `
    INSERT INTO parts (name, description, cost, quantity_in_stock, supplier)
    VALUES (?, ?, ?, ?, ?)
  `, [part.name, part.description, part.cost, part.quantity_in_stock, part.supplier]);
  
  return { id: result.lastID, ...part };
} 