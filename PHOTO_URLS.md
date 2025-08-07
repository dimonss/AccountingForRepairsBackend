# Конфигурация путей к фотографиям

## Обзор

Система автоматически генерирует правильные URL для фотографий в зависимости от окружения развертывания.

## Конфигурация

### Переменные окружения

```bash
# Окружение (development, production)
NODE_ENV=production
```

### Автоматические пути

| Окружение | Базовый путь | Пример URL |
|-----------|--------------|------------|
| `development` | `/photos` | `/photos/uuid.jpg` |
| `production` | `/repairs_accounting/photos` | `/repairs_accounting/photos/uuid.jpg` |

## Nginx конфигурация

### Для продакшена

```nginx
location ^~ /repairs_accounting/photos {
    alias /root/backend/AccountingForRepairsBackend/uploads/repairs;
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Для разработки

```nginx
location /photos {
    alias /path/to/backend/uploads/repairs;
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## Реализация

### Конфигурация (`src/config/photos.ts`)

```typescript
export const PHOTOS_CONFIG = {
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
  
  getPhotoUrl: (filename: string): string => {
    const basePath = PHOTOS_CONFIG.getPhotoBasePath();
    return `${basePath}/${filename}`;
  }
};
```

### Использование в коде

```typescript
import { PHOTOS_CONFIG } from '../config/photos';

// Генерация URL для фотографии
const photoUrl = PHOTOS_CONFIG.getPhotoUrl('uuid.jpg');
// Результат: /repairs_accounting/photos/uuid.jpg (production)
// Результат: /photos/uuid.jpg (development)
```

## API ответы

### GET /repairs (с фотографиями)

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "client_name": "Иван Петров",
      "photos": [
        {
          "id": 1,
          "filename": "uuid.jpg",
          "url": "/repairs_accounting/photos/uuid.jpg",
          "uploaded_at": "2025-08-07T10:30:00Z"
        }
      ]
    }
  ]
}
```

## Развертывание

### 1. Настройка Nginx

```bash
# Копируем конфигурацию
sudo cp nginx.conf /etc/nginx/sites-available/repairs-accounting

# Активируем сайт
sudo ln -s /etc/nginx/sites-available/repairs-accounting /etc/nginx/sites-enabled/

# Проверяем конфигурацию
sudo nginx -t

# Перезапускаем Nginx
sudo systemctl reload nginx
```

### 2. Переменные окружения

```bash
# .env.production
NODE_ENV=production
```

### 3. Структура файлов

```
/root/backend/AccountingForRepairsBackend/
├── uploads/
│   └── repairs/
│       ├── uuid1.jpg
│       ├── uuid2.png
│       └── ...
└── ...
```

## Тестирование

### Проверка URL генерации

```bash
# Development
NODE_ENV=development node -e "
const { PHOTOS_CONFIG } = require('./dist/config/photos');
console.log(PHOTOS_CONFIG.getPhotoUrl('test.jpg'));
"
# Вывод: /photos/test.jpg

# Production
NODE_ENV=production node -e "
const { PHOTOS_CONFIG } = require('./dist/config/photos');
console.log(PHOTOS_CONFIG.getPhotoUrl('test.jpg'));
"
# Вывод: /repairs_accounting/photos/test.jpg
```

### Проверка Nginx

```bash
# Тест статических файлов
curl -I https://yourdomain.com/repairs_accounting/photos/uuid.jpg

# Ожидаемый ответ:
# HTTP/1.1 200 OK
# Content-Type: image/jpeg
# Cache-Control: public, immutable
# Expires: Wed, 07 Aug 2026 10:30:00 GMT
``` 