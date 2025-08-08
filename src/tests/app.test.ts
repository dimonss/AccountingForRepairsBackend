import request from 'supertest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import repairRoutes from '../routes/repairs';
import authRoutes from '../routes/auth';
import { createRepairInDB, createTestRepair, dbGet, getTestAdminAuth, createTestEmployee } from './testUtils';
import { getDatabase } from '../database/init';

// Create test app with authentication
const createApp = () => {
  const app = express();
  
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  app.use('/auth', authRoutes);
  app.use('/repairs', repairRoutes);
  
  app.get('/health', (req, res) => {
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
        .get('/health')
        .expect(200);

      expect(response.body).toEqual({
        status: 'OK',
        message: 'Server is running'
      });
    });
  });

  describe('Authentication Required', () => {
    it('should reject unauthenticated requests to repairs endpoints', async () => {
      const response = await request(app)
        .get('/repairs')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access token required');
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/repairs')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid token');
    });
  });

  describe('GET /repairs', () => {
    it('should return empty array when no repairs exist', async () => {
      const { authHeader } = await getTestAdminAuth();

      const response = await request(app)
        .get('/repairs')
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: [],
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 0
        }
      });
    });

    it('should return all repairs with user information when they exist', async () => {
      const { authHeader, user } = await getTestAdminAuth();

      // Create test repairs
      await createRepairInDB({ client_name: 'Клиент 1' }, user.id);
      await createRepairInDB({ client_name: 'Клиент 2' }, user.id);

      const response = await request(app)
        .get('/repairs')
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      // В тестовой базе только записи, созданные в тестах
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 50,
        total: 2,
        totalPages: 1
      });
      expect(response.body.data[0]).toHaveProperty('id');
      expect(response.body.data[0]).toHaveProperty('client_name');
      expect(response.body.data[0]).toHaveProperty('created_at');
      expect(response.body.data[0]).toHaveProperty('created_by_username');
      expect(response.body.data[0]).toHaveProperty('created_by_name');
      expect(response.body.data[0].created_by_username).toBe(user.username);
    });

    it('should filter repairs by search term', async () => {
      const { authHeader, user } = await getTestAdminAuth();

      // Create test repairs with different names
      await createRepairInDB({ client_name: 'Иван Петров' }, user.id);
      await createRepairInDB({ client_name: 'Мария Сидорова' }, user.id);
      await createRepairInDB({ client_name: 'Алексей Козлов' }, user.id);

      const response = await request(app)
        .get('/repairs?search=Иван')
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].client_name).toBe('Иван Петров');
      expect(response.body.pagination.total).toBe(1);
    });

    it('should filter repairs by status', async () => {
      const { authHeader, user } = await getTestAdminAuth();

      // Create test repairs with different statuses
      await createRepairInDB({ client_name: 'Клиент 1', repair_status: 'pending' }, user.id);
      await createRepairInDB({ client_name: 'Клиент 2', repair_status: 'completed' }, user.id);
      await createRepairInDB({ client_name: 'Клиент 3', repair_status: 'pending' }, user.id);

      const response = await request(app)
        .get('/repairs?status=pending')
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      // Check that all returned repairs have pending status
      expect(response.body.data.every((repair: any) => repair.repair_status === 'pending')).toBe(true);
      // Check that we have at least 2 pending repairs (our new ones)
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
      expect(response.body.pagination.total).toBeGreaterThanOrEqual(2);
    });

    it('should search by serial number and repair number', async () => {
      const { authHeader, user } = await getTestAdminAuth();

      // Create test repairs with serial and repair numbers
      await createRepairInDB({ 
        client_name: 'Клиент 1', 
        serial_number: 'ABC123456',
        repair_number: '123456'
      }, user.id);
      await createRepairInDB({ 
        client_name: 'Клиент 2', 
        serial_number: 'XYZ789012',
        repair_number: '789012'
      }, user.id);

      // Search by serial number
      const serialResponse = await request(app)
        .get('/repairs?search=ABC123')
        .set('Authorization', authHeader)
        .expect(200);

      expect(serialResponse.body.success).toBe(true);
      expect(serialResponse.body.data).toHaveLength(1);
      expect(serialResponse.body.data[0].serial_number).toBe('ABC123456');

      // Search by repair number
      const repairResponse = await request(app)
        .get('/repairs?search=789012')
        .set('Authorization', authHeader)
        .expect(200);

      expect(repairResponse.body.success).toBe(true);
      expect(repairResponse.body.data).toHaveLength(1);
      expect(repairResponse.body.data[0].repair_number).toBe('789012');
    });

    it('should support pagination', async () => {
      const { authHeader, user } = await getTestAdminAuth();

      // Create test repairs
      await createRepairInDB({ client_name: 'Клиент 1' }, user.id);
      await createRepairInDB({ client_name: 'Клиент 2' }, user.id);

      const response = await request(app)
        .get('/repairs?page=1&limit=2')
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 2,
        totalPages: 1
      });
    });
  });

  describe('GET /repairs/:id', () => {
    it('should return specific repair by id with user information', async () => {
      const { authHeader, user } = await getTestAdminAuth();
      const repair = await createRepairInDB({ client_name: 'Тест Клиент' }, user.id);

      const response = await request(app)
        .get(`/repairs/${repair.id}`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(repair.id);
      expect(response.body.data.client_name).toBe('Тест Клиент');
      expect(response.body.data.created_by_username).toBe(user.username);
      expect(response.body.data.created_by_name).toBe(user.full_name);
    });

    it('should return 404 for non-existent repair', async () => {
      const { authHeader } = await getTestAdminAuth();

      const response = await request(app)
        .get('/repairs/999')
        .set('Authorization', authHeader)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Repair not found');
    });
  });

  describe('POST /repairs', () => {
    it('should create new repair successfully and track creator', async () => {
      const { authHeader, user } = await getTestAdminAuth();
      const newRepair = createTestRepair({
        client_name: 'Новый Клиент',
        device_type: 'laptop'
      });

      const response = await request(app)
        .post('/repairs')
        .set('Authorization', authHeader)
        .send(newRepair)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.message).toBe('Repair created successfully');

      // Verify repair was created in database with correct user tracking
      const db = getDatabase();
      const createdRepair = await dbGet(db, 'SELECT * FROM repairs WHERE id = ?', [response.body.data.id]);
      expect(createdRepair.client_name).toBe('Новый Клиент');
      expect(createdRepair.device_type).toBe('laptop');
      expect(createdRepair.created_by).toBe(user.id);
    });

    it('should return 400 for missing required fields', async () => {
      const { authHeader } = await getTestAdminAuth();
      const incompleteRepair = {
        device_type: 'smartphone',
        brand: 'Apple'
        // Missing other required fields
      };

      const response = await request(app)
        .post('/repairs')
        .set('Authorization', authHeader)
        .send(incompleteRepair)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Missing required fields');
    });

    it('should handle optional fields correctly', async () => {
      const { authHeader } = await getTestAdminAuth();
      const repairWithOptionalFields = createTestRepair({
        serial_number: null,
        client_email: null,
        notes: null
      });

      const response = await request(app)
        .post('/repairs')
        .set('Authorization', authHeader)
        .send(repairWithOptionalFields)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('PUT /repairs/:id', () => {
    it('should update existing repair successfully (admin/manager only)', async () => {
      const { authHeader, user } = await getTestAdminAuth();
      const repair = await createRepairInDB({}, user.id);
      
      const updates = {
        ...createTestRepair(),
        client_name: 'Обновленный Клиент',
        repair_status: 'in_progress',
        actual_cost: 15000
      };

      const response = await request(app)
        .put(`/repairs/${repair.id}`)
        .set('Authorization', authHeader)
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

    it('should reject update from employee role', async () => {
      const { authHeader: adminAuth, user: adminUser } = await getTestAdminAuth();
      const { authHeader: employeeAuth } = await createTestEmployee();
      
      const repair = await createRepairInDB({}, adminUser.id);
      const updates = createTestRepair({ client_name: 'Should Not Update' });

      const response = await request(app)
        .put(`/repairs/${repair.id}`)
        .set('Authorization', employeeAuth)
        .send(updates)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should return 404 for non-existent repair', async () => {
      const { authHeader } = await getTestAdminAuth();
      const updates = createTestRepair();

      const response = await request(app)
        .put('/repairs/999')
        .set('Authorization', authHeader)
        .send(updates)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Repair not found');
    });

    it('should set completed_at when status changes to completed', async () => {
      const { authHeader, user } = await getTestAdminAuth();
      const repair = await createRepairInDB({}, user.id);
      
      const updates = {
        ...createTestRepair(),
        repair_status: 'completed'
      };

      await request(app)
        .put(`/repairs/${repair.id}`)
        .set('Authorization', authHeader)
        .send(updates)
        .expect(200);

      // Verify completed_at is set
      const db = getDatabase();
      const updatedRepair = await dbGet(db, 'SELECT * FROM repairs WHERE id = ?', [repair.id]);
      expect(updatedRepair.completed_at).not.toBeNull();
    });
  });

  describe('DELETE /repairs/:id', () => {
    it('should delete existing repair successfully (admin/manager only)', async () => {
      const { authHeader, user } = await getTestAdminAuth();
      const repair = await createRepairInDB({}, user.id);

      const response = await request(app)
        .delete(`/repairs/${repair.id}`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Repair deleted successfully');

      // Verify repair was deleted
      const db = getDatabase();
      const deletedRepair = await dbGet(db, 'SELECT * FROM repairs WHERE id = ?', [repair.id]);
      expect(deletedRepair).toBeUndefined();
    });

    it('should reject deletion from employee role', async () => {
      const { authHeader: adminAuth, user: adminUser } = await getTestAdminAuth();
      const { authHeader: employeeAuth } = await createTestEmployee();
      
      const repair = await createRepairInDB({}, adminUser.id);

      const response = await request(app)
        .delete(`/repairs/${repair.id}`)
        .set('Authorization', employeeAuth)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should return 404 for non-existent repair', async () => {
      const { authHeader } = await getTestAdminAuth();

      const response = await request(app)
        .delete('/repairs/999')
        .set('Authorization', authHeader)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Repair not found');
    });
  });

  describe('PATCH /repairs/:id/status', () => {
    it('should update repair status successfully and track user', async () => {
      const { authHeader, user } = await getTestAdminAuth();
      const repair = await createRepairInDB({ repair_status: 'pending' }, user.id);

      const statusUpdate = {
        status: 'in_progress',
        notes: 'Начинаем работу'
      };

      const response = await request(app)
        .patch(`/repairs/${repair.id}/status`)
        .set('Authorization', authHeader)
        .send(statusUpdate)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Repair status updated successfully');

      // Verify status was updated
      const db = getDatabase();
      const updatedRepair = await dbGet(db, 'SELECT * FROM repairs WHERE id = ?', [repair.id]);
      expect(updatedRepair.repair_status).toBe('in_progress');

      // Verify status history was created with user tracking
      const statusHistory = await dbGet(db, 'SELECT * FROM repair_status_history WHERE repair_id = ?', [repair.id]);
      expect(statusHistory.old_status).toBe('pending');
      expect(statusHistory.new_status).toBe('in_progress');
      expect(statusHistory.notes).toBe('Начинаем работу');
      expect(statusHistory.changed_by).toBe(user.id);
    });

    it('should return 400 for missing status', async () => {
      const { authHeader, user } = await getTestAdminAuth();
      const repair = await createRepairInDB({}, user.id);

      const response = await request(app)
        .patch(`/repairs/${repair.id}/status`)
        .set('Authorization', authHeader)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Status is required');
    });

    it('should return 404 for non-existent repair', async () => {
      const { authHeader } = await getTestAdminAuth();

      const response = await request(app)
        .patch('/repairs/999/status')
        .set('Authorization', authHeader)
        .send({ status: 'completed' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Repair not found');
    });

    it('should set completed_at when status changes to completed', async () => {
      const { authHeader, user } = await getTestAdminAuth();
      const repair = await createRepairInDB({ repair_status: 'in_progress' }, user.id);

      await request(app)
        .patch(`/repairs/${repair.id}/status`)
        .set('Authorization', authHeader)
        .send({ status: 'completed' })
        .expect(200);

      // Verify completed_at is set
      const db = getDatabase();
      const updatedRepair = await dbGet(db, 'SELECT * FROM repairs WHERE id = ?', [repair.id]);
      expect(updatedRepair.completed_at).not.toBeNull();
    });
  });

  describe('GET /repairs/:id/history', () => {
    it('should return repair status history with user information', async () => {
      const { authHeader, user } = await getTestAdminAuth();
      const repair = await createRepairInDB({ repair_status: 'pending' }, user.id);

      // Update status to create history
      await request(app)
        .patch(`/repairs/${repair.id}/status`)
        .set('Authorization', authHeader)
        .send({ status: 'in_progress', notes: 'Test history' });

      const response = await request(app)
        .get(`/repairs/${repair.id}/history`)
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].old_status).toBe('pending');
      expect(response.body.data[0].new_status).toBe('in_progress');
      expect(response.body.data[0].notes).toBe('Test history');
      expect(response.body.data[0].username).toBe(user.username);
      expect(response.body.data[0].full_name).toBe(user.full_name);
    });
  });

  describe('Data Validation', () => {
    it('should accept valid repair statuses', async () => {
      const { authHeader, user } = await getTestAdminAuth();
      const validStatuses = ['pending', 'in_progress', 'waiting_parts', 'completed', 'cancelled'];

      // Create a separate repair for each status test to avoid conflicts
      for (let i = 0; i < validStatuses.length; i++) {
        const repair = await createRepairInDB({}, user.id);
        const status = validStatuses[i];
        
        const response = await request(app)
          .patch(`/repairs/${repair.id}/status`)
          .set('Authorization', authHeader)
          .send({ status })
          .expect(200);

        expect(response.body.success).toBe(true);
        
        // Verify the status was actually updated
        const db = getDatabase();
        const updatedRepair = await dbGet(db, 'SELECT repair_status FROM repairs WHERE id = ?', [repair.id]);
        expect(updatedRepair.repair_status).toBe(status);
      }
    });

    it('should handle large text fields correctly', async () => {
      const { authHeader } = await getTestAdminAuth();
      const longDescription = 'А'.repeat(1000); // 1000 characters
      const repairData = createTestRepair({
        issue_description: longDescription,
        notes: longDescription
      });

      const response = await request(app)
        .post('/repairs')
        .set('Authorization', authHeader)
        .send(repairData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should handle numerical fields correctly', async () => {
      const { authHeader } = await getTestAdminAuth();
      const repairData = createTestRepair({
        estimated_cost: 99999.99
      });

      const response = await request(app)
        .post('/repairs')
        .set('Authorization', authHeader)
        .send(repairData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });
}); 