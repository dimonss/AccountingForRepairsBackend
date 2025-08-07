import fs from 'fs';
import path from 'path';
import { logInfo, logWarn } from '../utils/logger';

interface LogFile {
  name: string;
  path: string;
  size: number;
  modified: Date;
}

// Функция для очистки старых логов
export const cleanupLogs = (maxAgeMonths: number = 6) => {
  const logsDir = path.join(process.cwd(), 'logs');
  
  if (!fs.existsSync(logsDir)) {
    console.log('📁 Logs directory does not exist');
    return;
  }
  
  const files = fs.readdirSync(logsDir);
  const logFiles: LogFile[] = [];
  
  // Собираем информацию о файлах логов
  for (const file of files) {
    if (file.endsWith('.log')) {
      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);
      
      logFiles.push({
        name: file,
        path: filePath,
        size: stats.size,
        modified: stats.mtime
      });
    }
  }
  
  // Сортируем по дате изменения
  logFiles.sort((a, b) => b.modified.getTime() - a.modified.getTime());
  
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - maxAgeMonths);
  
  let deletedCount = 0;
  let totalSizeFreed = 0;
  
  for (const file of logFiles) {
    if (file.modified < cutoffDate) {
      try {
        fs.unlinkSync(file.path);
        deletedCount++;
        totalSizeFreed += file.size;
        
        logInfo(`🗑️ Deleted old log file: ${file.name}`, {
          size: file.size,
          modified: file.modified,
          age: Math.floor((Date.now() - file.modified.getTime()) / (1000 * 60 * 60 * 24))
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logWarn(`Failed to delete log file: ${file.name}`, { error: errorMessage });
      }
    }
  }
  
  const totalSizeFreedMB = (totalSizeFreed / (1024 * 1024)).toFixed(2);
  
  console.log(`🧹 Log cleanup completed:`);
  console.log(`   • Deleted files: ${deletedCount}`);
  console.log(`   • Space freed: ${totalSizeFreedMB} MB`);
  console.log(`   • Cutoff date: ${cutoffDate.toISOString().split('T')[0]}`);
  
  logInfo('Log cleanup completed', {
    deletedCount,
    totalSizeFreed,
    cutoffDate: cutoffDate.toISOString()
  });
};

// Запуск если файл выполняется напрямую
if (require.main === module) {
  const maxAgeMonths = parseInt(process.argv[2]) || 6;
  cleanupLogs(maxAgeMonths);
}

export default cleanupLogs; 