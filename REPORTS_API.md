# Reports API Documentation

The Reports API provides endpoints for generating various statistics and reports about repairs.

## Base URL
```
/reports
```

## Authentication
All endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. Overview Statistics
**GET** `/reports/overview`

Returns overview statistics including counts by repair status and completion rate.

**Query Parameters:**
- `dateRange` (optional): Time period for statistics
  - `week` - Last 7 days
  - `month` - Last month (default)
  - `quarter` - Last 3 months
  - `year` - Last year

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 150,
    "pending": 25,
    "inProgress": 30,
    "completed": 80,
    "issued": 75,
    "cancelled": 10,
    "waitingParts": 5,
    "completionRate": 53
  }
}
```

### 2. Device Type Statistics
**GET** `/reports/devices`

Returns statistics grouped by device type.

**Query Parameters:**
- `dateRange` (optional): Same as overview endpoint

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "device_type": "autonomous_heater",
      "count": 45
    },
    {
      "device_type": "refrigerator",
      "count": 30
    }
  ]
}
```

### 3. Brand Statistics
**GET** `/reports/brands`

Returns statistics grouped by brand.

**Query Parameters:**
- `dateRange` (optional): Same as overview endpoint

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "brand": "webasto",
      "count": 60
    },
    {
      "brand": "eberspacher",
      "count": 40
    }
  ]
}
```

### 4. Monthly Statistics
**GET** `/reports/monthly`

Returns statistics grouped by month.

**Query Parameters:**
- `dateRange` (optional): Same as overview endpoint

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "month": "2024-01",
      "count": 25
    },
    {
      "month": "2024-02",
      "count": 30
    }
  ]
}
```

### 5. Financial Statistics
**GET** `/reports/financial`

Returns financial statistics including costs and averages.

**Query Parameters:**
- `dateRange` (optional): Same as overview endpoint

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRepairs": 150,
    "completedRepairs": 80,
    "totalEstimated": 150000,
    "totalActual": 145000,
    "averageEstimated": 1000,
    "averageActual": 1812.5
  }
}
```

### 6. Summary (All Statistics)
**GET** `/reports/summary`

Returns all statistics in a single request for optimal performance.

**Query Parameters:**
- `dateRange` (optional): Same as overview endpoint

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": { /* overview stats */ },
    "devices": [ /* device stats */ ],
    "brands": [ /* brand stats */ ],
    "monthly": [ /* monthly stats */ ],
    "financial": { /* financial stats */ }
  }
}
```

## Date Range Logic

The `dateRange` parameter affects how data is filtered:

- **week**: `WHERE created_at >= datetime("now", "-7 days")`
- **month**: `WHERE created_at >= datetime("now", "-1 month")`
- **quarter**: `WHERE created_at >= datetime("now", "-3 months")`
- **year**: `WHERE created_at >= datetime("now", "-1 year")`

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error description"
}
```

Common HTTP status codes:
- `200` - Success
- `401` - Unauthorized (missing or invalid token)
- `500` - Internal server error

## Performance Notes

- The `/reports/summary` endpoint is optimized to fetch all statistics in parallel
- All queries use proper SQL indexing on the `created_at` field
- Date filtering is applied at the database level for optimal performance

## Usage Examples

### Frontend Integration
```typescript
import { useGetReportsSummaryQuery } from '../store/api/reportsApi';

const { data: reportsData, isLoading, error } = useGetReportsSummaryQuery('month');

if (reportsData?.data) {
  const { overview, devices, brands, monthly, financial } = reportsData.data;
  // Use the statistics data
}
```

### Date Range Changes
```typescript
const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

// When date range changes, the query will automatically refetch
const { data } = useGetReportsSummaryQuery(dateRange);
```
