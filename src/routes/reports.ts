import { Router, Request, Response } from 'express';
import { getDatabase } from '../database/init';
import { authenticateToken } from '../middleware/auth';
import sqlite3 from 'sqlite3';

const router = Router();

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

// GET /reports/overview - Get overview statistics
router.get('/overview', authenticateToken, async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { dateRange = 'month' } = req.query;
    
    // Apply date filtering based on dateRange
    let dateFilter: string;
    switch (dateRange) {
      case 'week':
        dateFilter = 'WHERE r.created_at >= datetime("now", "-7 days")';
        break;
      case 'month':
        dateFilter = 'WHERE r.created_at >= datetime("now", "-1 month")';
        break;
      case 'quarter':
        dateFilter = 'WHERE r.created_at >= datetime("now", "-3 months")';
        break;
      case 'year':
        dateFilter = 'WHERE r.created_at >= datetime("now", "-1 year")';
        break;
      default:
        dateFilter = 'WHERE r.created_at >= datetime("now", "-1 month")';
    }
    
    // Get status counts
    const statusQuery = `
      SELECT 
        repair_status,
        COUNT(*) as count
      FROM repairs r
      ${dateFilter}
      GROUP BY repair_status
    `;
    
    const statusStats = await dbAll(db, statusQuery);
    
    // Get total count
    const totalQuery = `
      SELECT COUNT(*) as total
      FROM repairs r
      ${dateFilter}
    `;
    
    const totalResult = await dbGet(db, totalQuery);
    const total = totalResult.total;
    
    // Calculate completion rate
    const completedCount = statusStats.find((stat: any) => stat.repair_status === 'completed')?.count || 0;
    const completionRate = total > 0 ? (completedCount / total) * 100 : 0;
    
    // Format response
    const stats = {
      total,
      pending: statusStats.find((stat: any) => stat.repair_status === 'pending')?.count || 0,
      inProgress: statusStats.find((stat: any) => stat.repair_status === 'in_progress')?.count || 0,
      completed: completedCount,
      cancelled: statusStats.find((stat: any) => stat.repair_status === 'cancelled')?.count || 0,
      waitingParts: statusStats.find((stat: any) => stat.repair_status === 'waiting_parts')?.count || 0,
      completionRate: Math.round(completionRate)
    };
    
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching overview stats:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /reports/devices - Get device type statistics
router.get('/devices', authenticateToken, async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { dateRange = 'month' } = req.query;
    
    // Apply date filtering
    let dateFilter: string;
    switch (dateRange) {
      case 'week':
        dateFilter = 'WHERE r.created_at >= datetime("now", "-7 days")';
        break;
      case 'month':
        dateFilter = 'WHERE r.created_at >= datetime("now", "-1 month")';
        break;
      case 'quarter':
        dateFilter = 'WHERE r.created_at >= datetime("now", "-3 months")';
        break;
      case 'year':
        dateFilter = 'WHERE r.created_at >= datetime("now", "-1 year")';
        break;
      default:
        dateFilter = 'WHERE r.created_at >= datetime("now", "-1 month")';
    }
    
    const deviceQuery = `
      SELECT 
        device_type,
        COUNT(*) as count
      FROM repairs r
      ${dateFilter}
      GROUP BY device_type
      ORDER BY count DESC
    `;
    
    const deviceStats = await dbAll(db, deviceQuery);
    
    res.json({ success: true, data: deviceStats });
  } catch (error) {
    console.error('Error fetching device stats:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /reports/brands - Get brand statistics
router.get('/brands', authenticateToken, async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { dateRange = 'month' } = req.query;
    
    // Apply date filtering
    let dateFilter: string;
    switch (dateRange) {
      case 'week':
        dateFilter = 'WHERE r.created_at >= datetime("now", "-7 days")';
        break;
      case 'month':
        dateFilter = 'WHERE r.created_at >= datetime("now", "-1 month")';
        break;
      case 'quarter':
        dateFilter = 'WHERE r.created_at >= datetime("now", "-3 months")';
        break;
      case 'year':
        dateFilter = 'WHERE r.created_at >= datetime("now", "-1 year")';
        break;
      default:
        dateFilter = 'WHERE r.created_at >= datetime("now", "-1 month")';
    }
    
    const brandQuery = `
      SELECT 
        brand,
        COUNT(*) as count
      FROM repairs r
      ${dateFilter}
      GROUP BY brand
      ORDER BY count DESC
    `;
    
    const brandStats = await dbAll(db, brandQuery);
    
    res.json({ success: true, data: brandStats });
  } catch (error) {
    console.error('Error fetching brand stats:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /reports/monthly - Get monthly statistics
router.get('/monthly', authenticateToken, async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { dateRange = 'year' } = req.query;
    
    let monthsBack = 12; // Default to 12 months
    
    // Adjust based on dateRange
    switch (dateRange) {
      case 'week':
        monthsBack = 1;
        break;
      case 'month':
        monthsBack = 3;
        break;
      case 'quarter':
        monthsBack = 6;
        break;
      case 'year':
        monthsBack = 12;
        break;
    }
    
    const monthlyQuery = `
      SELECT 
        strftime('%Y-%m', r.created_at) as month,
        COUNT(*) as count
      FROM repairs r
      WHERE r.created_at >= datetime("now", "-${monthsBack} months")
      GROUP BY month
      ORDER BY month ASC
    `;
    
    const monthlyStats = await dbAll(db, monthlyQuery);
    
    res.json({ success: true, data: monthlyStats });
  } catch (error) {
    console.error('Error fetching monthly stats:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /reports/financial - Get financial statistics
router.get('/financial', authenticateToken, async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { dateRange = 'month' } = req.query;
    
    // Apply date filtering
    let dateFilter: string;
    switch (dateRange) {
      case 'week':
        dateFilter = 'WHERE r.created_at >= datetime("now", "-7 days")';
        break;
      case 'month':
        dateFilter = 'WHERE r.created_at >= datetime("now", "-1 month")';
        break;
      case 'quarter':
        dateFilter = 'WHERE r.created_at >= datetime("now", "-3 months")';
        break;
      case 'year':
        dateFilter = 'WHERE r.created_at >= datetime("now", "-1 year")';
        break;
      default:
        dateFilter = 'WHERE r.created_at >= datetime("now", "-1 month")';
    }
    
    const financialQuery = `
      SELECT 
        COUNT(*) as total_repairs,
        COUNT(CASE WHEN repair_status = 'completed' THEN 1 END) as completed_repairs,
        SUM(COALESCE(estimated_cost, 0)) as total_estimated,
        SUM(COALESCE(actual_cost, 0)) as total_actual,
        AVG(COALESCE(estimated_cost, 0)) as avg_estimated,
        AVG(CASE WHEN repair_status = 'completed' AND actual_cost IS NOT NULL THEN actual_cost END) as avg_actual
      FROM repairs r
      ${dateFilter}
    `;
    
    const financialStats = await dbGet(db, financialQuery);
    
    // Format response
    const stats = {
      totalRepairs: financialStats.total_repairs,
      completedRepairs: financialStats.completed_repairs,
      totalEstimated: financialStats.total_estimated || 0,
      totalActual: financialStats.total_actual || 0,
      averageEstimated: financialStats.avg_estimated || 0,
      averageActual: financialStats.avg_actual || 0
    };
    
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching financial stats:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /reports/summary - Get all statistics in one call
router.get('/summary', authenticateToken, async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { dateRange = 'month' } = req.query;
    
    // Apply date filtering
    let dateFilter: string;
    switch (dateRange) {
      case 'week':
        dateFilter = 'WHERE r.created_at >= datetime("now", "-7 days")';
        break;
      case 'month':
        dateFilter = 'WHERE r.created_at >= datetime("now", "-1 month")';
        break;
      case 'quarter':
        dateFilter = 'WHERE r.created_at >= datetime("now", "-3 months")';
        break;
      case 'year':
        dateFilter = 'WHERE r.created_at >= datetime("now", "-1 year")';
        break;
      default:
        dateFilter = 'WHERE r.created_at >= datetime("now", "-1 month")';
    }
    
    // Get all statistics in parallel
    const [overviewStats, deviceStats, brandStats, monthlyStats, financialStats] = await Promise.all([
      // Overview stats
      dbAll(db, `
        SELECT 
          repair_status,
          COUNT(*) as count
        FROM repairs r
        ${dateFilter}
        GROUP BY repair_status
      `),
      
      // Device stats
      dbAll(db, `
        SELECT 
          device_type,
          COUNT(*) as count
        FROM repairs r
        ${dateFilter}
        GROUP BY device_type
        ORDER BY count DESC
      `),
      
      // Brand stats
      dbAll(db, `
        SELECT 
          brand,
          COUNT(*) as count
        FROM repairs r
        ${dateFilter}
        GROUP BY brand
        ORDER BY count DESC
      `),
      
      // Monthly stats
      dbAll(db, `
        SELECT 
          strftime('%Y-%m', r.created_at) as month,
          COUNT(*) as count
        FROM repairs r
        ${dateFilter}
        GROUP BY month
        ORDER BY month ASC
      `),
      
      // Financial stats
      dbGet(db, `
        SELECT 
          COUNT(*) as total_repairs,
          COUNT(CASE WHEN repair_status = 'completed' THEN 1 END) as completed_repairs,
          SUM(COALESCE(estimated_cost, 0)) as total_estimated,
          SUM(COALESCE(actual_cost, 0)) as total_actual,
          AVG(COALESCE(estimated_cost, 0)) as avg_estimated,
          AVG(CASE WHEN repair_status = 'completed' AND actual_cost IS NOT NULL THEN actual_cost END) as avg_actual
        FROM repairs r
        ${dateFilter}
      `)
    ]);
    
    // Calculate overview totals
    const total = overviewStats.reduce((sum: number, stat: any) => sum + stat.count, 0);
    const completedCount = overviewStats.find((stat: any) => stat.repair_status === 'completed')?.count || 0;
    const completionRate = total > 0 ? (completedCount / total) * 100 : 0;
    
    // Format response
    const summary = {
      overview: {
        total,
        pending: overviewStats.find((stat: any) => stat.repair_status === 'pending')?.count || 0,
        inProgress: overviewStats.find((stat: any) => stat.repair_status === 'in_progress')?.count || 0,
        completed: completedCount,
        issued: overviewStats.find((stat: any) => stat.repair_status === 'issued')?.count || 0,
        cancelled: overviewStats.find((stat: any) => stat.repair_status === 'cancelled')?.count || 0,
        waitingParts: overviewStats.find((stat: any) => stat.repair_status === 'waiting_parts')?.count || 0,
        completionRate: Math.round(completionRate)
      },
      devices: deviceStats,
      brands: brandStats,
      monthly: monthlyStats,
      financial: {
        totalRepairs: financialStats.total_repairs,
        completedRepairs: financialStats.completed_repairs,
        totalEstimated: financialStats.total_estimated || 0,
        totalActual: financialStats.total_actual || 0,
        averageEstimated: financialStats.avg_estimated || 0,
        averageActual: financialStats.avg_actual || 0
      }
    };
    
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Error fetching summary stats:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
