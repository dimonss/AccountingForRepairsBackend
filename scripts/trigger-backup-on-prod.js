#!/usr/bin/env node

const { execSync } = require('child_process');
require('dotenv').config();

// Configuration
const SERVER_HOST = process.env.SERVER_HOST;
const REMOTE_PROJECT_PATH = process.env.REMOTE_PROJECT_PATH;

console.log('🔄 Triggering database backup on production server...\n');

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

    // Trigger backup on remote server
    console.log('🗄️  Running backup command on production server...');
    console.log(`   Path: ${REMOTE_PROJECT_PATH}`);
    console.log('');

    // Need to source NVM in non-interactive SSH session
    const backupCommand = `source ~/.nvm/nvm.sh && cd ${REMOTE_PROJECT_PATH} && npm run backup-db`;

    try {
        const output = execSync(`ssh ${SERVER_HOST} "${backupCommand}"`, { encoding: 'utf8' });
        console.log('📤 Server output:');
        console.log(output);
    } catch (error) {
        console.error('❌ Failed to run backup on server:');
        console.error(error.message);
        if (error.stderr) {
            console.error(error.stderr);
        }
        process.exit(1);
    }

    // List backups on server to confirm
    console.log('\n📋 Checking backups on server...');
    try {
        const listOutput = execSync(`ssh ${SERVER_HOST} "ls -la ${REMOTE_PROJECT_PATH}/backups | tail -10"`, { encoding: 'utf8' });
        console.log('Recent backups on server:');
        console.log(listOutput);
    } catch (error) {
        console.log('⚠️  Could not list backups directory');
    }

    console.log('🎉 Backup triggered successfully on production server!');
    console.log('\n💡 Tip: Run "npm run download-backups" to download the new backup to your local machine.');

} catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
}
