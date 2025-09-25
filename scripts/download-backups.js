#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration
const SERVER_HOST = process.env.SERVER_HOST;
const SERVER_BACKUP_PATH = '/root/backend/AccountingForRepairsBackend/backups';
const LOCAL_BACKUP_DIR = './backups_from_prod';

console.log('🔄 Downloading backups from production server...\n');

try {
  // Create local backup directory if it doesn't exist
  if (!fs.existsSync(LOCAL_BACKUP_DIR)) {
    fs.mkdirSync(LOCAL_BACKUP_DIR, { recursive: true });
    console.log(`📁 Created directory: ${LOCAL_BACKUP_DIR}`);
  }

  // Check if server is reachable
  console.log(`🔍 Checking connection to ${SERVER_HOST}...`);
  try {
    execSync(`ssh -o ConnectTimeout=10 ${SERVER_HOST} "echo 'Connection successful'"`, { stdio: 'pipe' });
    console.log('✅ Server connection successful\n');
  } catch (error) {
    console.error('❌ Cannot connect to server. Please check:');
    console.error('   - SSH key is configured');
    console.error('   - Server is accessible');
    console.error('   - SERVER_HOST in .env is correct');
    process.exit(1);
  }

  // List available backups on server
  console.log('📋 Available backups on server:');
  try {
    const serverBackups = execSync(`ssh ${SERVER_HOST} "ls -la ${SERVER_BACKUP_PATH}"`, { encoding: 'utf8' });
    console.log(serverBackups);
  } catch (error) {
    console.error('❌ Cannot list server backups:', error.message);
    process.exit(1);
  }

  // Download all backup files
  console.log('⬇️  Downloading backups...');
  try {
    execSync(`scp ${SERVER_HOST}:${SERVER_BACKUP_PATH}/*.sqlite ${LOCAL_BACKUP_DIR}/`, { stdio: 'inherit' });
    console.log('✅ Backups downloaded successfully!\n');
  } catch (error) {
    console.error('❌ Error downloading backups:', error.message);
    process.exit(1);
  }

  // List downloaded files
  console.log('📁 Downloaded files:');
  try {
    const localBackups = execSync(`ls -la ${LOCAL_BACKUP_DIR}`, { encoding: 'utf8' });
    console.log(localBackups);
  } catch (error) {
    console.log('No files found in backup directory');
  }

  console.log('\n🎉 Backup download completed!');
  console.log(`📂 Backups saved to: ${path.resolve(LOCAL_BACKUP_DIR)}`);

} catch (error) {
  console.error('❌ Unexpected error:', error.message);
  process.exit(1);
}
