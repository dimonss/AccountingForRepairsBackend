import sqlite3 from 'sqlite3';
import dotenv from 'dotenv';
import { initDatabase, closeDatabase } from '../database/init';
import { mockRepairs, mockParts } from './mockData';
import { generateAdditionalRepairs, generateAdditionalParts } from './additionalMockData';

// Load environment variables from .env file
dotenv.config();

// Helper function to promisify database operations
function dbRun(db: sqlite3.Database, query: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
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

async function addMockDataIntoDatabase() {
  console.log('🌱 Starting database seeding...');
  
  // Initialize database with all tables
  await initDatabase();
  console.log('✅ Database initialized');
  
  // Get database instance for operations
  const { getDatabase } = await import('../database/init');
  const db = getDatabase();

  try {
    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await dbRun(db, 'DELETE FROM repair_photos');
    await dbRun(db, 'DELETE FROM repair_parts');
    await dbRun(db, 'DELETE FROM repair_status_history');
    await dbRun(db, 'DELETE FROM repairs');
    await dbRun(db, 'DELETE FROM parts');
    
    // Reset auto-increment counters
    await dbRun(db, 'DELETE FROM sqlite_sequence WHERE name IN ("repairs", "parts", "repair_parts", "repair_status_history", "repair_photos")');

    // Generate additional data
    console.log('📊 Generating additional mock data...');
    const additionalRepairs = generateAdditionalRepairs();
    const additionalParts = generateAdditionalParts();
    
    // Combine all repairs and parts
    const allRepairs = [...mockRepairs, ...additionalRepairs];
    const allParts = [...mockParts, ...additionalParts];

    // Insert parts
    console.log('📦 Inserting parts...');
    const partIds: number[] = [];
    
    for (const part of allParts) {
      const result = await dbRun(db, `
        INSERT INTO parts (name, description, cost, quantity_in_stock, supplier)
        VALUES (?, ?, ?, ?, ?)
      `, [part.name, part.description, part.cost, part.quantity_in_stock, part.supplier]);
      
      partIds.push(result.lastID);
      console.log(`  ✓ Added part: ${part.name}`);
    }

    // Insert repairs
    console.log('🔧 Inserting repairs...');
    const repairIds: number[] = [];
    
    for (const repair of allRepairs) {
      const result = await dbRun(db, `
        INSERT INTO repairs (
          device_type, brand, model, serial_number, repair_number, client_name, client_phone, 
          client_email, issue_description, repair_status, estimated_cost, 
          actual_cost, notes,
          completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        repair.device_type, repair.brand, repair.model, repair.serial_number, repair.repair_number,
        repair.client_name, repair.client_phone, repair.client_email,
        repair.issue_description, repair.repair_status, repair.estimated_cost,
        repair.actual_cost || null,
        repair.notes, repair.repair_status === 'completed' ? new Date().toISOString() : null
      ]);
      
      repairIds.push(result.lastID);
      console.log(`  ✓ Added repair: ${repair.device_type} - ${repair.brand} ${repair.model}`);
    }

    // Add some repair-parts relationships
    console.log('🔗 Creating repair-parts relationships...');
    
    // iPhone screen repair
    await dbRun(db, `
      INSERT INTO repair_parts (repair_id, part_id, quantity_used, cost_per_unit)
      VALUES (?, ?, ?, ?)
    `, [repairIds[0], partIds[0], 1, 12000.00]);
    
    // MacBook logic board repair
    await dbRun(db, `
      INSERT INTO repair_parts (repair_id, part_id, quantity_used, cost_per_unit)
      VALUES (?, ?, ?, ?)
    `, [repairIds[1], partIds[1], 1, 18000.00]);
    
    // Samsung battery replacement
    await dbRun(db, `
      INSERT INTO repair_parts (repair_id, part_id, quantity_used, cost_per_unit)
      VALUES (?, ?, ?, ?)
    `, [repairIds[3], partIds[3], 1, 5000.00]);
    
    // Monitor panel replacement
    await dbRun(db, `
      INSERT INTO repair_parts (repair_id, part_id, quantity_used, cost_per_unit)
      VALUES (?, ?, ?, ?)
    `, [repairIds[7], partIds[5], 1, 15000.00]);

    // Add status history for some repairs
    console.log('📋 Adding status history...');
    
    const statusUpdates = [
      { repairId: repairIds[1], oldStatus: 'pending', newStatus: 'in_progress', notes: 'Начата диагностика' },
      { repairId: repairIds[1], oldStatus: 'in_progress', newStatus: 'waiting_parts', notes: 'Ожидание материнской платы' },
      { repairId: repairIds[1], oldStatus: 'waiting_parts', newStatus: 'in_progress', notes: 'Запчасть получена, продолжаем ремонт' },
      
      { repairId: repairIds[3], oldStatus: 'pending', newStatus: 'in_progress', notes: 'Диагностика батареи' },
      { repairId: repairIds[3], oldStatus: 'in_progress', newStatus: 'completed', notes: 'Батарея заменена, тестирование пройдено' },
      
      { repairId: repairIds[6], oldStatus: 'pending', newStatus: 'cancelled', notes: 'Клиент отменил заказ' }
    ];

    for (const update of statusUpdates) {
      await dbRun(db, `
        INSERT INTO repair_status_history (repair_id, old_status, new_status, notes)
        VALUES (?, ?, ?, ?)
      `, [update.repairId, update.oldStatus, update.newStatus, update.notes]);
    }

    // Get final counts
    const repairCount = await dbGet(db, 'SELECT COUNT(*) as count FROM repairs');
    const partsCount = await dbGet(db, 'SELECT COUNT(*) as count FROM parts');
    const relationshipsCount = await dbGet(db, 'SELECT COUNT(*) as count FROM repair_parts');
    const historyCount = await dbGet(db, 'SELECT COUNT(*) as count FROM repair_status_history');

    console.log('\n🎉 Database seeding completed successfully!');
    console.log(`📊 Statistics:`);
    console.log(`   • Repairs: ${repairCount.count}`);
    console.log(`   • Parts: ${partsCount.count}`);
    console.log(`   • Repair-Parts relationships: ${relationshipsCount.count}`);
    console.log(`   • Status history entries: ${historyCount.count}`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await closeDatabase();
  }
}

// Run the seeding if this file is executed directly
if (require.main === module) {
  addMockDataIntoDatabase();
}

export { addMockDataIntoDatabase };