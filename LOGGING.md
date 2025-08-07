# Система логирования

## Обзор

Система логирования использует библиотеку Winston для профессионального логирования с ротацией файлов по месяцам.

## Структура файлов

```
logs/
├── app-2025-08.log          # Логи текущего месяца
├── app-2025-07.log          # Логи предыдущего месяца
├── error.log                # Только ошибки
└── ...
```

## Конфигурация

### Переменные окружения

```bash
# Уровень логирования (error, warn, info, debug)
LOG_LEVEL=info

# Окружение (development, production, test)
NODE_ENV=development
```

### Уровни логирования

- **error** - Критические ошибки
- **warn** - Предупреждения и события безопасности
- **info** - Информационные сообщения (по умолчанию)
- **debug** - Отладочная информация (только в development)

## Типы логов

### API запросы
```javascript
logApiRequest('GET', '/repairs', 123, '192.168.1.1');
logApiResponse('GET', '/repairs', 200, 150);
```

**Исключения:**
- GET запросы к фотографиям (`/photos/*`) не логируются для уменьшения шума

### Операции с ремонтами
```javascript
logRepairOperation('create_repair', 456, 123, { deviceType: 'smartphone' });
logRepairOperation('delete_repair', 456, 123, { deletedFilesCount: 3 });
```

### Операции с фотографиями
```javascript
logPhotoOperation('upload_photo', 456, 'uuid.jpg', 123, { fileSize: 1024000 });
logPhotoOperation('delete_photo', 456, 'uuid.jpg', 123, { photoId: 789 });
```

### Операции с файлами
```javascript
logFileOperation('save_photo_file', 'uuid.jpg', '/path/to/file.jpg', { repairId: 456 });
logFileOperation('delete_photo_file', 'uuid.jpg', '/path/to/file.jpg', { repairId: 456 });
```

### События безопасности
```javascript
logSecurityEvent('Unauthorized Access Attempt', undefined, '192.168.1.1', { url: '/repairs' });
logSecurityEvent('API Error', 123, '192.168.1.1', { error: 'Database connection failed' });
```

## Ротация файлов

### Автоматическая ротация
- **По месяцам**: `app-2025-08.log`, `app-2025-09.log`
- **Максимальный размер**: 10MB на файл
- **Количество файлов**: До 12 файлов (год)

### Ручная очистка
```bash
# Очистить логи старше 6 месяцев (по умолчанию)
npm run cleanup-logs

# Очистить логи старше 3 месяцев
npm run cleanup-logs 3
```

## Формат логов

### JSON формат
```json
{
  "level": "info",
  "message": "API Request",
  "timestamp": "2025-08-07 10:30:45",
  "method": "GET",
  "url": "/repairs",
  "userId": 123,
  "ip": "192.168.1.1"
}
```

### Структурированные данные
- **timestamp** - Время события
- **level** - Уровень логирования
- **message** - Основное сообщение
- **meta** - Дополнительные данные

## Мониторинг

### Просмотр логов
```bash
# Текущий месяц
tail -f logs/app-$(date +%Y-%m).log

# Только ошибки
tail -f logs/error.log

# Поиск по логам
grep "delete_repair" logs/app-2025-08.log
```

### Анализ логов
```bash
# Подсчет операций с ремонтами
grep "Repair Operation" logs/app-2025-08.log | wc -l

# Поиск ошибок
grep '"level":"error"' logs/error.log

# Анализ API запросов
grep "API Request" logs/app-2025-08.log | jq '.url' | sort | uniq -c
```

## Безопасность

### Логируемые данные
- ✅ IP адреса
- ✅ ID пользователей
- ✅ HTTP методы и URL
- ✅ Время выполнения запросов
- ✅ Операции с файлами
- ❌ Пароли и токены
- ❌ Персональные данные клиентов
- ❌ GET запросы к фотографиям (для уменьшения шума)

### Очистка логов
- Автоматическая ротация по месяцам
- Ручная очистка старых файлов
- Ограничение размера файлов

## Интеграция

### Middleware
- `requestLogger` - Логирование HTTP запросов
- `errorLogger` - Логирование ошибок
- `securityLogger` - Логирование событий безопасности

### Операции
- Создание/удаление ремонтов
- Загрузка/удаление фотографий
- Операции с файлами
- События безопасности

## Примеры использования

### В коде
```typescript
import { logInfo, logError, logRepairOperation } from '../utils/logger';

// Информационное сообщение
logInfo('User logged in', { userId: 123, username: 'john' });

// Ошибка
logError('Database connection failed', error);

// Операция с ремонтом
logRepairOperation('create_repair', repairId, userId, { deviceType: 'laptop' });
```

### В middleware
```typescript
import { requestLogger, errorLogger } from '../middleware/logging';

app.use(requestLogger);
app.use(errorLogger);
``` 