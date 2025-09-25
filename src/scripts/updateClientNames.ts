import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Function to convert text to lowercase (works with Cyrillic)
const toLowerCase = (text: string): string => {
  if (!text) return '';
  return text.toLowerCase();
};

// Helper function to promisify database operations
function dbRun(db: sqlite3.Database, query: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(this: any, err: any) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

// Function to update client names
async function updateClientNames() {
  const db = new sqlite3.Database(process.env.DB_NAME || 'repairs.db');
  const dbAll = promisify(db.all.bind(db));
  
  console.log('🔄 Starting client names update...\n');
  
  try {
    // First, let's see what we have before the update
    console.log('📊 Before update - sample client names:');
    const beforeSample = await dbAll('SELECT DISTINCT client_name FROM repairs ORDER BY client_name LIMIT 10') as any[];
    beforeSample.forEach((row: any) => {
      console.log(`   - "${row.client_name}"`);
    });
    console.log('');
    
    // Get all client names
    const allNames = await dbAll('SELECT DISTINCT client_name FROM repairs') as any[];
    console.log(`📈 Total unique client names: ${allNames.length}\n`);
    
    // Update each client name
    let updatedCount = 0;
    
    for (const row of allNames) {
      const originalName = row.client_name;
      const lowerName = toLowerCase(originalName);
      
      if (originalName !== lowerName) {
        // Update all repairs with this client name
        const result = await dbRun(
          db,
          'UPDATE repairs SET client_name = ? WHERE client_name = ?',
          [lowerName, originalName]
        );
        
        console.log(`✅ Updated "${originalName}" → "${lowerName}" (${result.changes} records)`);
        updatedCount++;
      }
    }
    
    console.log(`\n🎉 Update completed!`);
    console.log(`📊 Updated ${updatedCount} unique client names`);
    
    // Show some examples after the update
    console.log('\n📊 After update - sample client names:');
    const afterSample = await dbAll('SELECT DISTINCT client_name FROM repairs ORDER BY client_name LIMIT 10') as any[];
    afterSample.forEach((row: any) => {
      console.log(`   - "${row.client_name}"`);
    });
    
    // Show total count of unique client names
    const totalCount = await dbAll('SELECT COUNT(DISTINCT client_name) as count FROM repairs') as any[];
    console.log(`\n📊 Total unique client names: ${totalCount[0].count}`);
    
  } catch (error) {
    console.error('❌ Error during update:', error);
  } finally {
    db.close();
  }
}

// Run the update
updateClientNames().catch(console.error);
