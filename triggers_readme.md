# Delhi Metro DB - Triggers and Stored Procedures Explained

This document explains PostgreSQL-specific trigger and stored procedure concepts used in the `database/init/03_triggers.sql` file. It's intended for developers familiar with MySQL but new to PostgreSQL's procedural language and trigger system.

---

## Table of Contents

1. [Triggers Overview](#1-triggers-overview)
2. [Trigger Functions vs Triggers](#2-trigger-functions-vs-triggers)
3. [Trigger Timing (BEFORE vs AFTER)](#3-trigger-timing-before-vs-after)
4. [NEW and OLD Records](#4-new-and-old-records)
5. [Stored Procedures vs Functions](#5-stored-procedures-vs-functions)
6. [PL/pgSQL Language](#6-plpgsql-language)
7. [DECLARE Block](#7-declare-block)
8. [RAISE Statements](#8-raise-statements)
9. [Returning Values from Functions](#9-returning-values-from-functions)
10. [Transaction Control](#10-transaction-control)
11. [JSONB Operations](#11-jsonb-operations)
12. [Advanced Examples](#12-advanced-examples)

---

## 1. Triggers Overview

A **trigger** is a database object that automatically executes a function when certain events occur on a table (INSERT, UPDATE, DELETE).

### Key Differences: PostgreSQL vs MySQL

| Feature | PostgreSQL | MySQL |
|---------|-----------|-------|
| Trigger Creation | Two-step: Function + Trigger | Single step |
| Language | PL/pgSQL (procedural) | SQL statements only |
| OLD/NEW | OLD and NEW records | OLD and NEW records |
| Multiple Triggers | Multiple triggers per event | Limited support |

### Basic Syntax

```sql
-- Step 1: Create the trigger function
CREATE OR REPLACE FUNCTION function_name()
RETURNS TRIGGER AS $$
BEGIN
    -- Your logic here
    RETURN NEW;  -- or OLD, or NULL
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create the trigger
CREATE TRIGGER trigger_name
    BEFORE/AFTER INSERT/UPDATE/DELETE ON table_name
    FOR EACH ROW
    EXECUTE FUNCTION function_name();
```

---

## 2. Trigger Functions vs Triggers

In PostgreSQL, triggers are implemented in **two separate objects**:

### Trigger Function (Reusable Logic)

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.UpdatedAt = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

- Returns `TRIGGER` type
- Contains the actual logic
- Can be reused by multiple triggers

### Trigger (Event Binding)

```sql
CREATE TRIGGER trg_user_updated_at
    BEFORE UPDATE ON "User"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

- Binds the function to a table and event
- Specifies timing (BEFORE/AFTER)
- Specifies the event (INSERT/UPDATE/DELETE)

**Why separate?** One function can be used by multiple triggers on different tables!

---

## 3. Trigger Timing (BEFORE vs AFTER)

### BEFORE Triggers

Execute **before** the operation is performed. Can modify the NEW record.

```sql
CREATE TRIGGER trg_booking_validate_fare
    BEFORE INSERT OR UPDATE ON Booking
    FOR EACH ROW
    EXECUTE FUNCTION validate_booking_fare();
```

**Use Cases:**
- Validate data before insertion
- Modify values before saving
- Prevent operations by raising exceptions

### AFTER Triggers

Execute **after** the operation is committed. Cannot modify NEW/OLD records.

```sql
CREATE TRIGGER trg_recharge_update_balance
    AFTER INSERT ON Recharge
    FOR EACH ROW
    EXECUTE FUNCTION process_card_recharge();
```

**Use Cases:**
- Update related tables
- Log changes
- Send notifications
- Cascade operations

---

## 4. NEW and OLD Records

PostgreSQL provides special record variables in trigger functions:

| Variable | INSERT | UPDATE | DELETE |
|----------|--------|--------|--------|
| `NEW` | Available | Available | Not available |
| `OLD` | Not available | Available | Available |

### Example: Comparing OLD and NEW

```sql
CREATE OR REPLACE FUNCTION complete_journey_fare()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if status changed from Active to Completed
    IF NEW.Status = 'Completed' AND OLD.Status != 'Completed' THEN
        -- Calculate and deduct fare
        NEW.FareDeducted := calculate_fare(...);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Key Points:**
- `OLD` contains the row **before** the update
- `NEW` contains the row **after** the update
- You can modify `NEW` in BEFORE triggers
- Use `:=` for assignment (not `=`)

---

## 5. Stored Procedures vs Functions

In PostgreSQL, both are similar but have key differences:

### Functions

```sql
CREATE OR REPLACE FUNCTION get_current_fare(
    p_source_station_id INTEGER,
    p_destination_station_id INTEGER
)
RETURNS DECIMAL(10,2) AS $$
BEGIN
    -- Logic here
    RETURN v_fare;
END;
$$ LANGUAGE plpgsql;

-- Call it
SELECT get_current_fare(1, 5);
```

- **Must return a value**
- Can be used in SELECT statements
- Can return tables with `RETURNS TABLE(...)`

### Procedures (PostgreSQL 11+)

```sql
CREATE OR REPLACE PROCEDURE process_payment(
    p_amount DECIMAL
)
AS $$
BEGIN
    -- Logic here
    COMMIT;  -- Can control transactions
END;
$$ LANGUAGE plpgsql;

-- Call it
CALL process_payment(100.00);
```

- Does **not** return a value
- Can control transactions (COMMIT/ROLLBACK)
- Called with `CALL` statement

**In our schema:** We use functions that return tables for complex operations like `create_ticket_booking()`.

---

## 6. PL/pgSQL Language

PL/pgSQL is PostgreSQL's procedural language, similar to PL/SQL in Oracle.

### Basic Structure

```sql
CREATE OR REPLACE FUNCTION function_name(parameters)
RETURNS return_type AS $$
DECLARE
    -- Variable declarations
    v_variable_name TYPE;
BEGIN
    -- Logic here
    
    RETURN value;
EXCEPTION
    WHEN exception_type THEN
        -- Error handling
END;
$$ LANGUAGE plpgsql;
```

### Key Features

1. **Variables**: Declared in `DECLARE` block
2. **Control Structures**: IF, CASE, LOOP, WHILE, FOR
3. **Exception Handling**: TRY/CATCH equivalent
4. **Dynamic SQL**: Execute dynamic queries
5. **Return Types**: Scalar, record, table, or void

---

## 7. DECLARE Block

Variables must be declared before use in the `DECLARE` block.

### Example from Schema

```sql
CREATE OR REPLACE FUNCTION create_ticket_booking(...)
RETURNS TABLE(...) AS $$
DECLARE
    v_transaction_id INTEGER;
    v_booking_id INTEGER;
    v_fare DECIMAL(10,2);
    v_qr_code VARCHAR(255);
    v_valid_from TIMESTAMP;
BEGIN
    -- Use variables here
    v_fare := get_current_fare(p_source_station_id, p_destination_station_id);
    
    INSERT INTO Transaction (...)
    VALUES (...)
    RETURNING TransactionID INTO v_transaction_id;
    
    RETURN QUERY SELECT ...;
END;
$$ LANGUAGE plpgsql;
```

### Variable Assignment

```sql
-- Assignment operator is :=
v_fare := 50.00;

-- Get value from SELECT
SELECT FareAmount INTO v_fare FROM Fare WHERE ...;

-- Get value from function
v_fare := get_current_fare(1, 5);

-- Get value from RETURNING clause
INSERT INTO Transaction (...) 
VALUES (...) 
RETURNING TransactionID INTO v_transaction_id;
```

---

## 8. RAISE Statements

Used for logging, debugging, and throwing errors.

### Levels

| Level | Description | Stops Execution? |
|-------|-------------|------------------|
| `DEBUG` | Debug info | No |
| `LOG` | Server log | No |
| `INFO` | Info message | No |
| `NOTICE` | Notice to client | No |
| `WARNING` | Warning message | No |
| `EXCEPTION` | Error (rollback) | **Yes** |

### Examples from Schema

```sql
-- Information message (doesn't stop execution)
RAISE NOTICE 'Card % recharged with amount %', NEW.CardID, v_recharge_amount;

-- Throw an error (stops execution, rolls back transaction)
RAISE EXCEPTION 'Insufficient balance on card %. Required: %, Available: %', 
    NEW.CardID, v_fare, v_current_balance;
```

### String Formatting

Use `%` as placeholders, similar to printf:

```sql
RAISE NOTICE 'User % performed action at %', user_id, timestamp;
```

---

## 9. Returning Values from Functions

PostgreSQL functions can return different types of values.

### Scalar Return (Single Value)

```sql
CREATE OR REPLACE FUNCTION get_current_fare(...)
RETURNS DECIMAL(10,2) AS $$
BEGIN
    RETURN 50.00;  -- Single value
END;
$$ LANGUAGE plpgsql;
```

### Table Return (Multiple Rows)

```sql
CREATE OR REPLACE FUNCTION get_user_transactions(...)
RETURNS TABLE(
    transaction_id INTEGER,
    amount DECIMAL(10,2),
    transaction_type VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.TransactionID,
        t.Amount,
        t.TransactionType::VARCHAR
    FROM Transaction t
    WHERE t.UserID = p_user_id
    ORDER BY t.Timestamp DESC;
END;
$$ LANGUAGE plpgsql;
```

**Call it:**

```sql
SELECT * FROM get_user_transactions(123, 50, 0);
```

### Multiple Named Values Return

```sql
CREATE OR REPLACE FUNCTION create_ticket_booking(...)
RETURNS TABLE(
    booking_id INTEGER,
    transaction_id INTEGER,
    ticket_id INTEGER,
    qr_code VARCHAR,
    total_fare DECIMAL(10,2)
) AS $$
DECLARE
    v_booking_id INTEGER;
    v_transaction_id INTEGER;
    -- ...
BEGIN
    -- ... do work ...
    
    -- Return multiple values as a table row
    RETURN QUERY
    SELECT 
        v_booking_id,
        v_transaction_id,
        v_ticket_id,
        v_qr_code,
        v_fare;
END;
$$ LANGUAGE plpgsql;
```

---

## 10. Transaction Control

### In Functions

Regular functions **cannot** use `COMMIT` or `ROLLBACK`. They run in the context of the calling transaction.

```sql
-- This will ERROR in a function
CREATE FUNCTION bad_function() RETURNS void AS $$
BEGIN
    COMMIT;  -- ERROR: cannot commit in a function
END;
$$ LANGUAGE plpgsql;
```

### In Procedures (PostgreSQL 11+)

Procedures **can** control transactions:

```sql
CREATE PROCEDURE process_batch() AS $$
BEGIN
    -- Process some records
    INSERT INTO ...;
    
    COMMIT;  -- Commit this batch
    
    -- Process more records
    UPDATE ...;
    
    COMMIT;  -- Commit next batch
END;
$$ LANGUAGE plpgsql;
```

### Exception Handling (Implicit Rollback)

When you raise an exception, PostgreSQL automatically rolls back the transaction:

```sql
BEGIN
    INSERT INTO Journey (...);
    
    IF condition THEN
        RAISE EXCEPTION 'Invalid data';  -- Rolls back the INSERT
    END IF;
END;
```

---

## 11. JSONB Operations

The schema uses JSONB for audit logging. Here are the key operations:

### Converting Records to JSONB

```sql
-- Convert a table row to JSONB
v_new_jsonb := to_jsonb(NEW);
v_old_jsonb := to_jsonb(OLD);
```

### Extracting Values from JSONB

```sql
-- Extract as text (returns TEXT)
v_user_id_text := v_new_jsonb->>'userid';

-- Extract as JSONB (returns JSONB)
v_user_obj := v_new_jsonb->'user_data';

-- Convert to specific type
v_user_id := (v_new_jsonb->>'userid')::INTEGER;
```

### Example from Schema

```sql
CREATE OR REPLACE FUNCTION log_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_record_id INTEGER;
    v_new_jsonb JSONB;
BEGIN
    -- Convert NEW to JSONB
    v_new_jsonb := to_jsonb(NEW);
    
    -- Extract ID based on table name
    v_record_id := CASE LOWER(TG_TABLE_NAME)
        WHEN 'user' THEN (v_new_jsonb->>'userid')::INTEGER
        WHEN 'smartcard' THEN (v_new_jsonb->>'cardid')::INTEGER
        -- ...
    END;
    
    -- Store in audit log
    INSERT INTO Logs (NewValues) VALUES (v_new_jsonb);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Special Trigger Variables

| Variable | Description |
|----------|-------------|
| `TG_TABLE_NAME` | Name of the table that triggered |
| `TG_OP` | Operation: INSERT, UPDATE, DELETE |
| `TG_WHEN` | BEFORE or AFTER |
| `TG_LEVEL` | ROW or STATEMENT |

---

## 12. Advanced Examples

### Example 1: Cascading Update with Validation

```sql
CREATE OR REPLACE FUNCTION process_card_recharge()
RETURNS TRIGGER AS $$
DECLARE
    v_recharge_amount DECIMAL(10,2);
BEGIN
    -- Get the recharge amount from related transaction
    SELECT Amount INTO v_recharge_amount
    FROM Transaction
    WHERE TransactionID = NEW.TransactionID;
    
    -- Update the card balance
    UPDATE SmartCard
    SET Balance = Balance + v_recharge_amount,
        LastUsedAt = CURRENT_TIMESTAMP
    WHERE CardID = NEW.CardID;
    
    -- Log the operation
    RAISE NOTICE 'Card % recharged with amount %', NEW.CardID, v_recharge_amount;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recharge_update_balance
    AFTER INSERT ON Recharge
    FOR EACH ROW
    EXECUTE FUNCTION process_card_recharge();
```

**What happens:**
1. User inserts a row into `Recharge` table
2. Trigger fires automatically
3. Function reads the transaction amount
4. Updates the smart card balance
5. Logs a notice message

### Example 2: Complex Business Logic Function

```sql
CREATE OR REPLACE FUNCTION start_journey(
    p_journey_type journey_type,
    p_entry_station_id INTEGER,
    p_ticket_id INTEGER DEFAULT NULL,
    p_card_id INTEGER DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_journey_id INTEGER;
    v_ticket_valid BOOLEAN := FALSE;
    v_card_balance DECIMAL(10,2);
BEGIN
    -- Validate journey type
    IF p_journey_type = 'Ticket' THEN
        IF p_ticket_id IS NULL THEN
            RAISE EXCEPTION 'Ticket ID required for ticket-based journey';
        END IF;
        
        -- Check ticket validity
        SELECT 
            CASE 
                WHEN IsUsed = FALSE 
                     AND ValidFrom <= CURRENT_TIMESTAMP 
                     AND ValidUntil >= CURRENT_TIMESTAMP 
                THEN TRUE 
                ELSE FALSE 
            END
        INTO v_ticket_valid
        FROM Ticket
        WHERE TicketID = p_ticket_id;
        
        IF NOT v_ticket_valid THEN
            RAISE EXCEPTION 'Ticket % is invalid or already used', p_ticket_id;
        END IF;
        
    ELSIF p_journey_type = 'Card' THEN
        IF p_card_id IS NULL THEN
            RAISE EXCEPTION 'Card ID required for card-based journey';
        END IF;
        
        -- Check card balance
        SELECT Balance INTO v_card_balance
        FROM SmartCard
        WHERE CardID = p_card_id AND IsActive = TRUE;
        
        IF v_card_balance IS NULL THEN
            RAISE EXCEPTION 'Card % not found or inactive', p_card_id;
        END IF;
        
        IF v_card_balance < 10.00 THEN
            RAISE EXCEPTION 'Insufficient balance on card %. Balance: %', 
                p_card_id, v_card_balance;
        END IF;
    END IF;
    
    -- Create journey record
    INSERT INTO Journey (
        JourneyType, 
        TicketID, 
        CardID, 
        EntryStationID, 
        Status
    )
    VALUES (
        p_journey_type,
        p_ticket_id,
        p_card_id,
        p_entry_station_id,
        'Active'
    )
    RETURNING JourneyID INTO v_journey_id;
    
    RETURN v_journey_id;
END;
$$ LANGUAGE plpgsql;
```

**Usage:**

```sql
-- Start a ticket-based journey
SELECT start_journey('Ticket', 5, 123, NULL);

-- Start a card-based journey
SELECT start_journey('Card', 5, NULL, 456);
```

### Example 3: Conditional Trigger Logic

```sql
CREATE OR REPLACE FUNCTION complete_journey_fare()
RETURNS TRIGGER AS $$
DECLARE
    v_fare DECIMAL(10,2);
    v_current_balance DECIMAL(10,2);
BEGIN
    -- Only process when journey status changes to 'Completed'
    IF NEW.Status = 'Completed' AND OLD.Status != 'Completed' 
       AND NEW.ExitStationID IS NOT NULL AND NEW.CardID IS NOT NULL THEN
        
        -- Get the fare for this route
        v_fare := get_current_fare(NEW.EntryStationID, NEW.ExitStationID);
        
        IF v_fare > 0 THEN
            -- Check current balance
            SELECT Balance INTO v_current_balance
            FROM SmartCard
            WHERE CardID = NEW.CardID;
            
            IF v_current_balance >= v_fare THEN
                -- Deduct fare from card
                UPDATE SmartCard
                SET Balance = Balance - v_fare
                WHERE CardID = NEW.CardID;
                
                -- Update journey fare (modify NEW before commit)
                NEW.FareDeducted := v_fare;
                
                RAISE NOTICE 'Fare % deducted from card %', v_fare, NEW.CardID;
            ELSE
                RAISE EXCEPTION 'Insufficient balance on card %. Required: %, Available: %', 
                    NEW.CardID, v_fare, v_current_balance;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_journey_calculate_fare
    BEFORE UPDATE ON Journey
    FOR EACH ROW
    EXECUTE FUNCTION complete_journey_fare();
```

**What happens:**
1. User updates a journey to mark it as completed
2. Trigger checks if status changed to 'Completed'
3. Calculates fare based on entry and exit stations
4. Checks if card has sufficient balance
5. Deducts fare from card
6. Updates the journey record with fare amount
7. If balance insufficient, raises exception and rolls back

---

## Key Takeaways

### ✅ Do:

1. **Separate concerns**: Create reusable trigger functions
2. **Use BEFORE triggers** for validation and data modification
3. **Use AFTER triggers** for cascading updates and logging
4. **Handle exceptions** gracefully with meaningful messages
5. **Use variables** in DECLARE block for clarity
6. **Return NEW** from INSERT/UPDATE triggers, **OLD** from DELETE triggers
7. **Use RETURNS TABLE** for functions that return multiple rows

### ❌ Don't:

1. **Don't modify NEW in AFTER triggers** (it's too late)
2. **Don't use COMMIT/ROLLBACK in functions** (use procedures instead)
3. **Don't forget to RETURN** from trigger functions
4. **Don't use = for assignment** (use `:=` instead)
5. **Don't create overly complex triggers** (move logic to functions)

### Common Patterns

```sql
-- Pattern 1: Auto-update timestamp
BEFORE UPDATE -> Set NEW.UpdatedAt = CURRENT_TIMESTAMP -> RETURN NEW

-- Pattern 2: Cascade operation
AFTER INSERT -> Update related tables -> RETURN NEW

-- Pattern 3: Validation
BEFORE INSERT/UPDATE -> Check conditions -> RAISE EXCEPTION if invalid

-- Pattern 4: Audit logging
AFTER INSERT/UPDATE/DELETE -> Log to audit table -> RETURN NEW/OLD

-- Pattern 5: Complex transaction
Function with multiple INSERTs -> RETURN values -> Use in application
```

---

This comprehensive guide covers all the PostgreSQL concepts used in your triggers file. Practice these patterns to become proficient with PostgreSQL's procedural features! 🚀
