#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const envDefaults = {
    PORT: '3001',
    NODE_ENV: 'development',
    DB_NAME: 'testDB.sqlite',
    CORS_ORIGIN: 'http://localhost:5173',
    JWT_SECRET: 'test-jwt-secret-key-for-testing-only',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '30d',
    BCRYPT_ROUNDS: '12',
    DB_NAME_FOR_INSERT_MOCK_DATA: 'testDB.sqlite'
};

function createEnvFile() {
    const envPath = path.join(__dirname, '..', '.env');

    if (fs.existsSync(envPath)) {
        console.log('⚠️  .env файл уже существует!');
        console.log('Используйте npm run generate-env для интерактивной настройки');
        return;
    }

    const fullContent = `# Server Configuration
PORT=${envDefaults.PORT}
NODE_ENV=${envDefaults.NODE_ENV}

# Database Configuration
DB_NAME=${envDefaults.DB_NAME}

# CORS Configuration
CORS_ORIGIN=${envDefaults.CORS_ORIGIN}

# JWT Configuration
JWT_SECRET=${envDefaults.JWT_SECRET}
JWT_ACCESS_EXPIRES_IN=${envDefaults.JWT_ACCESS_EXPIRES_IN}
JWT_REFRESH_EXPIRES_IN=${envDefaults.JWT_REFRESH_EXPIRES_IN}

# Password Hashing
BCRYPT_ROUNDS=${envDefaults.BCRYPT_ROUNDS}

# Database for mock data (optional)
DB_NAME_FOR_INSERT_MOCK_DATA=${envDefaults.DB_NAME_FOR_INSERT_MOCK_DATA}
`;

    try {
        fs.writeFileSync(envPath, fullContent);
        console.log('✅ .env файл успешно создан!');
        console.log(`📁 Путь: ${envPath}`);
        console.log('\n📋 Созданные переменные:');

        Object.entries(envDefaults).forEach(([key, value]) => {
            if (key === 'JWT_SECRET') {
                console.log(`   ${key}=${value.substring(0, 20)}...`);
            } else {
                console.log(`   ${key}=${value}`);
            }
        });

        console.log('\n⚠️  ВАЖНО:');
        console.log('   - Измените JWT_SECRET в продакшене!');
        console.log('   - Убедитесь, что .env файл добавлен в .gitignore');
        console.log('   - Не коммитьте .env файл в репозиторий');

        console.log('\n🚀 Теперь можно запустить сервер:');
        console.log('   npm run dev');

    } catch (error) {
        console.error('❌ Ошибка при создании .env файла:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    createEnvFile();
}