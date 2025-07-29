import { Router, Request, Response } from 'express';
import { getDatabase } from '../database/init';
import sqlite3 from 'sqlite3';

const router = Router();

interface Repair {
  id?: number;
  device_type: string;
  brand: string;
  model: string;
  serial_number?: string;
  client_name: string;
  client_phone: string;
  client_email?: string;
  issue_description: string;
  repair_status: 'pending' | 'in_progress' | 'waiting_parts' | 'completed' | 'cancelled';
  estimated_cost?: number;
  actual_cost?: number;
  parts_cost?: number;
  labor_cost?: number;
  notes?: string;
}

// Helper functions to promisify SQLite operations
function dbAll(db: sqlite3.Database, query: string, params: any[] = []): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function dbGet(db: sqlite3.Database, query: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbRun(db: sqlite3.Database, query: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

// GET /api/repairs - Get all repairs
router.get('/', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    // language=SQL
    const repairs = await dbAll(db, `
      SELECT * FROM repairs 
      ORDER BY created_at DESC
    `);
    
    res.json({ success: true, data: repairs });
  } catch (error) {
    console.error('Error fetching repairs:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/repairs/:id - Get single repair
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    // language=SQL
    const repair = await dbGet(db, 'SELECT * FROM repairs WHERE id = ?', [req.params.id]);
    
    if (!repair) {
      return res.status(404).json({ success: false, error: 'Repair not found' });
    }
    
    res.json({ success: true, data: repair });
  } catch (error) {
    console.error('Error fetching repair:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/repairs - Create new repair
router.post('/', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    
    const {
      device_type,
      brand,
      model,
      serial_number,
      client_name,
      client_phone,
      client_email,
      issue_description,
      estimated_cost,
      notes
    }: Repair = req.body;

    // Validate required fields
    if (!device_type || !brand || !model || !client_name || !client_phone || !issue_description) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }

    // language=SQL
    const result = await dbRun(db, `
      INSERT INTO repairs (
        device_type, brand, model, serial_number, client_name, 
        client_phone, client_email, issue_description, estimated_cost, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      device_type, brand, model, serial_number, client_name,
      client_phone, client_email, issue_description, estimated_cost, notes
    ]);

    res.status(201).json({ 
      success: true, 
      data: { id: result.lastID, message: 'Repair created successfully' }
    });
  } catch (error) {
    console.error('Error creating repair:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/repairs/:id - Update repair
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    
    const {
      device_type,
      brand,
      model,
      serial_number,
      client_name,
      client_phone,
      client_email,
      issue_description,
      repair_status,
      estimated_cost,
      actual_cost,
      parts_cost,
      labor_cost,
      notes
    }: Repair = req.body;

    // language=SQL
    const result = await dbRun(db, `
      UPDATE repairs SET 
        device_type = ?, brand = ?, model = ?, serial_number = ?,
        client_name = ?, client_phone = ?, client_email = ?,
        issue_description = ?, repair_status = ?, estimated_cost = ?,
        actual_cost = ?, parts_cost = ?, labor_cost = ?, notes = ?,
        updated_at = CURRENT_TIMESTAMP,
        completed_at = CASE WHEN ? = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END
      WHERE id = ?
    `, [
      device_type, brand, model, serial_number, client_name,
      client_phone, client_email, issue_description, repair_status,
      estimated_cost, actual_cost, parts_cost, labor_cost, notes,
      repair_status, req.params.id
    ]);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Repair not found' });
    }

    res.json({ success: true, message: 'Repair updated successfully' });
  } catch (error) {
    console.error('Error updating repair:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/repairs/:id - Delete repair
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    // language=SQL
    const result = await dbRun(db, 'DELETE FROM repairs WHERE id = ?', [req.params.id]);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Repair not found' });
    }

    res.json({ success: true, message: 'Repair deleted successfully' });
  } catch (error) {
    console.error('Error deleting repair:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PATCH /api/repairs/:id/status - Update repair status
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { status, notes } = req.body;
    
    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required' });
    }

    // Get current status
    // language=SQL
    const currentRepair = await dbGet(db, 'SELECT repair_status FROM repairs WHERE id = ?', [req.params.id]);
    
    if (!currentRepair) {
      return res.status(404).json({ success: false, error: 'Repair not found' });
    }

    // Update repair status
    // language=SQL
    await dbRun(db, `
      UPDATE repairs SET 
        repair_status = ?, 
        updated_at = CURRENT_TIMESTAMP,
        completed_at = CASE WHEN ? = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END
      WHERE id = ?
    `, [status, status, req.params.id]);

    // Log status change
    // language=SQL
    await dbRun(db, `
      INSERT INTO repair_status_history (repair_id, old_status, new_status, notes)
      VALUES (?, ?, ?, ?)
    `, [req.params.id, currentRepair.repair_status, status, notes || null]);

    res.json({ success: true, message: 'Repair status updated successfully' });
  } catch (error) {
    console.error('Error updating repair status:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router; 