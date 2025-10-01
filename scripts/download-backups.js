#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration
const SERVER_HOST = process.env.SERVER_HOST;
const SERVER_BACKUP_PATH = '/root/backend/AccountingForRepairsBackend/backups';
const LOCAL_BACKUP_DIR = './backups_from_prod';

// Helper function to get file info (name, size, date)
function getFileInfo(fileLine) {
  const parts = fileLine.trim().split(/\s+/);
  if (parts.length < 9) return null;
  
  return {
    name: parts[8],
    size: parseInt(parts[4]),
    date: parts[5] + ' ' + parts[6] + ' ' + parts[7]
  };
}

// Helper function to get list of files from directory
function getFileList(host, path) {
  try {
    const command = host ? `ssh ${host} "ls -la ${path}"` : `ls -la ${path}`;
    const output = execSync(command, { encoding: 'utf8' });
    const lines = output.split('\n').filter(line => line.includes('.sqlite'));
    
    return lines.map(getFileInfo).filter(info => info !== null);
  } catch (error) {
    return [];
  }
}

// Helper function to compare files and find missing ones
function findMissingFiles(serverFiles, localFiles) {
  const localFileMap = new Map();
  localFiles.forEach(file => {
    localFileMap.set(file.name, file);
  });
  
  return serverFiles.filter(serverFile => {
    const localFile = localFileMap.get(serverFile.name);
    if (!localFile) {
      console.log(`  📥 Missing: ${serverFile.name} (not found locally)`);
      return true; // File doesn't exist locally
    }
    
    // Compare by size only - this is more reliable than date comparison
    if (serverFile.size !== localFile.size) {
      console.log(`  📥 Different size: ${serverFile.name} (server: ${serverFile.size}, local: ${localFile.size})`);
      return true;
    }
    
    console.log(`  ✅ Up to date: ${serverFile.name} (${serverFile.size} bytes)`);
    return false; // File exists and has same size
  });
}

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

  // Get list of files on server
  console.log('📋 Checking available backups on server...');
  const serverFiles = getFileList(SERVER_HOST, SERVER_BACKUP_PATH);
  
  if (serverFiles.length === 0) {
    console.log('⚠️  No backup files found on server');
    process.exit(0);
  }
  
  console.log(`Found ${serverFiles.length} backup files on server:`);
  serverFiles.forEach(file => {
    console.log(`  - ${file.name} (${file.size} bytes, ${file.date})`);
  });

  // Get list of local files
  console.log('\n📁 Checking local backup files...');
  const localFiles = getFileList(null, LOCAL_BACKUP_DIR);
  
  if (localFiles.length > 0) {
    console.log(`Found ${localFiles.length} local backup files:`);
    localFiles.forEach(file => {
      console.log(`  - ${file.name} (${file.size} bytes, ${file.date})`);
    });
  } else {
    console.log('No local backup files found');
  }

  // Find files that need to be downloaded
  console.log('\n🔍 Comparing files...');
  const missingFiles = findMissingFiles(serverFiles, localFiles);
  
  if (missingFiles.length === 0) {
    console.log('\n✅ All backup files are up to date! No downloads needed.');
    process.exit(0);
  }

  console.log(`\n⬇️  Need to download ${missingFiles.length} file(s):`);
  missingFiles.forEach(file => {
    console.log(`  - ${file.name} (${file.size} bytes, ${file.date})`);
  });

  // Download missing files
  console.log('\n🔄 Downloading missing backups...');
  let downloadedCount = 0;
  let errorCount = 0;

  for (const file of missingFiles) {
    try {
      console.log(`Downloading ${file.name}...`);
      execSync(`scp ${SERVER_HOST}:${SERVER_BACKUP_PATH}/${file.name} ${LOCAL_BACKUP_DIR}/`, { stdio: 'pipe' });
      console.log(`✅ Downloaded: ${file.name}`);
      downloadedCount++;
    } catch (error) {
      console.error(`❌ Failed to download ${file.name}:`, error.message);
      errorCount++;
    }
  }

  console.log(`\n📊 Download summary:`);
  console.log(`  - Successfully downloaded: ${downloadedCount}`);
  console.log(`  - Failed downloads: ${errorCount}`);
  console.log(`  - Total processed: ${missingFiles.length}`);

  if (errorCount > 0) {
    console.log('\n⚠️  Some files failed to download. Check the errors above.');
  } else {
    console.log('\n✅ All missing backups downloaded successfully!');
  }

  // List all local files after download
  console.log('\n📁 All local backup files:');
  try {
    const localBackups = execSync(`ls -la ${LOCAL_BACKUP_DIR}`, { encoding: 'utf8' });
    console.log(localBackups);
  } catch (error) {
    console.log('No files found in backup directory');
  }

  console.log('\n🎉 Backup synchronization completed!');
  console.log(`📂 Backups location: ${path.resolve(LOCAL_BACKUP_DIR)}`);

} catch (error) {
  console.error('❌ Unexpected error:', error.message);
  process.exit(1);
}
