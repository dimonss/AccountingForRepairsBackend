-- Database schema for Accounting for Repairs system
-- This file helps WebStorm recognize database tables

-- Main repairs table
CREATE TABLE IF NOT EXISTS repairs (
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

-- Repair status history table
CREATE TABLE IF NOT EXISTS repair_status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repair_id INTEGER NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  FOREIGN KEY (repair_id) REFERENCES repairs (id) ON DELETE CASCADE
);

-- Parts inventory table
CREATE TABLE IF NOT EXISTS parts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  cost DECIMAL(10,2) NOT NULL,
  quantity_in_stock INTEGER DEFAULT 0,
  supplier TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Junction table for repairs and parts
CREATE TABLE IF NOT EXISTS repair_parts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repair_id INTEGER NOT NULL,
  part_id INTEGER NOT NULL,
  quantity_used INTEGER NOT NULL DEFAULT 1,
  cost_per_unit DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (repair_id) REFERENCES repairs (id) ON DELETE CASCADE,
  FOREIGN KEY (part_id) REFERENCES parts (id)
); 