export const LOG_CONFIG = {
  // Уровни логирования
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
  },
  
  // Цвета для консоли
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'blue'
  },
  
  // Настройки ротации файлов
  fileRotation: {
    maxSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 12, // Хранить до 12 файлов (год)
    datePattern: 'YYYY-MM'
  },
  
  // Настройки для разных окружений
  environments: {
    development: {
      level: 'debug',
      console: true,
      file: true
    },
    production: {
      level: 'info',
      console: false,
      file: true
    },
    test: {
      level: 'error',
      console: false,
      file: false
    }
  }
};

// Функция для получения конфигурации по окружению
export const getLogConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  return LOG_CONFIG.environments[env as keyof typeof LOG_CONFIG.environments] || LOG_CONFIG.environments.development;
}; 