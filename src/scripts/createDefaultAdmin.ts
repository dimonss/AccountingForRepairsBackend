import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { initDatabase, getDatabase, closeDatabase } from '../database/init';

// Load environment variables
dotenv.config();

// Helper function for database operations
function dbRun(db: any, query: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(this: any, err: any) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function dbGet(db: any, query: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err: any, row: any) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

async function createDefaultAdmin() {
  try {
    console.log('🔐 Creating Default Administrator Account');
    console.log('==========================================\n');

    // Default admin credentials
    const defaultAdmin = {
      username: 'test',
      email: 'test@mail.com',
      password: 'test',
      fullName: 'Default Administrator',
      role: 'admin'
    };

    console.log('📋 Default admin credentials:');
    console.log(`   Username: ${defaultAdmin.username}`);
    console.log(`   Email: ${defaultAdmin.email}`);
    console.log(`   Password: ${defaultAdmin.password}`);
    console.log(`   Role: ${defaultAdmin.role}`);
    console.log('');

    // Initialize database
    await initDatabase();
    const db = getDatabase();

    // Check if admin already exists
    const existingAdmin = await dbGet(db, `
      SELECT id, username, email FROM users WHERE username = ? OR email = ?
    `, [defaultAdmin.username, defaultAdmin.email]);

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists!');
      console.log(`   Found user: ${existingAdmin.username} (${existingAdmin.email})`);
      console.log('');
      console.log('🔄 Updating existing admin password...');
      
      // Update password for existing admin
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
      const passwordHash = await bcrypt.hash(defaultAdmin.password, saltRounds);
      
      await dbRun(db, `
        UPDATE users 
        SET password_hash = ?, role = 'admin', is_active = 1
        WHERE username = ? OR email = ?
      `, [passwordHash, defaultAdmin.username, defaultAdmin.email]);
      
      console.log('✅ Admin password updated successfully!');
      console.log('🚀 You can now log in with the default credentials.');
      
    } else {
      console.log('🔄 Creating new admin user...');
      
      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
      const passwordHash = await bcrypt.hash(defaultAdmin.password, saltRounds);

      // Create admin user
      const result = await dbRun(db, `
        INSERT INTO users (username, email, password_hash, full_name, role, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
      `, [defaultAdmin.username, defaultAdmin.email, passwordHash, defaultAdmin.fullName, defaultAdmin.role]);

      console.log('✅ Default admin user created successfully!');
      console.log(`👤 User ID: ${result.lastID}`);
      console.log(`📧 Email: ${defaultAdmin.email}`);
      console.log(`👑 Role: Administrator`);
      console.log('');
      console.log('🚀 You can now start the server and log in with these credentials.');
    }

    console.log('');
    console.log('⚠️  SECURITY WARNING:');
    console.log('   - Change the default password in production!');
    console.log('   - This admin account is for development/testing only');
    console.log('   - Use strong passwords in production environment');

  } catch (error) {
    console.error('❌ Error creating default admin user:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
    process.exit(0);
  }
}

// Run if script is executed directly
if (require.main === module) {
  createDefaultAdmin();
}

export { createDefaultAdmin }; 