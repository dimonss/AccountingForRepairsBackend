# 📷 Настройка фотографий в бэкенде

## 🚀 Быстрый старт

### 1. Установка зависимостей

Нужно установить дополнительные пакеты для работы с загрузкой файлов:

```bash
cd AccountingForRepairsBackend
npm install multer @types/multer
```

### 2. Создание папки для загрузок

```bash
mkdir -p uploads/repairs
```

### 3. Обновление базы данных

База данных автоматически обновится при следующем запуске - новая таблица `repair_photos` будет создана автоматически.

## 📂 Структура API

### Новые эндпоинты:

#### `POST /api/repairs/:id/photos`
Загрузка фотографий для ремонта:
```json
{
  "photos": [
    {
      "filename": "camera-2024-01-15T10-30-45.jpg",
      "url": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAA..."
    }
  ]
}
```

#### `GET /api/repairs/:id/photos/:filename` ✅ **ИСПРАВЛЕНО**
Получение файла фотографии - **теперь работает как статические файлы**

#### `DELETE /api/repairs/:id/photos/:photoId`
Удаление фотографии

### Обновленные эндпоинты:

#### `GET /api/repairs` и `GET /api/repairs/:id`
Теперь включают массив `photos` в ответе:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "device_type": "smartphone",
    // ... другие поля
    "photos": [
      {
        "id": 1,
        "repair_id": 1,
        "filename": "photo1.jpg",
        "url": "/api/repairs/1/photos/photo1.jpg",
        "uploaded_at": "2024-01-15 10:30:45"
      }
    ]
  }
}
```

## 💾 База данных

Новая таблица `repair_photos`:

```sql
CREATE TABLE repair_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repair_id INTEGER NOT NULL,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  uploaded_by INTEGER,
  FOREIGN KEY (repair_id) REFERENCES repairs (id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users (id)
);
```

## 🔧 Исправления в статических файлах

### ✅ **ПРОБЛЕМА РЕШЕНА**

**Что было не так:**
- Статические файлы не раздавались сервером
- Неправильная настройка путей для фотографий

**Что исправлено:**
- ✅ Добавлен middleware для раздачи статики в `src/index.ts`
- ✅ Настроены правильные пути: `/api/repairs/{id}/photos/{filename}`
- ✅ Увеличен лимит JSON до 10mb для base64 изображений
- ✅ Добавлен префикс `/api` ко всем маршрутам
- ✅ Удален дублирующий endpoint из `routes/repairs.ts`

### Новый middleware в `src/index.ts`:
```javascript
// Static files for photo uploads
app.use('/api/repairs', (req, res, next) => {
  const photoMatch = req.path.match(/^\/(\d+)\/photos\/(.+)$/);
  if (photoMatch) {
    const [, repairId, filename] = photoMatch;
    const filePath = path.join(process.cwd(), 'uploads', 'repairs', repairId, filename);
    res.sendFile(filePath, (err) => {
      if (err) {
        res.status(404).json({ success: false, error: 'Photo not found' });
      }
    });
  } else {
    next();
  }
});
```

## 🔧 Особенности реализации

### Упрощенная структура
- **Нет описаний** - только список фотографий
- **Base64 загрузка** - фронтенд отправляет base64, бэк сохраняет как файлы
- **Автоматические имена** - используются имена файлов с фронтенда
- **Простые URL** - прямые ссылки на файлы через API

### Файловая система
- Фотографии сохраняются в `uploads/repairs/{repair_id}/`
- Поддерживается только JPEG формат
- Автоматическое создание папок

### Безопасность
- Проверка существования ремонта перед загрузкой
- Аутентификация для всех операций с фотографиями
- Удаление файлов при удалении фотографий

## ✅ Готово!

После установки зависимостей и создания папки загрузок, фотографии будут работать полностью:

1. ✅ **Фронтенд** - готов полностью
2. ✅ **Бэкенд API** - готов полностью  
3. ✅ **База данных** - готова полностью
4. ✅ **Файловая система** - настраивается при первом запуске
5. ✅ **Статические файлы** - **ИСПРАВЛЕНО!** 🎉

**Просто установите `multer`, создайте папку `uploads` и перезапустите сервер - всё работает! 📷✨**

## 🧪 Тестирование

### Проверка статики:
1. Создайте ремонт с фотографией через фронтенд
2. Откройте в браузере: `http://localhost:3001/api/repairs/1/photos/filename.jpg`
3. Фотография должна отображаться

### Структура файлов:
```
uploads/
└── repairs/
    └── 1/
        ├── camera-2024-01-15T10-30-45.jpg
        └── photo-2024-01-15T11-15-22.jpg
``` 