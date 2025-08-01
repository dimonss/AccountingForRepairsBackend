import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { getDatabase } from '../database/init';

// Extend Request interface
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        email: string;
        role: string;
        full_name: string;
      };
    }
  }
}

// Helper function for database queries
function dbGet(db: any, query: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err: any, row: any) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Middleware to verify JWT access token
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Access token required' 
      });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET not configured');
      return res.status(500).json({ 
        success: false, 
        error: 'Server configuration error' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, jwtSecret) as any;
    
    // Check if this is an access token
    if (decoded.type !== 'access') {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token type' 
      });
    }
    
    // Get user from database
    const db = getDatabase();
    const user = await dbGet(db, `
      SELECT id, username, email, role, full_name, is_active 
      FROM users 
      WHERE id = ?
    `, [decoded.userId]);

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    if (!user.is_active) {
      return res.status(401).json({ 
        success: false, 
        error: 'Account deactivated' 
      });
    }

    // Add user to request object
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      full_name: user.full_name
    };

    next();
  } catch (error: any) {
    console.log('🔍 [Middleware] JWT Error:', error.constructor.name, error.message);
    
    if (error instanceof jwt.TokenExpiredError) {
      console.log('⏰ [Middleware] Token expired');
      return res.status(401).json({ 
        success: false, 
        error: 'Access token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error instanceof jwt.JsonWebTokenError) {
      console.log('❌ [Middleware] Invalid token:', error.message);
      return res.status(401).json({
        success: false, 
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    
    console.error('🚨 [Middleware] Authentication error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Authentication failed' 
    });
  }
};

// Middleware to check user roles
export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Insufficient permissions' 
      });
    }

    next();
  };
};

// Middleware to check if user is admin
export const requireAdmin = requireRole(['admin']);

// Middleware to check if user is admin or manager
export const requireManagerOrAdmin = requireRole(['admin', 'manager']); 