// Генерация дополнительных 90 записей
export const generateAdditionalRepairs = () => {
  const additionalRepairs = [];
  
  const brands = ['Apple', 'Samsung', 'Xiaomi', 'Huawei', 'OnePlus', 'Google', 'Sony', 'LG', 'Asus', 'Acer'];
  const models: Record<string, string[]> = {
    smartphone: ['iPhone 15', 'iPhone 14', 'Galaxy S24', 'Galaxy A55', 'Mi 14', 'P60 Pro', 'OnePlus 12', 'Pixel 8', 'Xperia 1 V', 'G8 ThinQ'],
    laptop: ['MacBook Pro', 'MacBook Air', 'Galaxy Book', 'MateBook', 'Mi Notebook', 'ZenBook', 'Swift', 'ThinkPad', 'IdeaPad', 'VivoBook'],
    tablet: ['iPad Air', 'iPad Pro', 'Galaxy Tab S9', 'Mi Pad', 'MatePad', 'OnePlus Pad', 'Pixel Tablet', 'Xperia Tablet', 'G Pad', 'Chromebook Tab'],
    desktop: ['iMac', 'Mac Pro', 'Galaxy Desktop', 'MateStation', 'Mi Desktop', 'Zen AiO', 'Aspire', 'ThinkCentre', 'IdeaCentre', 'VivoMini'],
    monitor: ['Studio Display', 'UltraFine', 'Odyssey', 'MateView', 'Mi Display', 'ProArt', 'Predator', 'ThinkVision', 'IdeaCentre', 'VivoBook'],
    printer: ['LaserJet', 'OfficeJet', 'Pixma', 'EcoTank', 'WorkForce', 'Pixma Pro', 'LaserJet Pro', 'OfficeJet Pro', 'Pixma TS', 'EcoTank Pro']
  };
  
  const deviceTypes = ['smartphone', 'laptop', 'tablet', 'desktop', 'monitor', 'printer'];
  const repairStatuses = ['pending', 'in_progress', 'waiting_parts', 'completed', 'cancelled'];
  const clientNames = [
    'Александр Иванов', 'Елена Петрова', 'Михаил Сидоров', 'Анна Козлова', 'Дмитрий Волков',
    'Ольга Лебедева', 'Сергей Новиков', 'Мария Морозова', 'Андрей Крылов', 'Татьяна Соколова',
    'Владимир Попов', 'Наталья Лебедева', 'Игорь Семенов', 'Екатерина Васильева', 'Павел Романов',
    'Юлия Воробьева', 'Алексей Соловьев', 'Ирина Зайцева', 'Николай Борисов', 'Людмила Алексеева'
  ];
  
  const issueDescriptions = [
    'Треснул экран после падения', 'Не включается, индикатор заряда не горит', 'Не работает тачскрин',
    'Быстро разряжается батарея', 'Компьютер выключается во время игр', 'Замятие бумаги, не печатает',
    'Не работает камера', 'Полосы на экране, искаженные цвета', 'Залили клавиатуру кофе',
    'Не заряжается, разъем поврежден', 'Не работает Wi-Fi', 'Перегревается во время работы',
    'Не работает звук', 'Проблемы с микрофоном', 'Не работает Bluetooth',
    'Медленно работает система', 'Не загружается операционная система', 'Проблемы с аккумулятором',
    'Не работает сенсор', 'Проблемы с зарядкой', 'Не работает динамик',
    'Проблемы с дисплеем', 'Не работает клавиатура', 'Проблемы с тачпадом',
    'Не работает веб-камера', 'Проблемы с сетевой картой', 'Не работает USB порты'
  ];

  for (let i = 11; i <= 100; i++) {
    const deviceType = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
    const brand = brands[Math.floor(Math.random() * brands.length)];
    const model = models[deviceType][Math.floor(Math.random() * models[deviceType].length)];
    const repairStatus = repairStatuses[Math.floor(Math.random() * repairStatuses.length)];
    const clientName = clientNames[Math.floor(Math.random() * clientNames.length)];
    const issueDescription = issueDescriptions[Math.floor(Math.random() * issueDescriptions.length)];
    
    const estimatedCost = Math.floor(Math.random() * 30000) + 2000;
    const actualCost = repairStatus === 'completed' ? Math.floor(estimatedCost * 0.9) : null;
    
    const repair = {
      device_type: deviceType,
      brand: brand,
      model: model,
      serial_number: Math.random() > 0.3 ? `${brand.substring(0, 3).toUpperCase()}${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}` : null,
      repair_number: `${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`,
      client_name: clientName,
      client_phone: `+7-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
      client_email: Math.random() > 0.2 ? `${clientName.toLowerCase().replace(' ', '.')}@${['gmail.com', 'yandex.ru', 'mail.ru', 'outlook.com'][Math.floor(Math.random() * 4)]}` : null,
      issue_description: issueDescription,
      repair_status: repairStatus,
      estimated_cost: estimatedCost,
      actual_cost: actualCost,
      notes: Math.random() > 0.5 ? `Заметка для ремонта #${i}: ${['Срочный ремонт', 'Корпоративный клиент', 'Гарантийный случай', 'Повторный ремонт', 'Диагностика требуется'][Math.floor(Math.random() * 5)]}` : null
    };
    
    additionalRepairs.push(repair);
  }
  
  return additionalRepairs;
};

// Генерация дополнительных запчастей
export const generateAdditionalParts = () => {
  const additionalParts = [];
  
  const partNames = [
    'Screen Assembly', 'Logic Board', 'Touchscreen', 'Battery', 'Keyboard', 'Charging Port',
    'Camera Module', 'Speaker', 'Microphone', 'Wi-Fi Module', 'Bluetooth Module', 'USB Port',
    'Power Supply', 'Cooling Fan', 'Hard Drive', 'SSD', 'RAM Module', 'Graphics Card',
    'Motherboard', 'Processor', 'Network Card', 'Audio Card', 'Printer Head', 'Ink Cartridge',
    'Paper Tray', 'Roller Kit', 'Fuser Unit', 'Transfer Belt', 'Drum Unit', 'Toner Cartridge'
  ];
  
  const brands = ['Apple', 'Samsung', 'Xiaomi', 'Huawei', 'OnePlus', 'Google', 'Sony', 'LG', 'Asus', 'Acer', 'HP', 'Canon', 'Epson', 'Brother'];
  const suppliers = ['Apple Authorized', 'Samsung Parts', 'Xiaomi Service', 'Huawei Parts', 'OnePlus Official', 'Google Store', 'Sony Parts', 'LG Display', 'Asus Parts', 'Acer Parts', 'HP Parts Center', 'Canon Parts', 'Epson Parts', 'Brother Parts'];
  
  for (let i = 9; i <= 50; i++) {
    const brand = brands[Math.floor(Math.random() * brands.length)];
    const partName = partNames[Math.floor(Math.random() * partNames.length)];
    const supplier = suppliers[Math.floor(Math.random() * suppliers.length)];
    const cost = Math.floor(Math.random() * 20000) + 1000;
    const quantity = Math.floor(Math.random() * 20);
    
    const part = {
      name: `${brand} ${partName}`,
      description: `Оригинальная запчасть ${partName} для устройств ${brand}`,
      cost: cost,
      quantity_in_stock: quantity,
      supplier: supplier
    };
    
    additionalParts.push(part);
  }
  
  return additionalParts;
}; 