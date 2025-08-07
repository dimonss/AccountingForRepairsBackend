import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Создаем папку для логов если её нет
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Формат для логов
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Функция для получения имени файла лога по текущему месяцу
const getLogFileName = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `app-${year}-${month}.log`;
};

// Создаем логгер
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Файл для всех логов текущего месяца
    new winston.transports.File({
      filename: path.join(logsDir, getLogFileName()),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 12, // Хранить до 12 файлов (год)
    }),
    
    // Файл для ошибок
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 12,
    }),
    
    // Консоль (только в development)
    ...(process.env.NODE_ENV === 'development' ? [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ] : [])
  ],
  // Не выходить из процесса при ошибках логирования
  exitOnError: false
});

// Функции для удобного логирования
export const logInfo = (message: string, meta?: any) => {
  logger.info(message, meta);
};

export const logError = (message: string, error?: any) => {
  logger.error(message, { error: error?.message || error, stack: error?.stack });
};

export const logWarn = (message: string, meta?: any) => {
  logger.warn(message, meta);
};

export const logDebug = (message: string, meta?: any) => {
  logger.debug(message, meta);
};

// Специальные функции для разных типов операций
export const logApiRequest = (method: string, url: string, userId?: number, ip?: string) => {
  logger.info('API Request', { method, url, userId, ip, timestamp: new Date().toISOString() });
};

export const logApiResponse = (method: string, url: string, statusCode: number, responseTime: number) => {
  logger.info('API Response', { method, url, statusCode, responseTime: `${responseTime}ms` });
};

export const logDatabaseOperation = (operation: string, table: string, recordId?: number, details?: any) => {
  logger.info('Database Operation', { operation, table, recordId, details });
};

export const logFileOperation = (operation: string, filename: string, filePath: string, details?: any) => {
  logger.info('File Operation', { operation, filename, filePath, details });
};

export const logSecurityEvent = (event: string, userId?: number, ip?: string, details?: any) => {
  logger.warn('Security Event', { event, userId, ip, details });
};

export const logRepairOperation = (operation: string, repairId: number, userId: number, details?: any) => {
  logger.info('Repair Operation', { operation, repairId, userId, details });
};

export const logPhotoOperation = (operation: string, repairId: number, filename: string, userId: number, details?: any) => {
  logger.info('Photo Operation', { operation, repairId, filename, userId, details });
};

export default logger; 