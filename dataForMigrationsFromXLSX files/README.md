# Excel Data Migration

This folder contains Excel files that will be migrated to the database.

## Required Files

Place the following Excel files in this folder:

1. **Клиенты.xlsx** - Contains client information
   - Column: "Имя" (Client Name) - Primary key
   - Column: "Номер телефона" (Phone Number)

2. **Оборудование.xlsx** - Contains equipment and repair information
   - Column: "Имя" (Client Name) - Foreign key to Клиенты.xlsx
   - Column: "Наименование оборудования" (Equipment Name)
   - Column: "ТипРемонта" (Repair Type) - Will be stored as "Описание проблемы"
   - Column: "Номер ремонта" (Repair Number) - Format: 000000-001466
   - Column: "Серийный номер" (Serial Number) - Format: "9011401C..0913253443" or "386134CC"

## Running the Migration

1. Make sure the Excel files are placed in the `data/` folder
2. Run the migration script:

```bash
npm run migrate-excel
```

## Migration Process

The migration script will:

1. Read both Excel files
2. Create a mapping between client names and phone numbers
3. Process each equipment record and:
   - Extract client information
   - Parse device brand and model from equipment name
   - Identify serial numbers (patterns like "9011401C..0913253443")
   - Parse repair numbers (6-digit format like "000000")
   - Store repair type as issue description
   - Insert records into the `repairs` table

## Data Mapping

| Excel Field | Database Field | Notes |
|-------------|----------------|-------|
| Имя (from Оборудование.xlsx) | client_name | Links to Клиенты.xlsx |
| Наименование оборудования | device_type | Full equipment name |
| Наименование оборудования | brand, model | Split into brand and model |
| ТипРемонта | issue_description | Repair type description |
| Номер ремонта | repair_number | 6-digit format |
| Серийный номер | serial_number | If matches serial number pattern |
| Номер телефона (from Клиенты.xlsx) | client_phone | Retrieved via client name mapping |

## Error Handling

The script will:
- Skip records with missing required fields
- Log warnings for clients not found in the clients file
- Continue processing even if some records fail
- Provide a summary of successful and failed migrations

## Output

After migration, you'll see:
- Total number of repairs in the database
- Number of successfully processed records
- Number of errors/skipped records
- Number of clients processed
