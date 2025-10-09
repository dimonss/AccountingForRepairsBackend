# Скрипт для скачивания бэкапов с продакшена

Этот скрипт автоматически скачивает все бэкапы базы данных с продакшен сервера на локальную машину.

## Настройка

### 1. Добавьте в `.env` файл:
```env
SERVER_HOST=root@chalysh.pro
```

### 2. Убедитесь, что SSH ключ настроен:
```bash
# Проверьте подключение к серверу
ssh root@chalysh.pro "echo 'Connection successful'"
```

## Использование

### Запуск скрипта:
```bash
npm run download-backups
```

### Что делает скрипт:
1. **Проверяет подключение** к серверу
2. **Показывает список** доступных бэкапов на сервере
3. **Скачивает все файлы** `*.sqlite` из папки backups
4. **Сохраняет** в локальную папку `./backups_from_prod`
5. **Показывает результат** скачивания

## Пример вывода

```
🔄 Downloading backups from production server...

📁 Created directory: ./backups_from_prod
🔍 Checking connection to root@chalysh.pro...
✅ Server connection successful

📋 Available backups on server:
total 2456
drwxr-xr-x@  3 root  root       96 Sep 18 22:24 .
drwxr-xr-x  29 root  root      928 Sep 18 22:24 ..
-rw-r--r--@  1 root  root  1257472 Sep 18 22:24 db_backup_20250918_222443.sqlite

⬇️  Downloading backups...
db_backup_20250918_222443.sqlite                   100% 1228KB   1.2MB/s   00:01
✅ Backups downloaded successfully!

📁 Downloaded files:
total 2456
drwxr-xr-x@  3 chalyshdmitrii  staff       96 Sep 18 22:25 .
drwxr-xr-x  29 chalyshdmitrii  staff      928 Sep 18 22:25 ..
-rw-r--r--@  1 chalyshdmitrii  staff  1257472 Sep 18 22:25 db_backup_20250918_222443.sqlite

🎉 Backup download completed!
📂 Backups saved to: /Users/chalyshdmitrii/Documents/MyProject/AccountingForRepairs/AccountingForRepairsBackend/backups_from_prod
```

## Требования

- Node.js
- SSH доступ к серверу
- Настроенный SSH ключ
- Переменная `SERVER_HOST` в `.env`

## Устранение проблем

### Ошибка подключения:
```
❌ Cannot connect to server. Please check:
   - SSH key is configured
   - Server is accessible
   - SERVER_HOST in .env is correct
```

**Решение:**
1. Проверьте SSH ключ: `ssh-add -l`
2. Проверьте подключение: `ssh root@chalysh.pro`
3. Убедитесь, что `SERVER_HOST` в `.env` правильный

### Ошибка скачивания:
```
❌ Error downloading backups: ...
```

**Решение:**
1. Проверьте права доступа к папке backups на сервере
2. Убедитесь, что файлы существуют: `ssh root@chalysh.pro "ls -la /root/backend/AccountingForRepairsBackend/backups"`
