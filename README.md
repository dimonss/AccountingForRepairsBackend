# Accounting for Repairs - Backend

Express.js backend server with TypeScript for the Accounting for Repairs application.

## Features

- **RESTful API** for repair management
- **SQLite3 Database** with automatic initialization
- **TypeScript** for type safety
- **Express.js** with modern middleware
- **CORS** enabled for frontend communication
- **Security** with Helmet middleware
- **Logging** with Morgan middleware

## Prerequisites

- Node.js 24.x (use NVM)
- npm

## Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Environment Variables

Create a `.env` file in the root directory:

```
PORT=3001
NODE_ENV=development
DB_NAME=repairs.db
CORS_ORIGIN=http://localhost:5173
```

## API Endpoints

### Health Check
- `GET /api/health` - Server health status

### Repairs
- `GET /api/repairs` - Get all repairs
- `GET /api/repairs/:id` - Get specific repair by ID
- `POST /api/repairs` - Create new repair
- `PUT /api/repairs/:id` - Update existing repair
- `DELETE /api/repairs/:id` - Delete repair
- `PATCH /api/repairs/:id/status` - Update repair status

## Database Schema

### Repairs Table
```sql
CREATE TABLE repairs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_type TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  serial_number TEXT,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_email TEXT,
  issue_description TEXT NOT NULL,
  repair_status TEXT NOT NULL DEFAULT 'pending',
  estimated_cost DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  parts_cost DECIMAL(10,2) DEFAULT 0,
  labor_cost DECIMAL(10,2) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  notes TEXT
);
```

### Status History Table
```sql
CREATE TABLE repair_status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repair_id INTEGER NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  FOREIGN KEY (repair_id) REFERENCES repairs (id) ON DELETE CASCADE
);
```

## Development

The server uses nodemon for development with automatic TypeScript compilation and restart on file changes.

```bash
# Development mode with auto-restart
npm run dev

# Build TypeScript to JavaScript
npm run build

# Production mode
npm start
```

## Project Structure

```
src/
├── index.ts              # Main server file
├── database/
│   └── init.ts           # Database initialization
└── routes/
    └── repairs.ts        # Repair routes and handlers
```

## Dependencies

### Production
- express - Web framework
- sqlite3 - Database driver
- cors - Cross-origin resource sharing
- helmet - Security middleware
- morgan - HTTP request logger
- dotenv - Environment variables

### Development
- typescript - TypeScript compiler
- ts-node - TypeScript execution
- nodemon - Development server with auto-restart
- @types/* - Type definitions 