import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Remove all whitespace characters (spaces, tabs, newlines, non-breaking spaces \u00A0)
 * and invisible Unicode formatting characters (zero-width spaces, LTR/RTL marks, embedding markers)
 */
export function cleanPhoneNumber(phone: string): string {
  if (!phone) return '';
  return phone.replace(/[\s\u200B-\u200F\uFEFF\u202A-\u202E]/g, '');
}

// Helper functions for database operations
function dbRun(db: sqlite3.Database, query: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(this: any, err: any) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function dbAll<T = any>(db: sqlite3.Database, query: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err: any, rows: any[]) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}

function dbGet<T = any>(db: sqlite3.Database, query: string, params: any[] = []): Promise<T> {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err: any, row: any) => {
      if (err) reject(err);
      else resolve(row as T);
    });
  });
}

interface RepairPhoneRow {
  id: number;
  client_name: string;
  client_phone: string;
}

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const noBackup = args.includes('--no-backup');

  // Find database path from args or env or defaults
  let customDbArg = args.find(arg => !arg.startsWith('--'));
  let dbPath = customDbArg;

  if (!dbPath) {
    if (process.env.DB_NAME && fs.existsSync(process.env.DB_NAME)) {
      dbPath = process.env.DB_NAME;
    } else if (fs.existsSync('db.sqlite')) {
      dbPath = 'db.sqlite';
    } else if (fs.existsSync('repairs.db')) {
      dbPath = 'repairs.db';
    } else {
      dbPath = process.env.DB_NAME || 'db.sqlite';
    }
  }

  // Resolve to absolute path for safety
  const resolvedDbPath = path.resolve(dbPath);

  console.log('====================================================');
  console.log('📞 Script to Remove Spaces from Phone Numbers in DB');
  console.log('====================================================');
  console.log(`📁 Target database: ${resolvedDbPath}`);
  console.log(`🔍 Mode: ${isDryRun ? 'DRY-RUN (no changes will be applied)' : 'LIVE (will update database)'}`);

  if (!fs.existsSync(resolvedDbPath)) {
    console.error(`❌ Database file not found: ${resolvedDbPath}`);
    process.exit(1);
  }

  const db = new sqlite3.Database(resolvedDbPath);

  try {
    // Set busy timeout to 5000ms so concurrent requests don't fail with SQLITE_BUSY
    await dbRun(db, 'PRAGMA busy_timeout = 5000');

    // 1. Get total repair count
    const totalCountRow = await dbGet<{ count: number }>(db, 'SELECT COUNT(*) as count FROM repairs');
    const totalRepairs = totalCountRow?.count || 0;
    console.log(`📊 Total repairs in database: ${totalRepairs}`);

    // 2. Fetch all repairs with non-empty client_phone
    const rows = await dbAll<RepairPhoneRow>(
      db,
      'SELECT id, client_name, client_phone FROM repairs WHERE client_phone IS NOT NULL AND client_phone != ""'
    );

    // 3. Identify records needing cleaning
    const toUpdate: Array<{ id: number; client_name: string; original: string; cleaned: string }> = [];

    for (const row of rows) {
      const original = row.client_phone;
      const cleaned = cleanPhoneNumber(original);

      if (cleaned !== original) {
        toUpdate.push({
          id: row.id,
          client_name: row.client_name,
          original,
          cleaned
        });
      }
    }

    console.log(`🔎 Found ${toUpdate.length} phone numbers containing spaces/formatting artifacts.\n`);

    if (toUpdate.length === 0) {
      console.log('✅ All phone numbers in database are already clean without spaces. Nothing to do!');
      return;
    }

    // 4. Display preview of changes
    console.log('📋 Changes to be made:');
    console.log('----------------------------------------------------');
    toUpdate.forEach((item, index) => {
      // Check if original might have contained two separate phone numbers separated by spaces
      const isMultiPhoneWithoutSeparators = /^[0-9]{5,}\s+[0-9]{5,}$/.test(item.original.trim());
      const note = isMultiPhoneWithoutSeparators ? ' ⚠️ [2 numbers merged]' : '';
      console.log(`${index + 1}. [ID ${item.id}] "${item.original}" ➔ "${item.cleaned}" (${item.client_name})${note}`);
    });
    console.log('----------------------------------------------------\n');

    if (isDryRun) {
      console.log('ℹ️  DRY-RUN completed. Database was NOT modified.');
      console.log('To apply these changes, run without the --dry-run flag:');
      console.log('   npm run remove-phone-spaces\n');
      return;
    }

    // Create automatic backup before live modifications
    if (!noBackup) {
      // Flush any pending WAL writes
      try {
        await dbRun(db, 'PRAGMA wal_checkpoint(PASSIVE)');
      } catch (walErr) {
        // Ignore if WAL mode is not enabled
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(path.dirname(resolvedDbPath), 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const dbFileName = path.basename(resolvedDbPath);
      const backupPath = path.join(backupDir, `${dbFileName}_backup_before_phone_clean_${timestamp}`);
      
      try {
        fs.copyFileSync(resolvedDbPath, backupPath);
        console.log(`💾 Automatic backup created at: ${backupPath}\n`);
      } catch (backupError) {
        console.error('⚠️  Failed to create automatic backup:', backupError);
        console.error('Aborting execution for safety. Pass --no-backup to proceed without backup.');
        throw backupError;
      }
    }

    // 5. Apply updates in a transaction
    console.log('🚀 Updating records in database...');
    await dbRun(db, 'BEGIN TRANSACTION');

    let updatedCount = 0;
    try {
      for (const item of toUpdate) {
        await dbRun(
          db,
          'UPDATE repairs SET client_phone = ? WHERE id = ?',
          [item.cleaned, item.id]
        );
        updatedCount++;
      }
      await dbRun(db, 'COMMIT');
      console.log(`✅ Successfully committed ${updatedCount} updates!\n`);
    } catch (updateError) {
      await dbRun(db, 'ROLLBACK');
      console.error('❌ Error during update, transaction rolled back:', updateError);
      throw updateError;
    }

    // 6. Post-verification
    const remainingWithSpaces = await dbGet<{ count: number }>(
      db,
      "SELECT COUNT(*) as count FROM repairs WHERE client_phone LIKE '% %'"
    );

    console.log('🎉 Verification Results:');
    console.log(`   - Records updated: ${updatedCount}`);
    console.log(`   - Remaining phone numbers with standard spaces: ${remainingWithSpaces?.count || 0}`);

    if ((remainingWithSpaces?.count || 0) === 0) {
      console.log('\n✨ Database phone cleanup completed successfully!');
    } else {
      console.log('\n⚠️  Notice: Some records still match LIKE "% %". Please inspect.');
    }

  } finally {
    // Ensure DB connection is closed cleanly
    await new Promise<void>((resolve) => {
      db.close((err) => {
        if (err) console.error('Error closing database:', err);
        resolve();
      });
    });
  }
}

// Execute when run directly
if (require.main === module) {
  main().catch((err) => {
    console.error('Fatal error in removePhoneSpaces script:', err);
    process.exit(1);
  });
}
