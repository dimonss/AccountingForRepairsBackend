import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getDatabase } from '../database/init';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// Helper functions for database operations
function dbGet(db: any, query: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err: any, row: any) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbRun(db: any, query: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(this: any, err: any) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function dbAll(db: any, query: string, params: any[] = []): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err: any, rows: any[]) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Generate JWT access token (short-lived)
const generateAccessToken = (userId: number): string => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET not configured');
  }
  
  return jwt.sign(
    { userId, type: 'access' },
    jwtSecret,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' } as jwt.SignOptions
  );
};

// Generate refresh token (long-lived)
const generateRefreshToken = (): string => {
  return crypto.randomBytes(64).toString('hex');
};

// Hash refresh token for storage
const hashRefreshToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Store refresh token in database
const storeRefreshToken = async (userId: number, refreshToken: string, userAgent?: string, ipAddress?: string) => {
  const db = getDatabase();
  const tokenHash = hashRefreshToken(refreshToken);
  
  // Use environment variable instead of hardcoded 30 days
  const refreshTokenExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '2m'; // 2 minutes for testing
  const expiresAt = new Date(Date.now() + parseTokenExpiry(refreshTokenExpiresIn));

  await dbRun(db, `
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address)
    VALUES (?, ?, ?, ?, ?)
  `, [userId, tokenHash, expiresAt.toISOString(), userAgent || null, ipAddress || null]);

  return refreshToken;
};

// Helper function to parse token expiry (like '30s', '15m', '1h', '7d') to milliseconds
const parseTokenExpiry = (expiry: string): number => {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) {
    return 15 * 60 * 1000; // 15 minutes default
  }
  
  const [, amount, unit] = match;
  const num = parseInt(amount);
  
  switch (unit) {
    case 's': return num * 1000;           // seconds
    case 'm': return num * 60 * 1000;      // minutes  
    case 'h': return num * 60 * 60 * 1000; // hours
    case 'd': return num * 24 * 60 * 60 * 1000; // days
    default: return 15 * 60 * 1000; // 15 minutes default
  }
};

// Clean up expired refresh tokens
const cleanupExpiredTokens = async () => {
  const db = getDatabase();
  await dbRun(db, `
    DELETE FROM refresh_tokens 
    WHERE expires_at < datetime('now') OR is_revoked = 1
  `);
};

// POST /api/auth/register - Register new user (admin only)
router.post('/register', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { username, email, password, full_name, role = 'employee' } = req.body;

    // Validate required fields
    if (!username || !email || !password || !full_name) {
      return res.status(400).json({
        success: false,
        error: 'Username, email, password, and full name are required'
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    // Validate role
    const validRoles = ['admin', 'manager', 'employee'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be admin, manager, or employee'
      });
    }

    const db = getDatabase();

    // Check if user already exists
    const existingUser = await dbGet(db, `
      SELECT id FROM users WHERE username = ? OR email = ?
    `, [username, email]);

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this username or email already exists'
      });
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await dbRun(db, `
      INSERT INTO users (username, email, password_hash, full_name, role)
      VALUES (?, ?, ?, ?, ?)
    `, [username, email, passwordHash, full_name, role]);

    res.status(201).json({
      success: true,
      data: {
        id: result.lastID,
        username,
        email,
        full_name,
        role,
        message: 'User created successfully'
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
});

// POST /api/auth/login - Login user
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
    }

    const db = getDatabase();

    // Find user by username or email
    const user = await dbGet(db, `
      SELECT id, username, email, password_hash, full_name, role, is_active
      FROM users 
      WHERE (username = ? OR email = ?) AND is_active = 1
    `, [username, username]);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Clean up old tokens for this user (optional: keep only latest N tokens)
    await dbRun(db, `
      DELETE FROM refresh_tokens 
      WHERE user_id = ? AND (expires_at < datetime('now') OR is_revoked = 1)
    `, [user.id]);

    // Update last login
    await dbRun(db, `
      UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?
    `, [user.id]);

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken();

    // Store refresh token
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress;
    await storeRefreshToken(user.id, refreshToken, userAgent, ipAddress);

    // Calculate expiration times
    const accessTokenExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '30s';
    const refreshTokenExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '2m'; // 2 minutes for testing
    
    // Calculate actual expiration timestamps
    const now = Date.now();
    const accessExpiresAt = new Date(now + parseTokenExpiry(accessTokenExpiresIn));
    const refreshExpiresAt = new Date(now + parseTokenExpiry(refreshTokenExpiresIn));

    res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          role: user.role
        },
        expiresIn: {
          accessToken: accessTokenExpiresIn,
          refreshToken: refreshTokenExpiresIn,
          accessExpiresAt: accessExpiresAt.toISOString(),
          refreshExpiresAt: refreshExpiresAt.toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// POST /api/auth/refresh - Refresh tokens
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token required'
      });
    }

    const db = getDatabase();
    const tokenHash = hashRefreshToken(refreshToken);

    // Find refresh token first
    const storedToken = await dbGet(db, `
      SELECT rt.*, u.id as user_id, u.username, u.email, u.full_name, u.role, u.is_active
      FROM refresh_tokens rt
      JOIN users u ON rt.user_id = u.id
      WHERE rt.token_hash = ? AND rt.is_revoked = 0 AND u.is_active = 1
    `, [tokenHash]);

    console.log('🔍 [Refresh Debug] Current time:', new Date().toISOString());
    console.log('🔍 [Refresh Debug] Token info:', storedToken ? {
      expires_at: storedToken.expires_at,
      created_at: storedToken.created_at,
      is_revoked: storedToken.is_revoked
    } : 'Token not found');

    if (!storedToken) {
      console.log('🚫 [Refresh] Token not found in database');
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token'
      });
    }

    // Check expiration using JavaScript Date comparison
    const tokenExpiresAt = new Date(storedToken.expires_at);
    const currentTime = new Date();
    
    console.log('🔍 [Refresh Debug] Token expires at:', tokenExpiresAt.toISOString());
    console.log('🔍 [Refresh Debug] Current time:', currentTime.toISOString());
    console.log('🔍 [Refresh Debug] Is expired?', currentTime > tokenExpiresAt);

    if (currentTime > tokenExpiresAt) {
      console.log('🚫 [Refresh] Token expired via JavaScript check');
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired refresh token'
      });
    }

    // REFRESH TOKEN ROTATION: Revoke the old refresh token
    await dbRun(db, `
      UPDATE refresh_tokens 
      SET is_revoked = 1, last_used_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [storedToken.id]);

    // Generate new access token
    const newAccessToken = generateAccessToken(storedToken.user_id);
    
    // Generate new refresh token
    const newRefreshToken = generateRefreshToken();

    // Store the new refresh token
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.connection.remoteAddress;
    await storeRefreshToken(storedToken.user_id, newRefreshToken, userAgent, ipAddress);

    // Calculate expiration times for response
    const accessTokenExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || '30s';
    const refreshTokenExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '2m'; // 2 minutes for testing
    
    const now = Date.now();
    const accessExpiresAt = new Date(now + parseTokenExpiry(accessTokenExpiresIn));
    const refreshExpiresAt = new Date(now + parseTokenExpiry(refreshTokenExpiresIn));

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: {
          id: storedToken.user_id,
          username: storedToken.username,
          email: storedToken.email,
          full_name: storedToken.full_name,
          role: storedToken.role
        },
        expiresIn: {
          accessToken: accessTokenExpiresIn,
          refreshToken: refreshTokenExpiresIn,
          accessExpiresAt: accessExpiresAt.toISOString(),
          refreshExpiresAt: refreshExpiresAt.toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Token refresh failed'
    });
  }
});

// POST /api/auth/logout - Logout user (revoke refresh token)
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      const db = getDatabase();
      const tokenHash = hashRefreshToken(refreshToken);

      // Revoke the refresh token
      await dbRun(db, `
        UPDATE refresh_tokens 
        SET is_revoked = 1 
        WHERE token_hash = ?
      `, [tokenHash]);
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

// POST /api/auth/logout-all - Logout from all devices
router.post('/logout-all', authenticateToken, async (req: Request, res: Response) => {
  try {
    const db = getDatabase();

    // Revoke all refresh tokens for this user
    await dbRun(db, `
      UPDATE refresh_tokens 
      SET is_revoked = 1 
      WHERE user_id = ?
    `, [req.user!.id]);

    res.json({
      success: true,
      message: 'Logged out from all devices successfully'
    });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout all failed'
    });
  }
});

// GET /api/auth/sessions - Get active sessions (refresh tokens)
router.get('/sessions', authenticateToken, async (req: Request, res: Response) => {
  try {
    const db = getDatabase();

    const sessions = await dbAll(db, `
      SELECT id, created_at, last_used_at, user_agent, ip_address
      FROM refresh_tokens 
      WHERE user_id = ? AND expires_at > datetime('now') AND is_revoked = 0
      ORDER BY last_used_at DESC
    `, [req.user!.id]);

    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sessions'
    });
  }
});

// DELETE /api/auth/sessions/:id - Revoke specific session
router.delete('/sessions/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const sessionId = parseInt(req.params.id);
    const db = getDatabase();

    const result = await dbRun(db, `
      UPDATE refresh_tokens 
      SET is_revoked = 1 
      WHERE id = ? AND user_id = ?
    `, [sessionId, req.user!.id]);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    res.json({
      success: true,
      message: 'Session revoked successfully'
    });
  } catch (error) {
    console.error('Revoke session error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke session'
    });
  }
});

// GET /api/auth/me - Get current user info
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user information'
    });
  }
});

// GET /api/auth/users - Get all users (admin only)
router.get('/users', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    
    const users = await dbAll(db, `
      SELECT id, username, email, full_name, role, is_active, created_at, last_login
      FROM users 
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get users'
    });
  }
});

// PUT /api/auth/users/:id - Update user (admin only)
router.put('/users/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { full_name, role, is_active } = req.body;
    const userId = parseInt(req.params.id);

    if (!full_name || !role || is_active === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Full name, role, and active status are required'
      });
    }

    // Validate role
    const validRoles = ['admin', 'manager', 'employee'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role'
      });
    }

    const db = getDatabase();

    const result = await dbRun(db, `
      UPDATE users 
      SET full_name = ?, role = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [full_name, role, is_active ? 1 : 0, userId]);

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user'
    });
  }
});

// POST /api/auth/change-password - Change password
router.post('/change-password', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters long'
      });
    }

    const db = getDatabase();

    // Get user's current password hash
    const user = await dbGet(db, `
      SELECT password_hash FROM users WHERE id = ?
    `, [req.user!.id]);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await dbRun(db, `
      UPDATE users 
      SET password_hash = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [newPasswordHash, req.user!.id]);

    // Revoke all refresh tokens to force re-login on all devices
    await dbRun(db, `
      UPDATE refresh_tokens 
      SET is_revoked = 1 
      WHERE user_id = ?
    `, [req.user!.id]);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password'
    });
  }
});

// Background job to clean up expired tokens (should be run periodically)
const startTokenCleanup = () => {
  const cleanup = setInterval(async () => {
    try {
      await cleanupExpiredTokens();
      console.log('Cleaned up expired refresh tokens');
    } catch (error) {
      console.error('Token cleanup error:', error);
    }
  }, 60 * 60 * 1000); // Run every hour
  
  // Store reference to clear interval in tests
  (global as any).tokenCleanupInterval = cleanup;
  return cleanup;
};

// Start cleanup when module loads (but not in test environment)
if (process.env.NODE_ENV !== 'test') {
  startTokenCleanup();
}

export default router; 