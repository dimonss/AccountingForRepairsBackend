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
      expect(tableNames).toContain('repairs');
      expect(tableNames).toContain('repair_status_history');
      expect(tableNames).toContain('parts');
      expect(tableNames).toContain('repair_parts');
    });

    it('should create repairs table with correct schema', async () => {
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
    });

    it('should create foreign key constraints', async () => {
      const db = getDatabase();
      
      // Check foreign keys for repair_status_history
      const historyForeignKeys = await dbAll(db, "PRAGMA foreign_key_list(repair_status_history)");
      expect(historyForeignKeys).toHaveLength(1);
      expect(historyForeignKeys[0].table).toBe('repairs');
      
      // Check foreign keys for repair_parts
      const partsForeignKeys = await dbAll(db, "PRAGMA foreign_key_list(repair_parts)");
      expect(partsForeignKeys).toHaveLength(2);
      const fkTables = partsForeignKeys.map(fk => fk.table);
      expect(fkTables).toContain('repairs');
      expect(fkTables).toContain('parts');
    });
  });

  describe('Database Operations', () => {
    it('should insert and retrieve data correctly', async () => {
      const db = getDatabase();
      
      // Insert test repair
      const insertResult = await dbRun(db, `
        INSERT INTO repairs (device_type, brand, model, client_name, client_phone, issue_description)
        VALUES (?, ?, ?, ?, ?, ?)
      `, ['smartphone', 'Apple', 'iPhone 14', 'Test Client', '+7-999-000-00-00', 'Test issue']);
      
      expect(insertResult.lastID).toBeGreaterThan(0);
      
      // Retrieve inserted data
      const repair = await dbGet(db, 'SELECT * FROM repairs WHERE id = ?', [insertResult.lastID]);
      expect(repair.device_type).toBe('smartphone');
      expect(repair.brand).toBe('Apple');
      expect(repair.client_name).toBe('Test Client');
      expect(repair.repair_status).toBe('pending'); // default value
    });

    it('should handle default values correctly', async () => {
      const db = getDatabase();
      
      const insertResult = await dbRun(db, `
        INSERT INTO repairs (device_type, brand, model, client_name, client_phone, issue_description)
        VALUES (?, ?, ?, ?, ?, ?)
      `, ['laptop', 'Dell', 'XPS 13', 'Test Client', '+7-999-000-00-00', 'Test issue']);
      
      const repair = await dbGet(db, 'SELECT * FROM repairs WHERE id = ?', [insertResult.lastID]);
      
      // Check default values
      expect(repair.repair_status).toBe('pending');
      expect(repair.parts_cost).toBe(0);
      expect(repair.labor_cost).toBe(0);
      expect(repair.created_at).toBeTruthy();
      expect(repair.updated_at).toBeTruthy();
    });

    it('should cascade delete repair_status_history when repair is deleted', async () => {
      const db = getDatabase();
      
      // Insert repair
      const repairResult = await dbRun(db, `
        INSERT INTO repairs (device_type, brand, model, client_name, client_phone, issue_description)
        VALUES (?, ?, ?, ?, ?, ?)
      `, ['tablet', 'Samsung', 'Galaxy Tab', 'Test Client', '+7-999-000-00-00', 'Test issue']);
      
      // Insert status history
      await dbRun(db, `
        INSERT INTO repair_status_history (repair_id, old_status, new_status)
        VALUES (?, ?, ?)
      `, [repairResult.lastID, 'pending', 'in_progress']);
      
      // Verify history exists
      const historyBefore = await dbGet(db, 'SELECT * FROM repair_status_history WHERE repair_id = ?', [repairResult.lastID]);
      expect(historyBefore).toBeTruthy();
      
      // Delete repair
      await dbRun(db, 'DELETE FROM repairs WHERE id = ?', [repairResult.lastID]);
      
      // Verify history was cascade deleted
      const historyAfter = await dbGet(db, 'SELECT * FROM repair_status_history WHERE repair_id = ?', [repairResult.lastID]);
      expect(historyAfter).toBeUndefined();
    });

    it('should handle concurrent operations safely', async () => {
      const db = getDatabase();
      
      // Create multiple repairs concurrently
      const promises = Array.from({ length: 10 }, (_, i) =>
        dbRun(db, `
          INSERT INTO repairs (device_type, brand, model, client_name, client_phone, issue_description)
          VALUES (?, ?, ?, ?, ?, ?)
        `, ['smartphone', 'Apple', `iPhone ${i}`, `Client ${i}`, `+7-999-000-00-0${i}`, `Issue ${i}`])
      );
      
      const results = await Promise.all(promises);
      
      // All inserts should succeed with unique IDs
      const ids = results.map(r => r.lastID);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);
      
      // Verify all repairs were created
      const allRepairs = await dbAll(db, 'SELECT * FROM repairs ORDER BY id');
      expect(allRepairs).toHaveLength(10);
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
        `, ['smartphone', 'Apple'])
      ).rejects.toThrow();
    });

    it('should handle DECIMAL fields correctly', async () => {
      const db = getDatabase();
      
      const insertResult = await dbRun(db, `
        INSERT INTO repairs (
          device_type, brand, model, client_name, client_phone, issue_description,
          estimated_cost, actual_cost, parts_cost, labor_cost
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'smartphone', 'Apple', 'iPhone 14', 'Test Client', '+7-999-000-00-00', 'Test issue',
        15000.50, 14500.75, 12000.25, 2500.50
      ]);
      
      const repair = await dbGet(db, 'SELECT * FROM repairs WHERE id = ?', [insertResult.lastID]);
      
      expect(parseFloat(repair.estimated_cost)).toBe(15000.50);
      expect(parseFloat(repair.actual_cost)).toBe(14500.75);
      expect(parseFloat(repair.parts_cost)).toBe(12000.25);
      expect(parseFloat(repair.labor_cost)).toBe(2500.50);
    });

    it('should handle TEXT fields with special characters', async () => {
      const db = getDatabase();
      
      const specialText = "Тест с символами: @#$%^&*(){}[]|\\:;\"'<>,.?/~`";
      
      const insertResult = await dbRun(db, `
        INSERT INTO repairs (device_type, brand, model, client_name, client_phone, issue_description, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, ['smartphone', 'Apple', 'iPhone 14', specialText, '+7-999-000-00-00', specialText, specialText]);
      
      const repair = await dbGet(db, 'SELECT * FROM repairs WHERE id = ?', [insertResult.lastID]);
      
      expect(repair.client_name).toBe(specialText);
      expect(repair.issue_description).toBe(specialText);
      expect(repair.notes).toBe(specialText);
    });
  });

  describe('Database File Management', () => {
    it('should handle database connection properly', () => {
      const db = getDatabase();
      expect(db).toBeTruthy();
      
      // Database should be ready for operations
      expect(typeof db.run).toBe('function');
      expect(typeof db.get).toBe('function');
      expect(typeof db.all).toBe('function');
    });
  });
}); 