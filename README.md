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
- **Database Seeding** with mock data for testing

## Prerequisites

- Node.js 24.x (use NVM)
- npm

## Installation

```bash
# Install dependencies
npm install

# Setup environment variables
npm run generate-defauil-env

# Create default admin user
npm run create-default-admin

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Seed database with test data
npm run seed
```

## Database Seeding

To populate the database with test data for development:

```bash
# Seed database with mock data (development)
npm run seed

# Build and seed for production
npm run seed:prod
```

The seeding script adds:
- **10 repair orders** with various statuses and device types
- **8 parts** with inventory information
- **Repair-parts relationships** linking repairs to used parts
- **Status history** showing repair progress

## Default Admin User

Create a default administrator account for development:

```bash
# Create default admin (username: test, password: test)
npm run create-default-admin
```

Default credentials:
- **Username:** `test`
- **Password:** `test`
- **Email:** `test@mail.com`
- **Role:** `admin`

⚠️ **Security Warning:** This is for development only. Change the password in production!

## Environment Variables

The application uses environment variables for configuration. You can generate a `.env` file using the provided scripts:

### Quick Setup
```bash
# Generate .env file with default values
npm run generate-defauil-env
```

### Manual Setup
Create a `.env` file in the root directory:

```
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
DB_NAME=repairs.db

# CORS Configuration
CORS_ORIGIN=http://localhost:5173

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# Password Hashing
BCRYPT_ROUNDS=12

# Database for mock data (optional)
DB_NAME_FOR_INSERT_MOCK_DATA=testDB.sqlite
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

### Parts Table
```sql
CREATE TABLE parts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  cost DECIMAL(10,2) NOT NULL,
  quantity_in_stock INTEGER DEFAULT 0,
  supplier TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Repair-Parts Junction Table
```sql
CREATE TABLE repair_parts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repair_id INTEGER NOT NULL,
  part_id INTEGER NOT NULL,
  quantity_used INTEGER NOT NULL DEFAULT 1,
  cost_per_unit DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (repair_id) REFERENCES repairs (id) ON DELETE CASCADE,
  FOREIGN KEY (part_id) REFERENCES parts (id)
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

# Populate database with test data
npm run seed
```

## Project Structure

```
src/
├── index.ts              # Main server file
├── database/
│   └── init.ts           # Database initialization
├── routes/
│   └── repairs.ts        # Repair routes and handlers
└── scripts/
    └── AddMockDataIntoDatabase.ts   # Database seeding script
```

## Mock Data

The seeding script includes realistic test data:

### Repair Orders
- Various device types: smartphones, laptops, tablets, desktops, printers, monitors
- Different repair statuses: pending, in_progress, waiting_parts, completed, cancelled
- Russian client names and contact information
- Realistic repair scenarios and costs

### Parts Inventory
- Common repair parts with stock levels
- Supplier information
- Realistic pricing

### Status Tracking
- Complete repair history with status changes
- Notes and timestamps for each status update

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