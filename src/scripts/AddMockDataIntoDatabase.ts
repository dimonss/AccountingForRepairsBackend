import sqlite3 from 'sqlite3';
import dotenv from 'dotenv';
import { initDatabase, closeDatabase } from '../database/init';

// Load environment variables from .env file
dotenv.config();
// Mock data for repairs
const mockRepairs = [
  {
    device_type: 'smartphone',
    brand: 'Apple',
    model: 'iPhone 14 Pro',
    serial_number: 'A1B2C3D4E5F6',
    client_name: 'Иван Петров',
    client_phone: '+7-999-123-45-67',
    client_email: 'ivan.petrov@email.com',
    issue_description: 'Треснул экран после падения',
    repair_status: 'pending',
    estimated_cost: 15000.00,
    notes: 'Клиент торопится, желательно сделать быстрее'
  },
  {
    device_type: 'laptop',
    brand: 'MacBook',
    model: 'MacBook Air M2',
    serial_number: 'MBA2023001',
    client_name: 'Мария Сидорова',
    client_phone: '+7-912-345-67-89',
    client_email: 'maria.sidorova@company.ru',
    issue_description: 'Не включается, индикатор заряда не горит',
    repair_status: 'in_progress',
    estimated_cost: 25000.00,
    actual_cost: 22500.00,

    notes: 'Заменена материнская плата'
  },
  {
    device_type: 'tablet',
    brand: 'Samsung',
    model: 'Galaxy Tab S8',
    serial_number: 'SGT2023007',
    client_name: 'Алексей Козлов',
    client_phone: '+7-905-234-56-78',
    client_email: 'alex.kozlov@gmail.com',
    issue_description: 'Не работает тачскрин в нижней части экрана',
    repair_status: 'waiting_parts',
    estimated_cost: 12000.00,
    notes: 'Ожидаем поставку тачскрина'
  },
  {
    device_type: 'smartphone',
    brand: 'Samsung',
    model: 'Galaxy S23 Ultra',
    serial_number: 'SGS23U2023',
    client_name: 'Ольга Михайлова',
    client_phone: '+7-903-456-78-90',
    client_email: null,
    issue_description: 'Быстро разряжается батарея',
    repair_status: 'completed',
    estimated_cost: 8000.00,
    actual_cost: 7500.00,

    notes: 'Заменена батарея, проведена диагностика'
  },
  {
    device_type: 'desktop',
    brand: 'Custom Build',
    model: 'Gaming PC',
    serial_number: null,
    client_name: 'Дмитрий Волков',
    client_phone: '+7-911-567-89-01',
    client_email: 'dmitry.volkov@gaming.ru',
    issue_description: 'Компьютер выключается во время игр',
    repair_status: 'pending',
    estimated_cost: 15000.00,
    notes: 'Возможно проблема с блоком питания или перегрев'
  },
  {
    device_type: 'printer',
    brand: 'HP',
    model: 'LaserJet Pro M404n',
    serial_number: 'HP404LJ2023',
    client_name: 'ООО "Офис Центр"',
    client_phone: '+7-495-123-45-67',
    client_email: 'office@center.ru',
    issue_description: 'Замятие бумаги, не печатает',
    repair_status: 'in_progress',
    estimated_cost: 3500.00,
    notes: 'Корпоративный клиент, приоритет'
  },
  {
    device_type: 'smartphone',
    brand: 'Xiaomi',
    model: 'Mi 13 Pro',
    serial_number: 'XMI13P2023',
    client_name: 'Анна Лебедева',
    client_phone: '+7-925-678-90-12',
    client_email: 'anna.lebedeva@yandex.ru',
    issue_description: 'Не работает камера',
    repair_status: 'cancelled',
    estimated_cost: 10000.00,
    notes: 'Клиент отказался от ремонта из-за высокой стоимости'
  },
  {
    device_type: 'monitor',
    brand: 'LG',
    model: 'UltraWide 34WP65C',
    serial_number: 'LG34WP2023',
    client_name: 'Сергей Новиков',
    client_phone: '+7-916-789-01-23',
    client_email: 'sergey.novikov@design.com',
    issue_description: 'Полосы на экране, искаженные цвета',
    repair_status: 'completed',
    estimated_cost: 20000.00,
    actual_cost: 18000.00,

    notes: 'Заменена матрица, гарантия 6 месяцев'
  },
  {
    device_type: 'laptop',
    brand: 'Lenovo',
    model: 'ThinkPad X1 Carbon',
    serial_number: 'LNV-X1C-2023',
    client_name: 'Елена Морозова',
    client_phone: '+7-909-012-34-56',
    client_email: 'elena.morozova@corporate.ru',
    issue_description: 'Залили клавиатуру кофе',
    repair_status: 'in_progress',
    estimated_cost: 12000.00,
    notes: 'Требуется замена клавиатуры и чистка'
  },
  {
    device_type: 'tablet',
    brand: 'iPad',
    model: 'iPad Pro 12.9"',
    serial_number: 'IPAD129P2023',
    client_name: 'Михаил Крылов',
    client_phone: '+7-963-345-67-89',
    client_email: 'mikhail.krylov@artist.ru',
    issue_description: 'Не заряжается, разъем поврежден',
    repair_status: 'pending',
    estimated_cost: 8500.00,
    notes: 'Для работы с графикой, срочный ремонт'
  }
];

// Mock data for parts
const mockParts = [
  {
    name: 'iPhone 14 Pro Screen Assembly',
    description: 'Оригинальный дисплей для iPhone 14 Pro с тачскрином',
    cost: 12000.00,
    quantity_in_stock: 5,
    supplier: 'Apple Authorized'
  },
  {
    name: 'MacBook Air M2 Logic Board',
    description: 'Материнская плата для MacBook Air M2 8GB/256GB',
    cost: 18000.00,
    quantity_in_stock: 2,
    supplier: 'Mac Parts Supply'
  },
  {
    name: 'Galaxy Tab S8 Touchscreen',
    description: 'Тачскрин для Samsung Galaxy Tab S8',
    cost: 8000.00,
    quantity_in_stock: 0,
    supplier: 'Samsung Parts'
  },
  {
    name: 'Galaxy S23 Ultra Battery',
    description: 'Аккумулятор для Samsung Galaxy S23 Ultra 5000mAh',
    cost: 5000.00,
    quantity_in_stock: 8,
    supplier: 'Samsung Original'
  },
  {
    name: 'HP LaserJet Roller Kit',
    description: 'Комплект роликов для HP LaserJet Pro M404',
    cost: 1500.00,
    quantity_in_stock: 12,
    supplier: 'HP Parts Center'
  },
  {
    name: 'LG Monitor Panel 34"',
    description: 'Матрица для монитора LG UltraWide 34"',
    cost: 15000.00,
    quantity_in_stock: 1,
    supplier: 'LG Display'
  },
  {
    name: 'ThinkPad Keyboard RU',
    description: 'Клавиатура для Lenovo ThinkPad X1 Carbon, русская раскладка',
    cost: 4500.00,
    quantity_in_stock: 3,
    supplier: 'Lenovo Parts'
  },
  {
    name: 'iPad Pro Charging Port',
    description: 'Разъем зарядки для iPad Pro 12.9"',
    cost: 2500.00,
    quantity_in_stock: 6,
    supplier: 'iPad Repair Parts'
  }
];

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

    // Insert parts
    console.log('📦 Inserting parts...');
    const partIds: number[] = [];
    
    for (const part of mockParts) {
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
    
    for (const repair of mockRepairs) {
      const result = await dbRun(db, `
        INSERT INTO repairs (
          device_type, brand, model, serial_number, client_name, client_phone, 
          client_email, issue_description, repair_status, estimated_cost, 
          actual_cost, notes,
          completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        repair.device_type, repair.brand, repair.model, repair.serial_number,
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