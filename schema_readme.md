# Delhi Metro DB Schema - Concepts Explained

This document explains some of the PostgreSQL-specific concepts and syntax used in the `database/init/01_schema.sql` file. It's intended for developers who are familiar with SQL and relational databases (like MySQL) but new to some of PostgreSQL's advanced features.

---

## 1. PostgreSQL Extensions (`CREATE EXTENSION`)

PostgreSQL's functionality can be extended by installing extensions. Our schema uses two:

-   **`pgcrypto`**: Provides cryptographic functions, including password hashing. It's a secure alternative to storing passwords in plaintext.
-   **`uuid-ossp`**: Provides functions to generate universally unique identifiers (UUIDs).

### Syntax

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

-   `IF NOT EXISTS` prevents an error if the extension is already installed.

---

## 2. Custom Data Types (`CREATE TYPE ... AS ENUM`)

PostgreSQL allows you to create your own custom data types. The schema uses `ENUM` (enumerated types) to create a list of predefined, static values. This improves data integrity by ensuring that a column can only hold one of the specified values.

### Example from Schema

Instead of using a `VARCHAR` and hoping for correct input, we define a `journey_status` type:

```sql
CREATE TYPE journey_status AS ENUM ('Active', 'Completed', 'Cancelled');
```

Now, we can use it as a column type:

```sql
CREATE TABLE Journey (
    -- ...
    Status journey_status NOT NULL DEFAULT 'Active',
    -- ...
);
```

This guarantees that the `Status` column in the `Journey` table can only ever contain 'Active', 'Completed', or 'Cancelled'.

---

## 3. Auto-Incrementing Columns (`SERIAL`)

In MySQL, you use `AUTO_INCREMENT`. In PostgreSQL, the `SERIAL` pseudo-type is a convenient shorthand for creating a unique, auto-incrementing integer column.

-   `SERIAL` creates an integer column.
-   `BIGSERIAL` creates a bigint column.

When you use `SERIAL`, PostgreSQL automatically creates a `SEQUENCE` object and sets the column's default value to the next value from that sequence.

### Example from Schema

```sql
CREATE TABLE "User" (
    UserID SERIAL PRIMARY KEY,
    -- ...
);
```

This is equivalent to the more verbose:

```sql
CREATE SEQUENCE user_userid_seq;

CREATE TABLE "User" (
    UserID INTEGER PRIMARY KEY DEFAULT nextval('user_userid_seq'),
    -- ...
);

ALTER SEQUENCE user_userid_seq OWNED BY "User".UserID;
```

---

## 4. `CHECK` Constraints with Regular Expressions

PostgreSQL's `CHECK` constraints are powerful and can use regular expressions for complex pattern matching, which is great for validating data like emails and phone numbers at the database level.

-   `~` : Case-sensitive match.
-   `~*` : Case-insensitive match.

### Example from Schema

The `User` table ensures that emails and phone numbers follow a specific format:

```sql
ALTER TABLE "User"
    ADD CONSTRAINT chk_user_email_format
    CHECK (Email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE "User"
    ADD CONSTRAINT chk_user_phone_format
    CHECK (Phone ~ '^[0-9+\-\s()]{10,15}$');
```

-   The first constraint checks for a valid email structure.
-   The second checks for a phone number format allowing digits, `+`, `-`, spaces, and parentheses.

---

## 5. Documenting the Schema (`COMMENT ON`)

PostgreSQL allows you to store documentation about database objects directly within the database itself. This is incredibly useful for developers and database administrators.

### Example from Schema

```sql
COMMENT ON TABLE "User" IS 'Stores registered user/passenger information';

COMMENT ON COLUMN "User".PasswordHash IS 'Bcrypt or SHA-256 hashed password';
```

These comments can be viewed using database tools or by querying system catalogs.

---

## 6. Foreign Key Actions (`ON DELETE`)

The schema defines how the database should behave when a referenced record is deleted.

-   **`ON DELETE CASCADE`**: When a referenced record is deleted, all referencing records are also automatically deleted.
    -   **Example**: If you delete a `User`, all their `Transaction` records are also deleted.

-   **`ON DELETE SET NULL`**: When a referenced record is deleted, the foreign key column(s) in the referencing records are set to `NULL`.
    -   **Example**: If you delete a `User`, the `UserID` in their `SmartCard` record becomes `NULL`, allowing the card to exist as an anonymous card.

-   **`ON DELETE RESTRICT`**: Prevents deletion of a referenced record if there are any referencing records. This is the default behavior if not specified.
    -   **Example**: You cannot delete a `Station` if it is being used as a `SourceStationID` or `DestinationStationID` in any `Booking`.

---

## 7. `JSONB` Data Type

The `Logs` table uses the `JSONB` data type to store old and new record values.

-   **`JSON`**: Stores an exact copy of the input text. It's fast to write but slower to process.
-   **`JSONB`** (JSON Binary): Stores the data in a decomposed binary format. It's slightly slower to write because it has to parse the data, but it is much faster to query and supports indexing.

`JSONB` is almost always the better choice for storing JSON data in PostgreSQL.

### Example from Schema

```sql
CREATE TABLE Logs (
    -- ...
    OldValues JSONB,
    NewValues JSONB,
    -- ...
);
```

This allows for flexible, schema-less logging while still enabling efficient queries on the logged data.

---

## 8. Multi-Column `UNIQUE` Constraints

A `UNIQUE` constraint can be applied to a combination of columns. This ensures that the *pair* (or group) of values is unique across the table, even if individual values are repeated.

### Example from Schema

In the `StationLine` table, we want to ensure that a station is only added to a line once.

```sql
CREATE TABLE StationLine (
    -- ...
    CONSTRAINT uq_station_line
        UNIQUE (StationID, LineID)
);
```

This allows:
-   `StationID` 1, `LineID` 1
-   `StationID` 1, `LineID` 2
-   `StationID` 2, `LineID` 1

But it **prevents** another row with `StationID` 1 and `LineID` 1.
