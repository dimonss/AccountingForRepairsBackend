import { Router, Request, Response } from 'express';
import { getDatabase } from '../database/init';
import { authenticateToken, requireManagerOrAdmin } from '../middleware/auth';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

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
  assigned_to?: number;
  notes?: string;
  photos?: RepairPhoto[];
}

interface RepairPhoto {
  id?: number;
  repair_id: number;
  filename: string;
  url: string;
  uploaded_at?: string;
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
    db.run(query, params, function(this: any, err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

// Get photos for a repair
async function getRepairPhotos(db: sqlite3.Database, repairId: number): Promise<RepairPhoto[]> {
  const photos = await dbAll(db, `
    SELECT id, repair_id, filename, file_path, uploaded_at
    FROM repair_photos 
    WHERE repair_id = ? 
    ORDER BY uploaded_at ASC
  `, [repairId]);
  
  return photos.map((photo: any) => ({
    id: photo.id,
    repair_id: photo.repair_id,
    filename: photo.filename,
    url: `/photos/${photo.filename}`,
    uploaded_at: photo.uploaded_at
  }));
}

// GET /repairs - Get all repairs (authenticated users only)
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    // language=SQL
    const repairs = await dbAll(db, `
      SELECT r.*, 
             u1.username as created_by_username,
             u1.full_name as created_by_name,
             u2.username as assigned_to_username,
             u2.full_name as assigned_to_name
      FROM repairs r
      LEFT JOIN users u1 ON r.created_by = u1.id
      LEFT JOIN users u2 ON r.assigned_to = u2.id
      ORDER BY r.created_at DESC
    `);
    
    // Add photos to each repair
    const repairsWithPhotos = await Promise.all(
      repairs.map(async (repair: any) => {
        const photos = await getRepairPhotos(db, repair.id);
        return { ...repair, photos };
      })
    );
    
    res.json({ success: true, data: repairsWithPhotos });
  } catch (error) {
    console.error('Error fetching repairs:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /repairs/:id - Get single repair (authenticated users only)
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    // language=SQL
    const repair = await dbGet(db, `
      SELECT r.*, 
             u1.username as created_by_username,
             u1.full_name as created_by_name,
             u2.username as assigned_to_username,
             u2.full_name as assigned_to_name
      FROM repairs r
      LEFT JOIN users u1 ON r.created_by = u1.id
      LEFT JOIN users u2 ON r.assigned_to = u2.id
      WHERE r.id = ?
    `, [req.params.id]);
    
    if (!repair) {
      return res.status(404).json({ success: false, error: 'Repair not found' });
    }
    
    // Add photos to repair
    const photos = await getRepairPhotos(db, repair.id);
    const repairWithPhotos = { ...repair, photos };
    
    res.json({ success: true, data: repairWithPhotos });
  } catch (error) {
    console.error('Error fetching repair:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /repairs - Create new repair (authenticated users only)
router.post('/', authenticateToken, async (req: Request, res: Response) => {
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
      assigned_to,
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
        client_phone, client_email, issue_description, estimated_cost, 
        assigned_to, created_by, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      device_type, brand, model, serial_number, client_name,
      client_phone, client_email, issue_description, estimated_cost,
      assigned_to, req.user!.id, notes
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

// PUT /repairs/:id - Update repair (managers and admins only)
router.put('/:id', authenticateToken, requireManagerOrAdmin, async (req: Request, res: Response) => {
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
      assigned_to,
      notes
    }: Repair = req.body;

    // language=SQL
    const result = await dbRun(db, `
      UPDATE repairs SET 
        device_type = ?, brand = ?, model = ?, serial_number = ?,
        client_name = ?, client_phone = ?, client_email = ?,
        issue_description = ?, repair_status = ?, estimated_cost = ?,
        actual_cost = ?, parts_cost = ?, labor_cost = ?, assigned_to = ?, notes = ?,
        updated_at = CURRENT_TIMESTAMP,
        completed_at = CASE WHEN ? = 'completed' THEN CURRENT_TIMESTAMP ELSE completed_at END
      WHERE id = ?
    `, [
      device_type, brand, model, serial_number, client_name,
      client_phone, client_email, issue_description, repair_status,
      estimated_cost, actual_cost, parts_cost, labor_cost, assigned_to, notes,
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

// DELETE /repairs/:id - Delete repair (managers and admins only)
router.delete('/:id', authenticateToken, requireManagerOrAdmin, async (req: Request, res: Response) => {
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

// PATCH /repairs/:id/status - Update repair status (authenticated users only)
router.patch('/:id/status', authenticateToken, async (req: Request, res: Response) => {
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

    // Log status change with user who made the change
    // language=SQL
    await dbRun(db, `
      INSERT INTO repair_status_history (repair_id, old_status, new_status, changed_by, notes)
      VALUES (?, ?, ?, ?, ?)
    `, [req.params.id, currentRepair.repair_status, status, req.user!.id, notes || null]);

    res.json({ success: true, message: 'Repair status updated successfully' });
  } catch (error) {
    console.error('Error updating repair status:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /repairs/:id/history - Get repair status history (authenticated users only)
router.get('/:id/history', authenticateToken, async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    
    // language=SQL
    const history = await dbAll(db, `
      SELECT rsh.*, u.username, u.full_name
      FROM repair_status_history rsh
      LEFT JOIN users u ON rsh.changed_by = u.id
      WHERE rsh.repair_id = ?
      ORDER BY rsh.changed_at DESC
    `, [req.params.id]);

    res.json({ success: true, data: history });
  } catch (error) {
    console.error('Error fetching repair history:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /repairs/:id/photos - Upload photos for repair
router.post('/:id/photos', authenticateToken, async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const repairId = req.params.id;
    const { photos } = req.body;
    
    // Verify repair exists
    const repair = await dbGet(db, 'SELECT id FROM repairs WHERE id = ?', [repairId]);
    if (!repair) {
      return res.status(404).json({ success: false, error: 'Repair not found' });
    }
    
    if (!photos || !Array.isArray(photos)) {
      return res.status(400).json({ success: false, error: 'Photos array is required' });
    }
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads', 'repairs');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const savedPhotos = [];
    
    for (const photo of photos) {
      if (!photo.filename || !photo.url) {
        continue;
      }
      
      // Save base64 data to file
      if (photo.url.startsWith('data:image/')) {
        const base64Data = photo.url.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const filePath = path.join(uploadsDir, photo.filename);
        
        fs.writeFileSync(filePath, buffer);
        
        // Save to database
        const result = await dbRun(db, `
          INSERT INTO repair_photos (repair_id, filename, file_path, uploaded_by)
          VALUES (?, ?, ?, ?)
        `, [repairId, photo.filename, filePath, req.user!.id]);
        
        savedPhotos.push({
          id: result.lastID,
          repair_id: repairId,
          filename: photo.filename,
          url: `/photos/${photo.filename}`
        });
      }
    }
    
    res.status(201).json({ 
      success: true, 
      data: savedPhotos,
      message: `${savedPhotos.length} photos uploaded successfully` 
    });
  } catch (error) {
    console.error('Error uploading photos:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});


// DELETE /repairs/:id/photos/:photoId - Delete photo
router.delete('/:id/photos/:photoId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id: repairId, photoId } = req.params;
    
    // Get photo info
    const photo = await dbGet(db, `
      SELECT * FROM repair_photos 
      WHERE id = ? AND repair_id = ?
    `, [photoId, repairId]);
    
    if (!photo) {
      return res.status(404).json({ success: false, error: 'Photo not found' });
    }
    
    // Delete file
    if (fs.existsSync(photo.file_path)) {
      fs.unlinkSync(photo.file_path);
    }
    
    // Delete from database
    await dbRun(db, 'DELETE FROM repair_photos WHERE id = ?', [photoId]);
    
    res.json({ success: true, message: 'Photo deleted successfully' });
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router; 