import sqlite3 from 'sqlite3';
import { getDatabase } from '../database/init';

// Helper function to promisify database operations for tests
export function dbRun(db: sqlite3.Database, query: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

export function dbGet(db: sqlite3.Database, query: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function dbAll(db: sqlite3.Database, query: string, params: any[] = []): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
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

// Helper to create repair in database
export async function createRepairInDB(repairData: any = {}) {
  const db = getDatabase();
  const repair = createTestRepair(repairData);
  
  const result = await dbRun(db, `
    INSERT INTO repairs (
      device_type, brand, model, serial_number, client_name, 
      client_phone, client_email, issue_description, estimated_cost, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    repair.device_type, repair.brand, repair.model, repair.serial_number,
    repair.client_name, repair.client_phone, repair.client_email,
    repair.issue_description, repair.estimated_cost, repair.notes
  ]);
  
  return { id: result.lastID, ...repair };
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