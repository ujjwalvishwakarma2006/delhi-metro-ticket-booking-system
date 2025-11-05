-- ============================================================================
-- Delhi Metro Ticket Booking System - Database Schema
-- ============================================================================
-- Description: Complete PostgreSQL schema for Delhi Metro ticket booking system
-- Database: PostgreSQL 16+
-- Author: Group 4 (DBMS Term Project)
-- Date: November 2025
-- ============================================================================

-- Enable extensions for enhanced functionality
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";     -- For UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";      -- For password hashing

-- ============================================================================
-- CUSTOM TYPES (ENUMS)
-- ============================================================================

-- Journey type enum - defines how a passenger is traveling
CREATE TYPE journey_type AS ENUM ('Ticket', 'Card');

-- Journey status enum - tracks the current state of a journey
CREATE TYPE journey_status AS ENUM ('Active', 'Completed', 'Cancelled');

-- Transaction type enum - categorizes financial transactions
CREATE TYPE transaction_type AS ENUM ('Booking', 'Recharge');

-- Payment status enum - tracks payment processing state
CREATE TYPE payment_status AS ENUM ('Success', 'Failed', 'Pending');

-- Payment method enum - available payment options
CREATE TYPE payment_method AS ENUM ('UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'Wallet');

-- ============================================================================
-- TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- User Table
-- ----------------------------------------------------------------------------
-- Description: Stores passenger account information
-- Business Rules:
--   - Email must be unique (used for login)
--   - Phone numbers should be validated at application level
--   - Passwords must be hashed before storage (never store plaintext)
-- ----------------------------------------------------------------------------
CREATE TABLE "User" (
    UserID          SERIAL PRIMARY KEY,
    Name            VARCHAR(100) NOT NULL,
    Email           VARCHAR(100) NOT NULL UNIQUE,
    Phone           VARCHAR(15) NOT NULL,
    PasswordHash    VARCHAR(255) NOT NULL,
    CreatedAt       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add constraints for data validation
ALTER TABLE "User" 
    ADD CONSTRAINT chk_user_email_format 
    CHECK (Email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE "User" 
    ADD CONSTRAINT chk_user_phone_format 
    CHECK (Phone ~ '^[0-9+\-\s()]{10,15}$');

-- Add comment for documentation
COMMENT ON TABLE "User" IS 'Stores registered user/passenger information';
COMMENT ON COLUMN "User".PasswordHash IS 'Bcrypt or SHA-256 hashed password';

-- ----------------------------------------------------------------------------
-- SmartCard Table
-- ----------------------------------------------------------------------------
-- Description: Represents rechargeable smart cards for metro travel
-- Business Rules:
--   - UserID is nullable (allows anonymous cards)
--   - Balance cannot be negative
--   - Balance has a practical upper limit for security
-- ----------------------------------------------------------------------------
CREATE TABLE SmartCard (
    CardID      SERIAL PRIMARY KEY,
    UserID      INTEGER,
    Balance     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    IsActive    BOOLEAN DEFAULT TRUE,
    IssuedAt    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    LastUsedAt  TIMESTAMP,
    
    CONSTRAINT fk_smartcard_user 
        FOREIGN KEY (UserID) 
        REFERENCES "User"(UserID) 
        ON DELETE SET NULL
);

-- Add constraints for balance validation
ALTER TABLE SmartCard 
    ADD CONSTRAINT chk_smartcard_balance_nonnegative 
    CHECK (Balance >= 0.00);

ALTER TABLE SmartCard 
    ADD CONSTRAINT chk_smartcard_balance_limit 
    CHECK (Balance <= 10000.00);

COMMENT ON TABLE SmartCard IS 'Rechargeable smart cards for contactless travel';
COMMENT ON COLUMN SmartCard.UserID IS 'Nullable - allows anonymous card usage';

-- ----------------------------------------------------------------------------
-- Station Table
-- ----------------------------------------------------------------------------
-- Description: Metro stations across the network
-- Business Rules:
--   - StationCode must be unique (used for quick reference)
--   - Station names should be human-readable
-- ----------------------------------------------------------------------------
CREATE TABLE Station (
    StationID       SERIAL PRIMARY KEY,
    StationName     VARCHAR(100) NOT NULL,
    StationCode     VARCHAR(10) NOT NULL UNIQUE,
    Location        VARCHAR(255),
    IsOperational   BOOLEAN DEFAULT TRUE,
    OpenedOn        DATE,
    
    CONSTRAINT chk_station_code_format 
        CHECK (StationCode ~ '^[A-Z0-9]{2,10}$')
);

COMMENT ON TABLE Station IS 'Metro stations in the Delhi Metro network';
COMMENT ON COLUMN Station.StationCode IS 'Unique short code for station (e.g., CEN, RJC)';

-- ----------------------------------------------------------------------------
-- Line Table
-- ----------------------------------------------------------------------------
-- Description: Metro lines (routes) like Blue Line, Red Line, etc.
-- Business Rules:
--   - Line colors should be standardized
--   - Line names must be unique
-- ----------------------------------------------------------------------------
CREATE TABLE Line (
    LineID      SERIAL PRIMARY KEY,
    LineName    VARCHAR(100) NOT NULL UNIQUE,
    LineColor   VARCHAR(30) NOT NULL,
    TotalStations INTEGER,
    LengthKm    DECIMAL(5,2),
    IsActive    BOOLEAN DEFAULT TRUE
);

COMMENT ON TABLE Line IS 'Metro lines/routes in the network';

-- ----------------------------------------------------------------------------
-- StationLine Junction Table (Many-to-Many relationship)
-- ----------------------------------------------------------------------------
-- Description: Maps stations to lines (a station can be on multiple lines)
-- Business Rules:
--   - Sequence determines the order of stations on a line
--   - Same station can appear on multiple lines (interchange stations)
-- ----------------------------------------------------------------------------
CREATE TABLE StationLine (
    StationLineID   SERIAL PRIMARY KEY,
    StationID       INTEGER NOT NULL,
    LineID          INTEGER NOT NULL,
    SequenceOrder   INTEGER NOT NULL,
    
    CONSTRAINT fk_stationline_station 
        FOREIGN KEY (StationID) 
        REFERENCES Station(StationID) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_stationline_line 
        FOREIGN KEY (LineID) 
        REFERENCES Line(LineID) 
        ON DELETE CASCADE,
    
    -- Ensure unique combination of station and line
    CONSTRAINT uq_station_line 
        UNIQUE (StationID, LineID)
);

COMMENT ON TABLE StationLine IS 'Junction table mapping stations to lines';
COMMENT ON COLUMN StationLine.SequenceOrder IS 'Order of station on the line';

-- ----------------------------------------------------------------------------
-- Transaction Table
-- ----------------------------------------------------------------------------
-- Description: Records all financial transactions (bookings and recharges)
-- Business Rules:
--   - Amount must be positive
--   - Timestamp is auto-set to transaction time
--   - Every transaction must have a type
-- ----------------------------------------------------------------------------
CREATE TABLE Transaction (
    TransactionID       SERIAL PRIMARY KEY,
    UserID              INTEGER NOT NULL,
    Amount              DECIMAL(10,2) NOT NULL,
    TransactionType     transaction_type NOT NULL,
    Timestamp           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Description         TEXT,
    
    CONSTRAINT fk_transaction_user 
        FOREIGN KEY (UserID) 
        REFERENCES "User"(UserID) 
        ON DELETE CASCADE,
    
    CONSTRAINT chk_transaction_amount_positive 
        CHECK (Amount > 0.00)
);

COMMENT ON TABLE Transaction IS 'All financial transactions in the system';
COMMENT ON COLUMN Transaction.TransactionType IS 'Either Booking or Recharge';

-- ----------------------------------------------------------------------------
-- Booking Table
-- ----------------------------------------------------------------------------
-- Description: Ticket booking records
-- Business Rules:
--   - One-to-one relationship with Transaction (unique TransactionID)
--   - Source and destination must be different stations
--   - TotalFare must match the fare table
-- ----------------------------------------------------------------------------
CREATE TABLE Booking (
    BookingID               SERIAL PRIMARY KEY,
    TransactionID           INTEGER NOT NULL UNIQUE,
    SourceStationID         INTEGER NOT NULL,
    DestinationStationID    INTEGER NOT NULL,
    TotalFare               DECIMAL(10,2) NOT NULL,
    BookingDate             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_booking_transaction 
        FOREIGN KEY (TransactionID) 
        REFERENCES Transaction(TransactionID) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_booking_source 
        FOREIGN KEY (SourceStationID) 
        REFERENCES Station(StationID) 
        ON DELETE RESTRICT,
    
    CONSTRAINT fk_booking_destination 
        FOREIGN KEY (DestinationStationID) 
        REFERENCES Station(StationID) 
        ON DELETE RESTRICT,
    
    CONSTRAINT chk_booking_different_stations 
        CHECK (SourceStationID != DestinationStationID),
    
    CONSTRAINT chk_booking_fare_positive 
        CHECK (TotalFare > 0.00)
);

COMMENT ON TABLE Booking IS 'Ticket booking records linked to transactions';

-- ----------------------------------------------------------------------------
-- Recharge Table
-- ----------------------------------------------------------------------------
-- Description: Smart card recharge records
-- Business Rules:
--   - One-to-one relationship with Transaction (unique TransactionID)
--   - Card must exist in SmartCard table
-- ----------------------------------------------------------------------------
CREATE TABLE Recharge (
    RechargeID      SERIAL PRIMARY KEY,
    TransactionID   INTEGER NOT NULL UNIQUE,
    CardID          INTEGER NOT NULL,
    RechargeDate    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_recharge_transaction 
        FOREIGN KEY (TransactionID) 
        REFERENCES Transaction(TransactionID) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_recharge_card 
        FOREIGN KEY (CardID) 
        REFERENCES SmartCard(CardID) 
        ON DELETE CASCADE
);

COMMENT ON TABLE Recharge IS 'Smart card recharge records';

-- ----------------------------------------------------------------------------
-- Payment Table
-- ----------------------------------------------------------------------------
-- Description: Payment processing information
-- Business Rules:
--   - One-to-one relationship with Transaction (unique TransactionID)
--   - Status should be updated based on payment gateway response
-- ----------------------------------------------------------------------------
CREATE TABLE Payment (
    PaymentID       SERIAL PRIMARY KEY,
    TransactionID   INTEGER NOT NULL UNIQUE,
    PaymentMethod   payment_method NOT NULL,
    Status          payment_status NOT NULL DEFAULT 'Pending',
    ProcessedAt     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    GatewayRef      VARCHAR(100),
    
    CONSTRAINT fk_payment_transaction 
        FOREIGN KEY (TransactionID) 
        REFERENCES Transaction(TransactionID) 
        ON DELETE CASCADE
);

COMMENT ON TABLE Payment IS 'Payment processing records for transactions';
COMMENT ON COLUMN Payment.GatewayRef IS 'External payment gateway reference ID';

-- ----------------------------------------------------------------------------
-- Ticket Table
-- ----------------------------------------------------------------------------
-- Description: Generated tickets for bookings
-- Business Rules:
--   - One-to-one relationship with Booking (unique BookingID)
--   - QRCodeData must be unique (used for entry/exit)
--   - ValidUntil must be after ValidFrom
-- ----------------------------------------------------------------------------
CREATE TABLE Ticket (
    TicketID    SERIAL PRIMARY KEY,
    BookingID   INTEGER NOT NULL UNIQUE,
    QRCodeData  VARCHAR(255) NOT NULL UNIQUE,
    ValidFrom   TIMESTAMP NOT NULL,
    ValidUntil  TIMESTAMP NOT NULL,
    IsUsed      BOOLEAN DEFAULT FALSE,
    UsedAt      TIMESTAMP,
    
    CONSTRAINT fk_ticket_booking 
        FOREIGN KEY (BookingID) 
        REFERENCES Booking(BookingID) 
        ON DELETE CASCADE,
    
    CONSTRAINT chk_ticket_validity_period 
        CHECK (ValidUntil > ValidFrom)
);

COMMENT ON TABLE Ticket IS 'Generated tickets with QR codes for entry/exit';
COMMENT ON COLUMN Ticket.QRCodeData IS 'Unique QR code string for validation';

-- ----------------------------------------------------------------------------
-- Journey Table
-- ----------------------------------------------------------------------------
-- Description: Actual travel journeys by passengers
-- Business Rules:
--   - ExitStationID and ExitTime are nullable (journey in progress)
--   - FareDeducted is calculated on exit for card journeys
--   - Must link to either Ticket or SmartCard
-- ----------------------------------------------------------------------------
CREATE TABLE Journey (
    JourneyID           SERIAL PRIMARY KEY,
    JourneyType         journey_type NOT NULL,
    TicketID            INTEGER,
    CardID              INTEGER,
    EntryStationID      INTEGER NOT NULL,
    EntryTime           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ExitStationID       INTEGER,
    ExitTime            TIMESTAMP,
    FareDeducted        DECIMAL(10,2),
    Status              journey_status NOT NULL DEFAULT 'Active',
    
    CONSTRAINT fk_journey_ticket 
        FOREIGN KEY (TicketID) 
        REFERENCES Ticket(TicketID) 
        ON DELETE SET NULL,
    
    CONSTRAINT fk_journey_card 
        FOREIGN KEY (CardID) 
        REFERENCES SmartCard(CardID) 
        ON DELETE SET NULL,
    
    CONSTRAINT fk_journey_entry 
        FOREIGN KEY (EntryStationID) 
        REFERENCES Station(StationID) 
        ON DELETE RESTRICT,
    
    CONSTRAINT fk_journey_exit 
        FOREIGN KEY (ExitStationID) 
        REFERENCES Station(StationID) 
        ON DELETE RESTRICT,
    
    -- Business logic: Either ticket or card must be used
    CONSTRAINT chk_journey_payment_method 
        CHECK (
            (JourneyType = 'Ticket' AND TicketID IS NOT NULL AND CardID IS NULL) OR
            (JourneyType = 'Card' AND CardID IS NOT NULL AND TicketID IS NULL)
        ),
    
    -- Exit time must be after entry time
    CONSTRAINT chk_journey_time_sequence 
        CHECK (ExitTime IS NULL OR ExitTime > EntryTime),
    
    -- Fare must be positive when deducted
    CONSTRAINT chk_journey_fare_positive 
        CHECK (FareDeducted IS NULL OR FareDeducted > 0.00)
);

COMMENT ON TABLE Journey IS 'Actual passenger journeys with entry/exit records';
COMMENT ON COLUMN Journey.Status IS 'Active (in progress), Completed, or Cancelled';

-- ----------------------------------------------------------------------------
-- Fare Table
-- ----------------------------------------------------------------------------
-- Description: Fare matrix between stations
-- Business Rules:
--   - Fare must be positive
--   - Each source-destination pair should have a defined fare
--   - Fare is typically based on distance or zone
-- ----------------------------------------------------------------------------
CREATE TABLE Fare (
    FareID                  SERIAL PRIMARY KEY,
    SourceStationID         INTEGER NOT NULL,
    DestinationStationID    INTEGER NOT NULL,
    FareAmount              DECIMAL(10,2) NOT NULL,
    DistanceKm              DECIMAL(5,2),
    EffectiveFrom           DATE DEFAULT CURRENT_DATE,
    EffectiveUntil          DATE,
    
    CONSTRAINT fk_fare_source 
        FOREIGN KEY (SourceStationID) 
        REFERENCES Station(StationID) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_fare_destination 
        FOREIGN KEY (DestinationStationID) 
        REFERENCES Station(StationID) 
        ON DELETE CASCADE,
    
    -- Ensure unique fare for each route during a time period
    CONSTRAINT uq_fare_route 
        UNIQUE (SourceStationID, DestinationStationID, EffectiveFrom),
    
    CONSTRAINT chk_fare_amount_positive 
        CHECK (FareAmount > 0.00),
    
    CONSTRAINT chk_fare_different_stations 
        CHECK (SourceStationID != DestinationStationID),
    
    CONSTRAINT chk_fare_validity_period 
        CHECK (EffectiveUntil IS NULL OR EffectiveUntil > EffectiveFrom)
);

COMMENT ON TABLE Fare IS 'Fare matrix for all station-to-station routes';
COMMENT ON COLUMN Fare.EffectiveFrom IS 'Date when this fare becomes active';
COMMENT ON COLUMN Fare.EffectiveUntil IS 'Optional date when fare expires';

-- ----------------------------------------------------------------------------
-- Logs Table
-- ----------------------------------------------------------------------------
-- Description: Comprehensive audit log for tracking all database operations
-- Business Rules:
--   - Logs are append-only (no updates or deletes)
--   - Captures CRUD operations on critical tables
--   - Stores both old and new values for updates
--   - Includes user context and timestamp information
-- ----------------------------------------------------------------------------
CREATE TABLE Logs (
    LogID           SERIAL PRIMARY KEY,
    TableName       VARCHAR(100) NOT NULL,
    OperationType   VARCHAR(10) NOT NULL CHECK (OperationType IN ('INSERT', 'UPDATE', 'DELETE')),
    RecordID        INTEGER NOT NULL,
    OldValues       JSONB,
    NewValues       JSONB,
    ChangedBy       INTEGER,
    ChangedAt       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    IPAddress       VARCHAR(50),
    UserAgent       TEXT,
    Description     TEXT,
    
    CONSTRAINT fk_logs_user 
        FOREIGN KEY (ChangedBy) 
        REFERENCES "User"(UserID) 
        ON DELETE SET NULL
);

-- Index for fast log queries by table and time
CREATE INDEX idx_logs_table_time ON Logs(TableName, ChangedAt DESC);
CREATE INDEX idx_logs_operation ON Logs(OperationType, ChangedAt DESC);
CREATE INDEX idx_logs_user ON Logs(ChangedBy, ChangedAt DESC);
CREATE INDEX idx_logs_record ON Logs(TableName, RecordID, ChangedAt DESC);

COMMENT ON TABLE Logs IS 'Comprehensive audit trail for all critical database operations';
COMMENT ON COLUMN Logs.OldValues IS 'JSON object containing previous values (for UPDATE/DELETE)';
COMMENT ON COLUMN Logs.NewValues IS 'JSON object containing new values (for INSERT/UPDATE)';
COMMENT ON COLUMN Logs.ChangedBy IS 'UserID who performed the operation (nullable for system operations)';

-- ============================================================================
-- END OF SCHEMA DEFINITION
-- ============================================================================
