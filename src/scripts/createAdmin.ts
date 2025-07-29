import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { initDatabase, getDatabase, closeDatabase } from '../database/init';
import * as readline from 'readline';

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

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to ask questions
function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// Helper function to ask for password (hidden input)
function askPassword(question: string): Promise<string> {
  return new Promise((resolve) => {
    // Hide input for password
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    
    process.stdout.write(question);
    
    let password = '';
    
    stdin.on('data', (key: string) => {
      // Handle different key inputs
      if (key === '\u0003') { // Ctrl+C
        process.exit();
      } else if (key === '\r' || key === '\n') { // Enter
        stdin.setRawMode(false);
        stdin.pause();
        process.stdout.write('\n');
        resolve(password);
      } else if (key === '\u007f') { // Backspace
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else {
        password += key;
        process.stdout.write('*');
      }
    });
  });
}

async function createAdmin() {
  try {
    console.log('🔐 Creating Administrator Account');
    console.log('==================================\n');

    // Initialize database
    await initDatabase();
    const db = getDatabase();

    // Check if admin already exists
    const existingAdmin = await dbGet(db, `
      SELECT id FROM users WHERE role = 'admin' LIMIT 1
    `);

    if (existingAdmin) {
      console.log('⚠️  An admin user already exists!');
      const overwrite = await askQuestion('Do you want to create another admin? (y/N): ');
      if (overwrite.toLowerCase() !== 'y' && overwrite.toLowerCase() !== 'yes') {
        console.log('Operation cancelled.');
        rl.close();
        await closeDatabase();
        process.exit(0);
      }
    }

    // Collect user information
    const username = await askQuestion('Username: ');
    if (!username) {
      console.log('❌ Username is required!');
      rl.close();
      await closeDatabase();
      process.exit(1);
    }

    const email = await askQuestion('Email: ');
    if (!email || !email.includes('@')) {
      console.log('❌ Valid email is required!');
      rl.close();
      await closeDatabase();
      process.exit(1);
    }

    const fullName = await askQuestion('Full Name: ');
    if (!fullName) {
      console.log('❌ Full name is required!');
      rl.close();
      await closeDatabase();
      process.exit(1);
    }

    const password = await askPassword('Password (min 6 chars): ');
    if (!password || password.length < 6) {
      console.log('❌ Password must be at least 6 characters long!');
      rl.close();
      await closeDatabase();
      process.exit(1);
    }

    const confirmPassword = await askPassword('Confirm Password: ');
    if (password !== confirmPassword) {
      console.log('❌ Passwords do not match!');
      rl.close();
      await closeDatabase();
      process.exit(1);
    }

    // Check if username or email already exists
    const existingUser = await dbGet(db, `
      SELECT id FROM users WHERE username = ? OR email = ?
    `, [username, email]);

    if (existingUser) {
      console.log('❌ User with this username or email already exists!');
      rl.close();
      await closeDatabase();
      process.exit(1);
    }

    // Hash password
    console.log('\n🔄 Creating admin user...');
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create admin user
    const result = await dbRun(db, `
      INSERT INTO users (username, email, password_hash, full_name, role)
      VALUES (?, ?, ?, ?, 'admin')
    `, [username, email, passwordHash, fullName]);

    console.log('✅ Admin user created successfully!');
    console.log(`👤 User ID: ${result.lastID}`);
    console.log(`📧 Email: ${email}`);
    console.log(`👑 Role: Administrator`);
    console.log('\n🚀 You can now start the server and log in with these credentials.');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    rl.close();
    await closeDatabase();
    process.exit(0);
  }
}

// Run if script is executed directly
if (require.main === module) {
  createAdmin();
}

export { createAdmin }; 