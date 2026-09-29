#!/usr/bin/env node

const { execSync } = require('child_process');
require('dotenv').config();

// Configuration
const SERVER_HOST = process.env.SERVER_HOST;
const REMOTE_PROJECT_PATH = process.env.REMOTE_PROJECT_PATH;

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

console.log('🔄 Running phone cleanup on production server...\n');
if (isDryRun) {
  console.log('🔍 Mode: DRY-RUN (no modifications will be made)\n');
}

try {
  // Check if SERVER_HOST is configured
  if (!SERVER_HOST) {
    console.error('❌ SERVER_HOST is not configured in .env file');
    process.exit(1);
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

  if (!isDryRun) {
    // 1. Trigger automatic backup on remote server before running cleanup
    console.log('🗄️  Creating automatic database backup on production server first...');
    const backupCommand = `source ~/.nvm/nvm.sh && cd ${REMOTE_PROJECT_PATH} && npm run backup-db`;
    try {
      const backupOutput = execSync(`ssh ${SERVER_HOST} "${backupCommand}"`, { encoding: 'utf8' });
      console.log('📤 Server backup output:');
      console.log(backupOutput);
    } catch (backupError) {
      console.error('❌ Failed to run backup on server:');
      console.error(backupError.message);
      if (backupError.stderr) console.error(backupError.stderr);
      process.exit(1);
    }
  }

  // 2. Run remove-phone-spaces script on remote server
  console.log(`🚀 Executing phone cleanup on production server (${REMOTE_PROJECT_PATH})...`);
  const scriptArgs = isDryRun ? '--dry-run' : '';
  const runCommand = `source ~/.nvm/nvm.sh && cd ${REMOTE_PROJECT_PATH} && npm run remove-phone-spaces ${scriptArgs}`;

  try {
    const runOutput = execSync(`ssh ${SERVER_HOST} "${runCommand}"`, { encoding: 'utf8' });
    console.log('📤 Remote Execution Output:');
    console.log(runOutput);
  } catch (runError) {
    console.error('❌ Failed to execute cleanup script on server:');
    console.error(runError.message);
    if (runError.stderr) console.error(runError.stderr);
    process.exit(1);
  }

  console.log('🎉 Production operation completed!');
} catch (error) {
  console.error('❌ Unexpected error:', error.message);
  process.exit(1);
}
