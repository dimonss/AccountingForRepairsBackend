import sqlite3 from 'sqlite3';
import dotenv from 'dotenv';
import * as XLSX from 'xlsx';
import path from 'path';
import { initDatabase, closeDatabase } from '../database/init';

// Load environment variables from .env file
dotenv.config();

interface Client {
  Имя: string;
  'Номер телефона': string;
}

interface Equipment {
  Имя: string;
  'Наименование оборудования': string;
}

interface Repair {
  'Наименование оборудования': string;
  'ТипРемонта': string;
  'Дата получения': number;
  'Дата выдачи': number;
  'СтатусРемонта': boolean;
  'Цена': number;
}

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

function readExcelFile(filePath: string): any[] {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    return data;
  } catch (error) {
    console.error(`Error reading Excel file ${filePath}:`, error);
    throw error;
  }
}

function formatPhoneNumber(phone: string): string {
  if (!phone || typeof phone !== 'string') return '';
  
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // Handle Kyrgyz phone numbers
  if (cleaned.length === 9 && cleaned.startsWith('0')) {
    // Convert 0555123456 to +996555123456
    return `+996${cleaned.substring(1)}`;
  }
  
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    // Convert 0555123456 to +996555123456 (if somehow got 10 digits)
    return `+996${cleaned.substring(1)}`;
  }
  
  if (cleaned.length === 12 && cleaned.startsWith('996')) {
    // Already in international format
    return `+${cleaned}`;
  }
  
  if (cleaned.length === 11 && cleaned.startsWith('7')) {
    // Russian number, convert to international
    return `+${cleaned}`;
  }
  
  if (cleaned.length === 10 && cleaned.startsWith('7')) {
    // Russian number without country code
    return `+7${cleaned}`;
  }
  
  if (cleaned.length === 9 && !cleaned.startsWith('0')) {
    // Kyrgyz number without leading 0
    return `+996${cleaned}`;
  }
  
  // If it's already in international format with +
  if (phone.startsWith('+')) {
    return phone;
  }
  
  // If we can't determine the format, return as is but add + if it looks like a number
  if (cleaned.length >= 9 && cleaned.length <= 15) {
    return `+${cleaned}`;
  }
  
  // Return original if we can't format it
  return phone;
}

function isSerialNumber(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  
  const strValue = value.trim();
  
  // Skip if it's a repair number (6 digits)
  if (/^\d{6}$/.test(strValue)) return false;
  
  // Patterns for serial numbers:
  // - Webasto: "9011401C..0913253443", "386134CC", "56579cb"
  // - Eberspacher: "70723E.57.043734", "70723D.57.638204"
  // - Planar: "540223535", "420121414"
  // - Chinese: "000123", "001234" (but not 6 digits)
  // - General: alphanumeric with dots, dashes, etc.
  
  const serialPatterns = [
    /^[A-Z0-9]+(?:\.{2}[A-Z0-9]+)?$/i,  // Webasto pattern
    /^[A-Z0-9]+\.[A-Z0-9]+\.[A-Z0-9]+$/i, // Eberspacher pattern
    /^[A-Z0-9]{6,12}$/i,  // General alphanumeric
    /^[0-9]{7,12}$/,      // Long numeric (but not 6 digits)
    /^[A-Z0-9]+(?:[-\s][A-Z0-9]+)*$/i  // With dashes or spaces
  ];
  
  return serialPatterns.some(pattern => pattern.test(strValue));
}

function parseRepairNumber(value: string): string | null {
  if (!value || typeof value !== 'string') return null;
  
  const strValue = value.trim();
  
  // Look for 6-digit numbers in the repair type
  const repairNumberPattern = /\b(\d{6})\b/;
  const match = strValue.match(repairNumberPattern);
  if (match) {
    return match[1];
  }
  
  return null;
}

function extractSerialNumber(equipmentName: string): string | null {
  if (!equipmentName || typeof equipmentName !== 'string') return null;
  
  // Split by spaces and look for serial number patterns
  const parts = equipmentName.split(/\s+/);
  for (const part of parts) {
    if (isSerialNumber(part)) {
      return part;
    }
  }
  
  return null;
}

function classifyDeviceInfo(equipmentName: string): { device_type: string; brand: string; model: string } {
  if (!equipmentName || typeof equipmentName !== 'string') {
    return { device_type: 'other', brand: 'Unknown', model: 'Unknown' };
  }
  
  const name = equipmentName.toLowerCase();
  
  // Remove serial numbers and clean up the name
  let cleanName = equipmentName.replace(/\b[A-Z0-9]+(?:\.{2}[A-Z0-9]+)?\b/gi, '').trim();
  cleanName = cleanName.replace(/\b[A-Z0-9]+\.[A-Z0-9]+\.[A-Z0-9]+\b/gi, '').trim();
  cleanName = cleanName.replace(/\b\d{7,12}\b/g, '').trim();
  
  // Classify device type
  let device_type = 'other';
  if (name.includes('webasto') || name.includes('вебасто')) {
    device_type = 'autonomous_heater';
  } else if (name.includes('eberspacher') || name.includes('эбершпахер')) {
    device_type = 'autonomous_heater';
  } else if (name.includes('планар') || name.includes('planar')) {
    device_type = 'autonomous_heater';
  } else if (name.includes('китай') || name.includes('china')) {
    device_type = 'autonomous_heater';
  } else if (name.includes('холодильник') || name.includes('refrigerator')) {
    device_type = 'refrigerator';
  } else if (name.includes('насос') || name.includes('pump')) {
    device_type = 'pump';
  } else if (name.includes('нагнетатель') || name.includes('blower')) {
    device_type = 'blower';
  } else if (name.includes('монитор') || name.includes('monitor')) {
    device_type = 'monitor';
  } else if (name.includes('рация') || name.includes('radio')) {
    device_type = 'radio';
  }
  
  // Classify brand
  let brand = 'other';
  if (name.includes('webasto') || name.includes('вебасто')) {
    brand = 'webasto';
  } else if (name.includes('eberspacher') || name.includes('эбершпахер')) {
    brand = 'eberspacher';
  } else if (name.includes('планар') || name.includes('planar')) {
    brand = 'planar';
  } else if (name.includes('китай') || name.includes('china')) {
    brand = 'china';
  } else if (name.includes('планар') || name.includes('planar')) {
    brand = 'planar';
  } else if (name.includes('бинар') || name.includes('binar')) {
    brand = 'binar';
  } else if (name.includes('теплостар') || name.includes('teplostar')) {
    brand = 'teplostar';
  } else if (name.includes('спутник') || name.includes('sputnik')) {
    brand = 'sputnik';
  }
  
  // Extract model from clean name
  const parts = cleanName.split(/\s+/).filter(part => part.length > 0);
  let model = 'Unknown';
  
  if (parts.length > 0) {
    // For Webasto, look for model numbers
    if (brand === 'webasto') {
      const webastoModels = ['2000st', '2000st', 'air top', 'evo', '3500', '5000d', 'hl18d', 'hl24', 'hl32d', 'termo'];
      for (const modelName of webastoModels) {
        if (name.includes(modelName)) {
          model = modelName;
          break;
        }
      }
    } else if (brand === 'eberspacher') {
      const eberspacherModels = ['d4s', 'd4', 'd3l', 'd3'];
      for (const modelName of eberspacherModels) {
        if (name.includes(modelName)) {
          model = modelName;
          break;
        }
      }
    } else if (brand === 'planar') {
      const planarModels = ['4дм', '4дм2', '2д', 'дм'];
      for (const modelName of planarModels) {
        if (name.includes(modelName)) {
          model = modelName;
          break;
        }
      }
    } else if (brand === 'china') {
      const chinaModels = ['5кв', '5kw', '2кв', '2kw', '9кв', '9kw', '16.3кв'];
      for (const modelName of chinaModels) {
        if (name.includes(modelName)) {
          model = modelName;
          break;
        }
      }
    }
    
    // If no specific model found, use first meaningful part
    if (model === 'Unknown' && parts.length > 0) {
      model = parts[0];
    }
  }
  
  return { device_type, brand, model };
}

function excelDateToJSDate(excelDate: number): Date {
  // Excel dates are number of days since 1900-01-01
  const utcDays = Math.floor(excelDate - 25569);
  const utcValue = utcDays * 86400;
  return new Date(utcValue * 1000);
}

async function migrateRealExcelData() {
  console.log('📊 Starting real Excel data migration...');
  
  // Initialize database
  await initDatabase();
  console.log('✅ Database initialized');
  
  // Get database instance
  const { getDatabase } = await import('../database/init');
  const db = getDatabase();

  try {
    const dataPath = path.join(__dirname, '../../data');
    
    // Read Excel files
    console.log('📖 Reading Excel files...');
    
    const clientsPath = path.join(dataPath, 'Клиенты.xlsx');
    const equipmentPath = path.join(dataPath, 'Оборудоваие.xlsx');
    const repairPath = path.join(dataPath, 'Ремонт.xlsx');
    
    console.log(`Reading clients from: ${clientsPath}`);
    const clientsData = readExcelFile(clientsPath) as Client[];
    console.log(`Found ${clientsData.length} client records`);
    
    console.log(`Reading equipment from: ${equipmentPath}`);
    const equipmentData = readExcelFile(equipmentPath) as Equipment[];
    console.log(`Found ${equipmentData.length} equipment records`);
    
    console.log(`Reading repairs from: ${repairPath}`);
    const repairData = readExcelFile(repairPath) as Repair[];
    console.log(`Found ${repairData.length} repair records`);

    // Clean and process client data with phone formatting
    console.log('👥 Processing client data...');
    const clientMap = new Map<string, string>();
    let validClients = 0;
    let formattedPhones = 0;
    
    clientsData.forEach(client => {
      const name = client.Имя?.toString().trim();
      const rawPhone = client['Номер телефона']?.toString().trim();
      
      if (name && rawPhone && name !== '-' && name !== '' && rawPhone !== '0') {
        const formattedPhone = formatPhoneNumber(rawPhone);
        clientMap.set(name, formattedPhone);
        validClients++;
        
        if (formattedPhone !== rawPhone) {
          formattedPhones++;
        }
      }
    });
    
    console.log(`Created client map with ${validClients} valid entries`);
    console.log(`Formatted ${formattedPhones} phone numbers to international format`);

    // Create equipment map
    console.log('🔧 Processing equipment data...');
    const equipmentMap = new Map<string, string>();
    let validEquipment = 0;
    
    equipmentData.forEach(equipment => {
      const name = equipment.Имя?.toString().trim();
      const equipmentName = equipment['Наименование оборудования']?.toString().trim();
      
      if (name && equipmentName && name !== '-' && name !== '') {
        equipmentMap.set(name, equipmentName);
        validEquipment++;
      }
    });
    
    console.log(`Created equipment map with ${validEquipment} valid entries`);

    // Process repair data and insert into database
    console.log('🔧 Processing repair data...');
    
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    
    for (const repair of repairData) {
      try {
        const equipmentName = repair['Наименование оборудования']?.toString().trim();
        const repairType = repair['ТипРемонта']?.toString().trim();
        const price = repair['Цена'] || 0;
        const status = repair['СтатусРемонта'];
        const receivedDate = repair['Дата получения'];
        const issuedDate = repair['Дата выдачи'];
        
        // Skip if no equipment name
        if (!equipmentName || equipmentName === '') {
          skippedCount++;
          continue;
        }
        
        // Find client by equipment name
        let clientName = '';
        for (const [name, eqName] of equipmentMap.entries()) {
          if (eqName === equipmentName) {
            clientName = name;
            break;
          }
        }
        
        if (!clientName) {
          console.log(`⚠️  No client found for equipment: ${equipmentName}`);
          errorCount++;
          continue;
        }
        
        // Get client phone (already formatted)
        const clientPhone = clientMap.get(clientName);
        if (!clientPhone) {
          console.log(`⚠️  No phone found for client: ${clientName}`);
          errorCount++;
          continue;
        }
        
        // Parse device information with improved classification
        const { device_type, brand, model } = classifyDeviceInfo(equipmentName);
        const serialNumber = extractSerialNumber(equipmentName);
        const repairNumber = parseRepairNumber(repairType || '');
        
        // Determine repair status
        let repairStatus = 'pending';
        if (status === true) {
          repairStatus = 'completed';
        } else if (status === false) {
          repairStatus = 'in_progress';
        }
        
        // Convert dates
        const createdAt = receivedDate ? excelDateToJSDate(receivedDate).toISOString() : new Date().toISOString();
        const completedAt = (status === true && issuedDate) ? excelDateToJSDate(issuedDate).toISOString() : null;
        
        // Insert into repairs table
        const result = await dbRun(db, `
          INSERT INTO repairs (
            device_type, brand, model, serial_number, repair_number, 
            client_name, client_phone, issue_description, repair_status,
            estimated_cost, actual_cost, created_at, completed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          device_type,           // device_type (improved classification)
          brand,                 // brand (improved classification)
          model,                 // model (improved classification)
          serialNumber,          // serial_number (avoiding repair numbers)
          repairNumber,          // repair_number (6-digit format)
          clientName,            // client_name
          clientPhone,           // client_phone (formatted to international)
          repairType || 'Ремонт оборудования', // issue_description
          repairStatus,          // repair_status
          price,                 // estimated_cost
          status === true ? price : null, // actual_cost (only if completed)
          createdAt,             // created_at
          completedAt            // completed_at
        ]);
        
        console.log(`✅ Added repair: ${equipmentName} (${device_type}/${brand}/${model}) for ${clientName} (${clientPhone}) (ID: ${result.lastID})`);
        successCount++;
        
      } catch (error) {
        console.error(`❌ Error processing repair record:`, error);
        errorCount++;
      }
    }

    // Get final statistics
    const totalRepairs = await dbGet(db, 'SELECT COUNT(*) as count FROM repairs');
    
    console.log('\n🎉 Excel data migration completed!');
    console.log(`📊 Statistics:`);
    console.log(`   • Total repairs in database: ${totalRepairs.count}`);
    console.log(`   • Successfully processed: ${successCount}`);
    console.log(`   • Errors: ${errorCount}`);
    console.log(`   • Skipped (no equipment name): ${skippedCount}`);
    console.log(`   • Valid clients: ${validClients}`);
    console.log(`   • Valid equipment: ${validEquipment}`);
    console.log(`   • Phone numbers formatted: ${formattedPhones}`);

  } catch (error) {
    console.error('❌ Error during migration:', error);
  } finally {
    await closeDatabase();
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  migrateRealExcelData();
}

export { migrateRealExcelData };
