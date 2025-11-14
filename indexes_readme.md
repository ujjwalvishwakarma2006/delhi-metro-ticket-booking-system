# Delhi Metro DB - Indexing Concepts Explained

This document explains PostgreSQL-specific indexing and optimization concepts used in the `database/init/02_indexes.sql` file. It's intended for developers familiar with basic SQL and MySQL but new to PostgreSQL's advanced indexing features.

---

## 1. Basic Indexes (`CREATE INDEX`)

Indexes speed up data retrieval by creating a data structure that allows the database to find rows faster without scanning the entire table.

### Syntax

```sql
CREATE INDEX index_name ON table_name(column_name);
```

### Example from Schema

```sql
CREATE INDEX idx_user_email ON "User"(Email);
```

**Why?** The `Email` column is used frequently for authentication (login queries). Without an index, PostgreSQL would scan every row in the `User` table. With an index, it can jump directly to the matching row.

---

## 2. Partial Indexes

A partial index is built on only a subset of rows that match a `WHERE` condition. This makes the index smaller and faster for specific queries.

### Syntax

```sql
CREATE INDEX index_name ON table_name(column_name) WHERE condition;
```

### Example from Schema

```sql
CREATE INDEX idx_smartcard_active_balance 
    ON SmartCard(CardID, Balance) 
    WHERE IsActive = TRUE AND Balance > 0;
```

**Why?** Most queries focus on active cards with a positive balance. By indexing only those rows, we:
- Reduce index size
- Speed up queries that filter by `IsActive = TRUE AND Balance > 0`
- Save disk space

**When NOT to use:** If you frequently query inactive or zero-balance cards, this index won't help those queries.

---

## 3. Composite (Multi-Column) Indexes

A composite index includes multiple columns. The order of columns matters!

### Syntax

```sql
CREATE INDEX index_name ON table_name(column1, column2, column3);
```

### Example from Schema

```sql
CREATE INDEX idx_transaction_user_time 
    ON Transaction(UserID, Timestamp DESC);
```

**Why?** This index optimizes queries like:

```sql
SELECT * FROM Transaction 
WHERE UserID = 123 
ORDER BY Timestamp DESC;
```

**Column Order Matters:**
- PostgreSQL can use this index for queries filtering by `UserID` alone
- It can also use it for queries filtering by `UserID` AND sorting by `Timestamp`
- It **cannot** efficiently use this index for queries filtering only by `Timestamp` (without `UserID`)

**Rule of Thumb:** Put the most selective (filtered) columns first, then sort columns.

---

## 4. Descending Indexes (`DESC`)

By default, indexes are sorted in ascending order. You can specify descending order for columns that are frequently sorted in reverse.

### Example from Schema

```sql
CREATE INDEX idx_transaction_timestamp ON Transaction(Timestamp DESC);
```

**Why?** Queries like this are optimized:

```sql
SELECT * FROM Transaction 
ORDER BY Timestamp DESC 
LIMIT 10;
```

This is common for "recent transactions" or "latest bookings" queries.

---

## 5. `UNIQUE` Indexes

A `UNIQUE` index ensures that all values in the indexed column(s) are distinct. It's similar to a `UNIQUE` constraint but implemented as an index.

### Example from Schema

```sql
CREATE UNIQUE INDEX idx_ticket_qr ON Ticket(QRCodeData);
```

**Why?** Each QR code must be unique. This index:
- Enforces uniqueness at the database level
- Speeds up lookups by QR code (critical for gate validation)

---

## 6. Conditional Partial Indexes with `WHERE IS NOT NULL`

Sometimes you want to index only rows where a column has a value (not `NULL`).

### Example from Schema

```sql
CREATE INDEX idx_payment_gateway 
    ON Payment(GatewayRef) 
    WHERE GatewayRef IS NOT NULL;
```

**Why?** If most payments don't have a `GatewayRef` (maybe only external payments do), indexing all rows is wasteful. This partial index:
- Only indexes rows with a gateway reference
- Makes reconciliation queries faster
- Reduces index size

---

## 7. Materialized Views

A materialized view is a query result that is physically stored on disk. Unlike regular views (which are just saved queries), materialized views cache the result for fast access.

### Syntax

```sql
CREATE MATERIALIZED VIEW view_name AS
SELECT ... (your complex query)
```

### Example from Schema

```sql
CREATE MATERIALIZED VIEW mv_popular_routes AS
SELECT 
    b.SourceStationID,
    s1.StationName AS SourceStationName,
    b.DestinationStationID,
    s2.StationName AS DestinationStationName,
    COUNT(*) AS TotalBookings,
    SUM(b.TotalFare) AS TotalRevenue
FROM Booking b
JOIN Station s1 ON b.SourceStationID = s1.StationID
JOIN Station s2 ON b.DestinationStationID = s2.StationID
GROUP BY b.SourceStationID, s1.StationName, 
         b.DestinationStationID, s2.StationName
ORDER BY TotalBookings DESC;
```

**Why?** This aggregation query with joins is expensive. By materializing it:
- The result is pre-computed and stored
- Analytics dashboards can query it instantly
- No need to re-calculate aggregations every time

**Trade-off:** The data becomes stale. You must refresh it periodically:

```sql
REFRESH MATERIALIZED VIEW mv_popular_routes;
```

### When to Use Materialized Views

✅ **Good for:**
- Complex aggregations (COUNT, SUM, AVG)
- Reports and dashboards
- Data that doesn't change frequently

❌ **Bad for:**
- Real-time data
- Frequently changing data

---

## 8. Indexing Materialized Views

You can (and should) create indexes on materialized views for even faster queries.

### Example from Schema

```sql
CREATE INDEX idx_mv_popular_routes_bookings 
    ON mv_popular_routes(TotalBookings DESC);
```

**Why?** If you query the materialized view with `ORDER BY TotalBookings DESC`, this index makes it instant.

---

## 9. Functions in Indexes

PostgreSQL allows you to create indexes on function results or expressions, not just column values.

While not heavily used in our schema, here's an example of what's possible:

```sql
-- Example: Case-insensitive email search
CREATE INDEX idx_user_email_lower ON "User"(LOWER(Email));

-- Now this query can use the index:
SELECT * FROM "User" WHERE LOWER(Email) = 'john@example.com';
```

---

## 10. PostgreSQL-Specific Functions

The schema defines custom functions to simplify operations.

### Function: `get_current_fare()`

```sql
CREATE OR REPLACE FUNCTION get_current_fare(
    p_source_station_id INTEGER,
    p_destination_station_id INTEGER
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_fare DECIMAL(10,2);
BEGIN
    SELECT FareAmount INTO v_fare
    FROM Fare
    WHERE SourceStationID = p_source_station_id
      AND DestinationStationID = p_destination_station_id
      AND EffectiveFrom <= CURRENT_DATE
      AND (EffectiveUntil IS NULL OR EffectiveUntil > CURRENT_DATE)
    ORDER BY EffectiveFrom DESC
    LIMIT 1;
    
    RETURN COALESCE(v_fare, 0.00);
END;
$$ LANGUAGE plpgsql;
```

**Usage:**

```sql
SELECT get_current_fare(1, 5);  -- Returns current fare from station 1 to 5
```

**Why?** Instead of writing the complex date logic every time, you can call this function. It:
- Handles effective date ranges
- Returns the most recent fare
- Returns 0.00 if no fare exists (via `COALESCE`)

### Function Language: `plpgsql`

- `plpgsql` is PostgreSQL's procedural language (similar to PL/SQL in Oracle)
- Allows variables, loops, conditionals, exception handling
- More powerful than plain SQL

---

## 11. `ANALYZE` Command

The `ANALYZE` command updates statistics that PostgreSQL's query planner uses to choose the best execution plan.

### Syntax

```sql
ANALYZE table_name;
```

### Example from Schema

```sql
ANALYZE "User";
ANALYZE SmartCard;
ANALYZE Transaction;
```

**Why?** After bulk inserts or significant data changes, PostgreSQL's query planner might have outdated statistics. Running `ANALYZE`:
- Collects distribution statistics (most common values, null percentages, etc.)
- Helps the query planner choose optimal indexes
- Improves query performance

**When to run:**
- After initial data load
- After large batch updates/inserts
- Periodically as a maintenance task

---

## 12. Index Naming Conventions

Our schema follows a clear naming pattern:

| Pattern | Meaning | Example |
|---------|---------|---------|
| `idx_table_column` | Single column index | `idx_user_email` |
| `idx_table_col1_col2` | Composite index | `idx_transaction_user_time` |
| `idx_mv_viewname_column` | Index on materialized view | `idx_mv_popular_routes_bookings` |

**Why naming matters:** Clear names make it easy to understand what an index does and when to use it.

---

## 13. When to Use Which Index Type

### Use a **Simple Index** when:
- Filtering by a single column frequently
- Example: `WHERE Email = 'user@example.com'`

### Use a **Composite Index** when:
- Filtering by multiple columns together
- Example: `WHERE UserID = 123 AND TransactionType = 'Booking'`

### Use a **Partial Index** when:
- Most queries filter by a specific condition
- Example: `WHERE IsActive = TRUE` appears in 95% of queries

### Use a **Unique Index** when:
- Enforcing uniqueness
- Example: QR codes, email addresses

### Use a **Materialized View** when:
- Complex aggregations are expensive
- Data doesn't need to be real-time
- Example: Daily/weekly reports

---

## 14. Index Maintenance Best Practices

### ✅ Do:
- Create indexes on foreign key columns
- Index columns used in `WHERE`, `JOIN`, `ORDER BY`
- Use partial indexes for frequently filtered subsets
- Regularly `ANALYZE` tables after bulk operations
- Refresh materialized views on a schedule

### ❌ Don't:
- Over-index (each index slows down `INSERT`, `UPDATE`, `DELETE`)
- Index small tables (< 1000 rows often don't benefit)
- Index columns with low cardinality (few distinct values) unless using partial indexes
- Forget to maintain materialized views

---

## 15. Checking Index Usage

To see if your indexes are being used:

```sql
-- Show index size
SELECT 
    indexname, 
    pg_size_pretty(pg_relation_size(indexname::regclass)) AS size
FROM pg_indexes 
WHERE tablename = 'Transaction';

-- Check if an index is being used (requires pg_stat_statements extension)
SELECT * FROM pg_stat_user_indexes 
WHERE indexrelname = 'idx_user_email';
```

---

## Summary

This schema demonstrates PostgreSQL's powerful indexing capabilities:

1. **Composite indexes** for multi-column queries
2. **Partial indexes** to reduce size and improve specificity
3. **Materialized views** for expensive aggregations
4. **Custom functions** for reusable query logic
5. **Regular ANALYZE** for optimal query planning

Understanding these concepts will help you design efficient databases and write faster queries! 🚀
