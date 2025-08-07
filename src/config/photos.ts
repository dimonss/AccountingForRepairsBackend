// Конфигурация путей к фотографиям
export const PHOTOS_CONFIG = {
  // Базовый путь для фотографий в зависимости от окружения
  getPhotoBasePath: (): string => {
    const env = process.env.NODE_ENV || 'development';
    
    switch (env) {
      case 'production':
        return '/repairs_accounting/photos';
      case 'development':
      default:
        return '/photos';
    }
  },
  
  // Полный URL для фотографии
  getPhotoUrl: (filename: string): string => {
    const basePath = PHOTOS_CONFIG.getPhotoBasePath();
    return `${basePath}/${filename}`;
  }
}; 