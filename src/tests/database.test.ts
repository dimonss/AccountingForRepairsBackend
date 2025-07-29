import { getDatabase } from '../database/init';
import { dbRun, dbGet, dbAll } from './testUtils';

describe('Database Tests', () => {
  describe('Database Initialization', () => {
    it('should create all required tables', async () => {
      const db = getDatabase();
      
      // Check if all tables exist
      const tables = await dbAll(db, `
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `);
      
      const tableNames = tables.map(table => table.name);
      expect(tableNames).toContain('users');
      expect(tableNames).toContain('repairs');
      expect(tableNames).toContain('repair_status_history');
      expect(tableNames).toContain('parts');
      expect(tableNames).toContain('repair_parts');
    });

    it('should create repairs table with correct schema including user columns', async () => {
      const db = getDatabase();
      
      const schema = await dbAll(db, "PRAGMA table_info(repairs)");
      const columnNames = schema.map(col => col.name);
      
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('device_type');
      expect(columnNames).toContain('brand');
      expect(columnNames).toContain('model');
      expect(columnNames).toContain('client_name');
      expect(columnNames).toContain('client_phone');
      expect(columnNames).toContain('repair_status');
      expect(columnNames).toContain('created_at');
      expect(columnNames).toContain('updated_at');
      expect(columnNames).toContain('assigned_to');
      expect(columnNames).toContain('created_by');
    });

    it('should create users table with correct schema', async () => {
      const db = getDatabase();
      
      const schema = await dbAll(db, "PRAGMA table_info(users)");
      const columnNames = schema.map(col => col.name);
      
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('username');
      expect(columnNames).toContain('email');
      expect(columnNames).toContain('password_hash');
      expect(columnNames).toContain('full_name');
      expect(columnNames).toContain('role');
      expect(columnNames).toContain('is_active');
      expect(columnNames).toContain('created_at');
      expect(columnNames).toContain('updated_at');
      expect(columnNames).toContain('last_login');
    });

    it('should create foreign key constraints', async () => {
      const db = getDatabase();
      
      // Check foreign keys for repair_status_history
      const historyForeignKeys = await dbAll(db, "PRAGMA foreign_key_list(repair_status_history)");
      expect(historyForeignKeys.length).toBeGreaterThanOrEqual(1);
      
      // Check foreign keys for repair_parts
      const partsForeignKeys = await dbAll(db, "PRAGMA foreign_key_list(repair_parts)");
      expect(partsForeignKeys).toHaveLength(2);
      
      // Check foreign keys for repairs table (should have user references)
      const repairsForeignKeys = await dbAll(db, "PRAGMA foreign_key_list(repairs)");
      expect(repairsForeignKeys.length).toBeGreaterThanOrEqual(2); // assigned_to and created_by
    });
  });

  describe('Database Operations', () => {
    it('should insert and retrieve data correctly with user tracking', async () => {
      const db = getDatabase();
      
      // First create a test user
      const userResult = await dbRun(db, `
        INSERT INTO users (username, email, password_hash, full_name, role)
        VALUES (?, ?, ?, ?, ?)
      `, ['testuser', 'test@example.com', 'hashedpassword', 'Test User', 'employee']);
      
      const userId = userResult.lastID;

      // Insert test repair with user references
      const result = await dbRun(db, `
        INSERT INTO repairs (device_type, brand, model, client_name, client_phone, issue_description, created_by, assigned_to)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, ['smartphone', 'Apple', 'iPhone 14', 'John Doe', '+1234567890', 'Screen broken', userId, userId]);

      expect(result.lastID).toBeGreaterThan(0);

      // Retrieve the repair
      const repair = await dbGet(db, 'SELECT * FROM repairs WHERE id = ?', [result.lastID]);
      expect(repair).toBeDefined();
      expect(repair.device_type).toBe('smartphone');
      expect(repair.created_by).toBe(userId);
      expect(repair.assigned_to).toBe(userId);
    });

    it('should handle default values correctly', async () => {
      const db = getDatabase();
      
      // Create a test user first
      const userResult = await dbRun(db, `
        INSERT INTO users (username, email, password_hash, full_name, role)
        VALUES (?, ?, ?, ?, ?)
      `, ['testuser2', 'test2@example.com', 'hashedpassword', 'Test User 2', 'employee']);
      
      const userId = userResult.lastID;

      // Insert repair with minimal data
      const result = await dbRun(db, `
        INSERT INTO repairs (device_type, brand, model, client_name, client_phone, issue_description, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, ['laptop', 'Dell', 'XPS 13', 'Jane Smith', '+1234567891', 'Won\'t boot', userId]);

      const repair = await dbGet(db, 'SELECT * FROM repairs WHERE id = ?', [result.lastID]);
      expect(repair.repair_status).toBe('pending'); // Default value
      expect(repair.parts_cost).toBe(0); // Default value
      expect(repair.labor_cost).toBe(0); // Default value
      expect(repair.created_at).toBeDefined();
      expect(repair.updated_at).toBeDefined();
    });

    it('should cascade delete repair_status_history when repair is deleted', async () => {
      const db = getDatabase();
      
      // Create test user
      const userResult = await dbRun(db, `
        INSERT INTO users (username, email, password_hash, full_name, role)
        VALUES (?, ?, ?, ?, ?)
      `, ['testuser3', 'test3@example.com', 'hashedpassword', 'Test User 3', 'employee']);
      
      const userId = userResult.lastID;

      // Insert repair
      const repairResult = await dbRun(db, `
        INSERT INTO repairs (device_type, brand, model, client_name, client_phone, issue_description, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, ['tablet', 'iPad', 'Air', 'Bob Wilson', '+1234567892', 'Battery issues', userId]);

      const repairId = repairResult.lastID;

      // Insert status history
      await dbRun(db, `
        INSERT INTO repair_status_history (repair_id, old_status, new_status, changed_by)
        VALUES (?, ?, ?, ?)
      `, [repairId, 'pending', 'in_progress', userId]);

      // Verify history exists
      let history = await dbGet(db, 'SELECT * FROM repair_status_history WHERE repair_id = ?', [repairId]);
      expect(history).toBeDefined();

      // Delete repair
      await dbRun(db, 'DELETE FROM repairs WHERE id = ?', [repairId]);

      // Verify history was cascade deleted
      history = await dbGet(db, 'SELECT * FROM repair_status_history WHERE repair_id = ?', [repairId]);
      expect(history).toBeUndefined();
    });

    it('should handle concurrent operations safely', async () => {
      const db = getDatabase();
      
      // Create test user
      const userResult = await dbRun(db, `
        INSERT INTO users (username, email, password_hash, full_name, role)
        VALUES (?, ?, ?, ?, ?)
      `, ['concurrentuser', 'concurrent@example.com', 'hashedpassword', 'Concurrent User', 'employee']);
      
      const userId = userResult.lastID;

      // Simulate concurrent operations
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          dbRun(db, `
            INSERT INTO repairs (device_type, brand, model, client_name, client_phone, issue_description, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [`device${i}`, `brand${i}`, `model${i}`, `client${i}`, `+12345${i}`, `issue${i}`, userId])
        );
      }

      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.lastID).toBeGreaterThan(0);
      });
    });
  });

  describe('Data Integrity', () => {
    it('should enforce NOT NULL constraints', async () => {
      const db = getDatabase();
      
      // Try to insert repair without required fields
      await expect(
        dbRun(db, `
          INSERT INTO repairs (device_type, brand)
          VALUES (?, ?)
        `, ['phone', 'Samsung'])
      ).rejects.toThrow();
    });

    it('should handle DECIMAL fields correctly', async () => {
      const db = getDatabase();
      
      // Create test user
      const userResult = await dbRun(db, `
        INSERT INTO users (username, email, password_hash, full_name, role)
        VALUES (?, ?, ?, ?, ?)
      `, ['decimaluser', 'decimal@example.com', 'hashedpassword', 'Decimal User', 'employee']);
      
      const userId = userResult.lastID;

      const result = await dbRun(db, `
        INSERT INTO repairs (device_type, brand, model, client_name, client_phone, issue_description, estimated_cost, actual_cost, parts_cost, labor_cost, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, ['laptop', 'HP', 'Pavilion', 'Alice Johnson', '+1234567893', 'Keyboard broken', 299.99, 250.50, 150.75, 99.75, userId]);

      const repair = await dbGet(db, 'SELECT * FROM repairs WHERE id = ?', [result.lastID]);
      expect(repair.estimated_cost).toBe(299.99);
      expect(repair.actual_cost).toBe(250.5);
      expect(repair.parts_cost).toBe(150.75);
      expect(repair.labor_cost).toBe(99.75);
    });

    it('should handle TEXT fields with special characters', async () => {
      const db = getDatabase();
      
      // Create test user
      const userResult = await dbRun(db, `
        INSERT INTO users (username, email, password_hash, full_name, role)
        VALUES (?, ?, ?, ?, ?)
      `, ['specialuser', 'special@example.com', 'hashedpassword', 'Special User', 'employee']);
      
      const userId = userResult.lastID;

      const specialText = "Device with 'quotes', \"double quotes\", and émojis: 😀🔧💻";
      const result = await dbRun(db, `
        INSERT INTO repairs (device_type, brand, model, client_name, client_phone, issue_description, notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, ['computer', 'Custom', 'Special Model', 'Special Client', '+1234567894', specialText, specialText, userId]);

      const repair = await dbGet(db, 'SELECT * FROM repairs WHERE id = ?', [result.lastID]);
      expect(repair.issue_description).toBe(specialText);
      expect(repair.notes).toBe(specialText);
    });
  });

  describe('Database File Management', () => {
    it('should handle database connection properly', async () => {
      const db = getDatabase();
      expect(db).toBeDefined();
      expect(typeof db.run).toBe('function');
      expect(typeof db.get).toBe('function');
      expect(typeof db.all).toBe('function');
    });
  });
}); 