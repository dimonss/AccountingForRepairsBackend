import { Request, Response, NextFunction } from 'express';
import { logApiRequest, logApiResponse, logSecurityEvent } from '../utils/logger';

// Middleware для логирования запросов
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  // Исключаем GET запросы к фотографиям из логирования
  if (req.method === 'GET' && req.path.startsWith('/photos/')) {
    return next();
  }
  
  const startTime = Date.now();
  
  // Получаем IP адрес
  const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] as string;
  
  // Получаем ID пользователя из JWT токена если есть
  const userId = (req as any).user?.id;
  
  // Логируем запрос
  logApiRequest(req.method, req.path, userId, ip);
  
  // Перехватываем ответ для логирования
  const originalSend = res.send;
  res.send = function(data) {
    const responseTime = Date.now() - startTime;
    logApiResponse(req.method, req.path, res.statusCode, responseTime);
    return originalSend.call(this, data);
  };
  
  next();
};

// Middleware для логирования ошибок
export const errorLogger = (error: Error, req: Request, res: Response, next: NextFunction) => {
  // Исключаем ошибки GET запросов к фотографиям из логирования
  if (req.method === 'GET' && req.path.startsWith('/photos/')) {
    return next(error);
  }
  
  const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] as string;
  const userId = (req as any).user?.id;
  
  logSecurityEvent('API Error', userId, ip, {
    method: req.method,
    url: req.path,
    error: error.message,
    stack: error.stack
  });
  
  next(error);
};

// Middleware для логирования попыток доступа к защищенным маршрутам
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  // Исключаем GET запросы к фотографиям из логирования безопасности
  if (req.method === 'GET' && req.path.startsWith('/photos/')) {
    return next();
  }
  
  const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] as string;
  
  // Логируем попытки доступа к защищенным маршрутам
  if (req.path.startsWith('/repairs') || req.path.startsWith('/auth')) {
    const userId = (req as any).user?.id;
    
    if (!userId && req.method !== 'POST' && !req.path.includes('/login')) {
      logSecurityEvent('Unauthorized Access Attempt', undefined, ip, {
        method: req.method,
        url: req.path,
        userAgent: req.headers['user-agent']
      });
    }
  }
  
  next();
}; 