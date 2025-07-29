import request from 'supertest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRoutes from '../routes/auth';
import { TEST_ADMIN, getTestAdminAuth, createTestEmployee } from './testUtils';

// Create test app
const createApp = () => {
  const app = express();
  
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  app.use('/api/auth', authRoutes);
  
  return app;
};

describe('Authentication API Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = createApp();
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: TEST_ADMIN.username,
          password: TEST_ADMIN.password
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.username).toBe(TEST_ADMIN.username);
      expect(response.body.data.user.email).toBe(TEST_ADMIN.email);
      expect(response.body.data.user.role).toBe(TEST_ADMIN.role);
      expect(response.body.data.user).not.toHaveProperty('password_hash');
    });

    it('should login with email instead of username', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: TEST_ADMIN.email, // Using email as username
          password: TEST_ADMIN.password
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(TEST_ADMIN.email);
    });

    it('should reject login with incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: TEST_ADMIN.username,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should reject login with non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent',
          password: 'password123'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should require username and password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: TEST_ADMIN.username
          // Missing password
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Username and password are required');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user info with valid token', async () => {
      const { authHeader } = await getTestAdminAuth();

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.username).toBe(TEST_ADMIN.username);
      expect(response.body.data.user.role).toBe(TEST_ADMIN.role);
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Access token required');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid token');
    });
  });

  describe('POST /api/auth/register', () => {
    it('should create new user successfully (admin only)', async () => {
      const { authHeader } = await getTestAdminAuth();

      const newUser = {
        username: 'newuser',
        email: 'newuser@test.com',
        password: 'password123',
        full_name: 'New Test User',
        role: 'employee'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .set('Authorization', authHeader)
        .send(newUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.username).toBe(newUser.username);
      expect(response.body.data.email).toBe(newUser.email);
      expect(response.body.data.role).toBe(newUser.role);
      expect(response.body.data).toHaveProperty('id');
    });

    it('should reject registration without admin role', async () => {
      const { authHeader } = await createTestEmployee();

      const newUser = {
        username: 'newuser2',
        email: 'newuser2@test.com',
        password: 'password123',
        full_name: 'New Test User 2',
        role: 'employee'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .set('Authorization', authHeader)
        .send(newUser)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should reject registration with missing fields', async () => {
      const { authHeader } = await getTestAdminAuth();

      const incompleteUser = {
        username: 'incomplete',
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/auth/register')
        .set('Authorization', authHeader)
        .send(incompleteUser)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Username, email, password, and full name are required');
    });

    it('should reject registration with weak password', async () => {
      const { authHeader } = await getTestAdminAuth();

      const userWithWeakPassword = {
        username: 'weakpass',
        email: 'weakpass@test.com',
        password: '123', // Too short
        full_name: 'Weak Password User',
        role: 'employee'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .set('Authorization', authHeader)
        .send(userWithWeakPassword)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Password must be at least 6 characters long');
    });

    it('should reject registration with invalid role', async () => {
      const { authHeader } = await getTestAdminAuth();

      const userWithInvalidRole = {
        username: 'invalidrole',
        email: 'invalidrole@test.com',
        password: 'password123',
        full_name: 'Invalid Role User',
        role: 'superuser' // Invalid role
      };

      const response = await request(app)
        .post('/api/auth/register')
        .set('Authorization', authHeader)
        .send(userWithInvalidRole)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid role. Must be admin, manager, or employee');
    });
  });

  describe('GET /api/auth/users', () => {
    it('should return all users for admin', async () => {
      const { authHeader } = await getTestAdminAuth();

      const response = await request(app)
        .get('/api/auth/users')
        .set('Authorization', authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      // Check that the admin user is in the list
      const adminUser = response.body.data.find((user: any) => user.username === TEST_ADMIN.username);
      expect(adminUser).toBeDefined();
      expect(adminUser).not.toHaveProperty('password_hash');
    });

    it('should reject request from non-admin user', async () => {
      const { authHeader } = await createTestEmployee();

      const response = await request(app)
        .get('/api/auth/users')
        .set('Authorization', authHeader)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Insufficient permissions');
    });
  });

  describe('POST /api/auth/change-password', () => {
    it('should change password successfully', async () => {
      // Create a test employee to change password for
      const { authHeader, user } = await createTestEmployee({
        username: 'changepasstest',
        password: 'oldpassword123'
      });

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', authHeader)
        .send({
          currentPassword: 'oldpassword123',
          newPassword: 'newpassword123'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password changed successfully');

      // Try to login with new password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: user.username,
          password: 'newpassword123'
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
    });

    it('should reject with incorrect current password', async () => {
      const { authHeader } = await createTestEmployee({
        username: 'wrongcurrentpass',
        password: 'correctpassword'
      });

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', authHeader)
        .send({
          currentPassword: 'wrongpassword',
          newPassword: 'newpassword123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Current password is incorrect');
    });

    it('should reject weak new password', async () => {
      const { authHeader } = await createTestEmployee({
        username: 'weaknewpass',
        password: 'oldpassword123'
      });

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', authHeader)
        .send({
          currentPassword: 'oldpassword123',
          newPassword: '123' // Too short
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('New password must be at least 6 characters long');
    });
  });
}); 