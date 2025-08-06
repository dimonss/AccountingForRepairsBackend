import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { initDatabase } from './database/init';
import repairRoutes from './routes/repairs';
import authRoutes from './routes/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '5mb' })); // Увеличиваем лимит для base64 изображений
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files for photo uploads - serve repair photos
// URL: /photos/{filename} → uploads/repairs/{filename}
app.use('/photos', (req, res, next) => {
  // Check if this is a photo request: /{filename}
  const filename = req.path.substring(1); // Remove leading slash
  if (filename) {
    // Security: validate filename (allow safe characters and common formats)
    const decodedFilename = decodeURIComponent(filename);
    if (!/^[a-zA-Z0-9\-_.\s]+\.(jpg|jpeg|png|webp)$/i.test(decodedFilename)) {
      return res.status(400).json({ success: false, error: 'Invalid filename format' });
    }
    
    const filePath = path.join(process.cwd(), 'uploads', 'repairs', decodedFilename);
    
    // Security: ensure path is within uploads directory
    const normalizedPath = path.resolve(filePath);
    const uploadsPath = path.resolve(path.join(process.cwd(), 'uploads', 'repairs'));
    if (!normalizedPath.startsWith(uploadsPath)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    // Set proper MIME type based on file extension
    const ext = path.extname(decodedFilename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg', 
      '.png': 'image/png',
      '.webp': 'image/webp'
    };
    
    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    
    // Set caching and security headers
    res.set({
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=31536000, immutable', // 1 year cache
      'ETag': `"${decodedFilename}"`,
      'Accept-Ranges': 'bytes',
      'X-Content-Type-Options': 'nosniff'
    });
    
    // Send file with proper error handling
    res.sendFile(filePath, (err) => {
      if (err) {
        // Check if response was already sent to avoid "Cannot set headers after they are sent" error
        if (res.headersSent) {
          console.error('Headers already sent, cannot send error response:', err);
          return;
        }

        const nodeErr = err as NodeJS.ErrnoException;
        if (nodeErr.code === 'ENOENT') {
          res.status(404).json({ success: false, error: 'Photo not found' });
        } else if (nodeErr.code === 'EACCES') {
          res.status(403).json({ success: false, error: 'Access denied' });
        } else if (nodeErr.code === 'EPIPE') {
          // Client disconnected, don't try to send response
          console.log('Client disconnected while serving photo');
        } else {
          console.error('Error serving photo:', err);
          res.status(500).json({ success: false, error: 'Internal server error' });
        }
      }
    });
  } else {
    next();
  }
});

// Routes
app.use('/auth', authRoutes);
app.use('/repairs', repairRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Initialize database and start server
async function startServer() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('🔒 Authentication is enabled');
      console.log('📋 Create your first admin user using: npm run create-admin');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 