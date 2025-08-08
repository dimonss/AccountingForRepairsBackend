// Mock data for repairs
export const mockRepairs = [
  {
    device_type: 'smartphone',
    brand: 'Apple',
    model: 'iPhone 14 Pro',
    serial_number: 'A1B2C3D4E5F6',
    repair_number: '001234',
    client_name: 'Иван Петров',
    client_phone: '+7-999-123-45-67',
    client_email: 'ivan.petrov@email.com',
    issue_description: 'Треснул экран после падения',
    repair_status: 'pending',
    estimated_cost: 15000.00,
    notes: 'Клиент торопится, желательно сделать быстрее'
  },
  {
    device_type: 'laptop',
    brand: 'MacBook',
    model: 'MacBook Air M2',
    serial_number: 'MBA2023001',
    repair_number: '002345',
    client_name: 'Мария Сидорова',
    client_phone: '+7-912-345-67-89',
    client_email: 'maria.sidorova@company.ru',
    issue_description: 'Не включается, индикатор заряда не горит',
    repair_status: 'in_progress',
    estimated_cost: 25000.00,
    actual_cost: 22500.00,
    notes: 'Заменена материнская плата'
  },
  {
    device_type: 'tablet',
    brand: 'Samsung',
    model: 'Galaxy Tab S8',
    serial_number: 'SGT2023007',
    repair_number: '003456',
    client_name: 'Алексей Козлов',
    client_phone: '+7-905-234-56-78',
    client_email: 'alex.kozlov@gmail.com',
    issue_description: 'Не работает тачскрин в нижней части экрана',
    repair_status: 'waiting_parts',
    estimated_cost: 12000.00,
    notes: 'Ожидаем поставку тачскрина'
  },
  {
    device_type: 'smartphone',
    brand: 'Samsung',
    model: 'Galaxy S23 Ultra',
    serial_number: 'SGS23U2023',
    repair_number: '004567',
    client_name: 'Ольга Михайлова',
    client_phone: '+7-903-456-78-90',
    client_email: null,
    issue_description: 'Быстро разряжается батарея',
    repair_status: 'completed',
    estimated_cost: 8000.00,
    actual_cost: 7500.00,
    notes: 'Заменена батарея, проведена диагностика'
  },
  {
    device_type: 'desktop',
    brand: 'Custom Build',
    model: 'Gaming PC',
    serial_number: null,
    repair_number: '005678',
    client_name: 'Дмитрий Волков',
    client_phone: '+7-911-567-89-01',
    client_email: 'dmitry.volkov@gaming.ru',
    issue_description: 'Компьютер выключается во время игр',
    repair_status: 'pending',
    estimated_cost: 15000.00,
    notes: 'Возможно проблема с блоком питания или перегрев'
  },
  {
    device_type: 'printer',
    brand: 'HP',
    model: 'LaserJet Pro M404n',
    serial_number: 'HP404LJ2023',
    repair_number: '006789',
    client_name: 'ООО "Офис Центр"',
    client_phone: '+7-495-123-45-67',
    client_email: 'office@center.ru',
    issue_description: 'Замятие бумаги, не печатает',
    repair_status: 'in_progress',
    estimated_cost: 3500.00,
    notes: 'Корпоративный клиент, приоритет'
  },
  {
    device_type: 'smartphone',
    brand: 'Xiaomi',
    model: 'Mi 13 Pro',
    serial_number: 'XMI13P2023',
    repair_number: '007890',
    client_name: 'Анна Лебедева',
    client_phone: '+7-925-678-90-12',
    client_email: 'anna.lebedeva@yandex.ru',
    issue_description: 'Не работает камера',
    repair_status: 'cancelled',
    estimated_cost: 10000.00,
    notes: 'Клиент отказался от ремонта из-за высокой стоимости'
  },
  {
    device_type: 'monitor',
    brand: 'LG',
    model: 'UltraWide 34WP65C',
    serial_number: 'LG34WP2023',
    repair_number: '008901',
    client_name: 'Сергей Новиков',
    client_phone: '+7-916-789-01-23',
    client_email: 'sergey.novikov@design.com',
    issue_description: 'Полосы на экране, искаженные цвета',
    repair_status: 'completed',
    estimated_cost: 20000.00,
    actual_cost: 18000.00,
    notes: 'Заменена матрица, гарантия 6 месяцев'
  },
  {
    device_type: 'laptop',
    brand: 'Lenovo',
    model: 'ThinkPad X1 Carbon',
    serial_number: 'LNV-X1C-2023',
    repair_number: '009012',
    client_name: 'Елена Морозова',
    client_phone: '+7-909-012-34-56',
    client_email: 'elena.morozova@corporate.ru',
    issue_description: 'Залили клавиатуру кофе',
    repair_status: 'in_progress',
    estimated_cost: 12000.00,
    notes: 'Требуется замена клавиатуры и чистка'
  },
  {
    device_type: 'tablet',
    brand: 'iPad',
    model: 'iPad Pro 12.9"',
    serial_number: 'IPAD129P2023',
    repair_number: '010123',
    client_name: 'Михаил Крылов',
    client_phone: '+7-963-345-67-89',
    client_email: 'mikhail.krylov@artist.ru',
    issue_description: 'Не заряжается, разъем поврежден',
    repair_status: 'pending',
    estimated_cost: 8500.00,
    notes: 'Для работы с графикой, срочный ремонт'
  }
];

// Mock data for parts
export const mockParts = [
  {
    name: 'iPhone 14 Pro Screen Assembly',
    description: 'Оригинальный дисплей для iPhone 14 Pro с тачскрином',
    cost: 12000.00,
    quantity_in_stock: 5,
    supplier: 'Apple Authorized'
  },
  {
    name: 'MacBook Air M2 Logic Board',
    description: 'Материнская плата для MacBook Air M2 8GB/256GB',
    cost: 18000.00,
    quantity_in_stock: 2,
    supplier: 'Mac Parts Supply'
  },
  {
    name: 'Galaxy Tab S8 Touchscreen',
    description: 'Тачскрин для Samsung Galaxy Tab S8',
    cost: 8000.00,
    quantity_in_stock: 0,
    supplier: 'Samsung Parts'
  },
  {
    name: 'Galaxy S23 Ultra Battery',
    description: 'Аккумулятор для Samsung Galaxy S23 Ultra 5000mAh',
    cost: 5000.00,
    quantity_in_stock: 8,
    supplier: 'Samsung Original'
  },
  {
    name: 'HP LaserJet Roller Kit',
    description: 'Комплект роликов для HP LaserJet Pro M404',
    cost: 1500.00,
    quantity_in_stock: 12,
    supplier: 'HP Parts Center'
  },
  {
    name: 'LG Monitor Panel 34"',
    description: 'Матрица для монитора LG UltraWide 34"',
    cost: 15000.00,
    quantity_in_stock: 1,
    supplier: 'LG Display'
  },
  {
    name: 'ThinkPad Keyboard RU',
    description: 'Клавиатура для Lenovo ThinkPad X1 Carbon, русская раскладка',
    cost: 4500.00,
    quantity_in_stock: 3,
    supplier: 'Lenovo Parts'
  },
  {
    name: 'iPad Pro Charging Port',
    description: 'Разъем зарядки для iPad Pro 12.9"',
    cost: 2500.00,
    quantity_in_stock: 6,
    supplier: 'iPad Repair Parts'
  }
]; 