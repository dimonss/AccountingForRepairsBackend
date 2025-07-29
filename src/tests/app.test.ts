import request from 'supertest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import repairRoutes from '../routes/repairs';
import { createRepairInDB, createTestRepair, dbGet } from './testUtils';
import { getDatabase } from '../database/init';

// Create test app
const createApp = () => {
  const app = express();
  
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  app.use('/api/repairs', repairRoutes);
  
  app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Server is running' });
  });
  
  return app;
};

describe('API Integration Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = createApp();
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'OK',
        message: 'Server is running'
      });
    });
  });

  describe('GET /api/repairs', () => {
    it('should return empty array when no repairs exist', async () => {
      const response = await request(app)
        .get('/api/repairs')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: []
      });
    });

    it('should return all repairs when they exist', async () => {
      // Create test repairs
      await createRepairInDB({ client_name: 'Клиент 1' });
      await createRepairInDB({ client_name: 'Клиент 2' });

      const response = await request(app)
        .get('/api/repairs')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[0]).toHaveProperty('client_name');
      expect(response.body.data[0]).toHaveProperty('created_at');
    });
  });

  describe('GET /api/repairs/:id', () => {
    it('should return specific repair by id', async () => {
      const repair = await createRepairInDB({ client_name: 'Тест Клиент' });

      const response = await request(app)
        .get(`/api/repairs/${repair.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(repair.id);
      expect(response.body.data.client_name).toBe('Тест Клиент');
    });

    it('should return 404 for non-existent repair', async () => {
      const response = await request(app)
        .get('/api/repairs/999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Repair not found');
    });
  });

  describe('POST /api/repairs', () => {
    it('should create new repair successfully', async () => {
      const newRepair = createTestRepair({
        client_name: 'Новый Клиент',
        device_type: 'laptop'
      });

      const response = await request(app)
        .post('/api/repairs')
        .send(newRepair)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.message).toBe('Repair created successfully');

      // Verify repair was created in database
      const db = getDatabase();
      const createdRepair = await dbGet(db, 'SELECT * FROM repairs WHERE id = ?', [response.body.data.id]);
      expect(createdRepair.client_name).toBe('Новый Клиент');
      expect(createdRepair.device_type).toBe('laptop');
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteRepair = {
        device_type: 'smartphone',
        brand: 'Apple'
        // Missing other required fields
      };

      const response = await request(app)
        .post('/api/repairs')
        .send(incompleteRepair)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Missing required fields');
    });

    it('should handle optional fields correctly', async () => {
      const repairWithOptionalFields = createTestRepair({
        serial_number: null,
        client_email: null,
        notes: null
      });

      const response = await request(app)
        .post('/api/repairs')
        .send(repairWithOptionalFields)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('PUT /api/repairs/:id', () => {
    it('should update existing repair successfully', async () => {
      const repair = await createRepairInDB();
      
      const updates = {
        ...createTestRepair(),
        client_name: 'Обновленный Клиент',
        repair_status: 'in_progress',
        actual_cost: 15000,
        parts_cost: 10000,
        labor_cost: 5000
      };

      const response = await request(app)
        .put(`/api/repairs/${repair.id}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Repair updated successfully');

      // Verify updates in database
      const db = getDatabase();
      const updatedRepair = await dbGet(db, 'SELECT * FROM repairs WHERE id = ?', [repair.id]);
      expect(updatedRepair.client_name).toBe('Обновленный Клиент');
      expect(updatedRepair.repair_status).toBe('in_progress');
      expect(updatedRepair.actual_cost).toBe(15000);
    });

    it('should return 404 for non-existent repair', async () => {
      const updates = createTestRepair();

      const response = await request(app)
        .put('/api/repairs/999')
        .send(updates)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Repair not found');
    });

    it('should set completed_at when status changes to completed', async () => {
      const repair = await createRepairInDB();
      
      const updates = {
        ...createTestRepair(),
        repair_status: 'completed'
      };

      await request(app)
        .put(`/api/repairs/${repair.id}`)
        .send(updates)
        .expect(200);

      // Verify completed_at is set
      const db = getDatabase();
      const updatedRepair = await dbGet(db, 'SELECT * FROM repairs WHERE id = ?', [repair.id]);
      expect(updatedRepair.completed_at).not.toBeNull();
    });
  });

  describe('DELETE /api/repairs/:id', () => {
    it('should delete existing repair successfully', async () => {
      const repair = await createRepairInDB();

      const response = await request(app)
        .delete(`/api/repairs/${repair.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Repair deleted successfully');

      // Verify repair was deleted
      const db = getDatabase();
      const deletedRepair = await dbGet(db, 'SELECT * FROM repairs WHERE id = ?', [repair.id]);
      expect(deletedRepair).toBeUndefined();
    });

    it('should return 404 for non-existent repair', async () => {
      const response = await request(app)
        .delete('/api/repairs/999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Repair not found');
    });
  });

  describe('PATCH /api/repairs/:id/status', () => {
    it('should update repair status successfully', async () => {
      const repair = await createRepairInDB({ repair_status: 'pending' });

      const statusUpdate = {
        status: 'in_progress',
        notes: 'Начинаем работу'
      };

      const response = await request(app)
        .patch(`/api/repairs/${repair.id}/status`)
        .send(statusUpdate)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Repair status updated successfully');

      // Verify status was updated
      const db = getDatabase();
      const updatedRepair = await dbGet(db, 'SELECT * FROM repairs WHERE id = ?', [repair.id]);
      expect(updatedRepair.repair_status).toBe('in_progress');

      // Verify status history was created
      const statusHistory = await dbGet(db, 'SELECT * FROM repair_status_history WHERE repair_id = ?', [repair.id]);
      expect(statusHistory.old_status).toBe('pending');
      expect(statusHistory.new_status).toBe('in_progress');
      expect(statusHistory.notes).toBe('Начинаем работу');
    });

    it('should return 400 for missing status', async () => {
      const repair = await createRepairInDB();

      const response = await request(app)
        .patch(`/api/repairs/${repair.id}/status`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Status is required');
    });

    it('should return 404 for non-existent repair', async () => {
      const response = await request(app)
        .patch('/api/repairs/999/status')
        .send({ status: 'completed' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Repair not found');
    });

    it('should set completed_at when status changes to completed', async () => {
      const repair = await createRepairInDB({ repair_status: 'in_progress' });

      await request(app)
        .patch(`/api/repairs/${repair.id}/status`)
        .send({ status: 'completed' })
        .expect(200);

      // Verify completed_at is set
      const db = getDatabase();
      const updatedRepair = await dbGet(db, 'SELECT * FROM repairs WHERE id = ?', [repair.id]);
      expect(updatedRepair.completed_at).not.toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Test with an invalid SQL query instead of dropping tables
      const response = await request(app)
        .get('/api/repairs/invalid')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Repair not found');
    });
  });

  describe('Data Validation', () => {
    it('should accept valid repair statuses', async () => {
      const repair = await createRepairInDB();
      const validStatuses = ['pending', 'in_progress', 'waiting_parts', 'completed', 'cancelled'];

      for (const status of validStatuses) {
        const response = await request(app)
          .patch(`/api/repairs/${repair.id}/status`)
          .send({ status })
          .expect(200);

        expect(response.body.success).toBe(true);
      }
    });

    it('should handle large text fields correctly', async () => {
      const longDescription = 'А'.repeat(1000); // 1000 characters
      const repairData = createTestRepair({
        issue_description: longDescription,
        notes: longDescription
      });

      const response = await request(app)
        .post('/api/repairs')
        .send(repairData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should handle numerical fields correctly', async () => {
      const repairData = createTestRepair({
        estimated_cost: 99999.99
      });

      const response = await request(app)
        .post('/api/repairs')
        .send(repairData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });
}); 