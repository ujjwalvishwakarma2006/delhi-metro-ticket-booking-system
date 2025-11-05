-- ============================================================================
-- Delhi Metro Ticket Booking System - Triggers and Business Logic
-- ============================================================================
-- Description: Triggers and stored procedures for business rule enforcement
-- Purpose: Automate data integrity and business logic at database level
-- ============================================================================

-- ============================================================================
-- TRIGGER FUNCTIONS FOR TIMESTAMP MANAGEMENT
-- ============================================================================

-- Function to update UpdatedAt timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.UpdatedAt = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS 
    'Automatically updates UpdatedAt timestamp on row modification';

-- Apply trigger to User table
CREATE TRIGGER trg_user_updated_at
    BEFORE UPDATE ON "User"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TRIGGER FUNCTIONS FOR SMARTCARD OPERATIONS
-- ============================================================================

-- Function to update SmartCard balance after recharge
CREATE OR REPLACE FUNCTION process_card_recharge()
RETURNS TRIGGER AS $$
DECLARE
    v_recharge_amount DECIMAL(10,2);
BEGIN
    -- Get the recharge amount from the transaction
    SELECT Amount INTO v_recharge_amount
    FROM Transaction
    WHERE TransactionID = NEW.TransactionID;
    
    -- Update the card balance
    UPDATE SmartCard
    SET Balance = Balance + v_recharge_amount,
        LastUsedAt = CURRENT_TIMESTAMP
    WHERE CardID = NEW.CardID;
    
    RAISE NOTICE 'Card % recharged with amount %', NEW.CardID, v_recharge_amount;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION process_card_recharge() IS 
    'Automatically updates card balance when recharge record is created';

CREATE TRIGGER trg_recharge_update_balance
    AFTER INSERT ON Recharge
    FOR EACH ROW
    EXECUTE FUNCTION process_card_recharge();

-- Function to update SmartCard LastUsedAt on journey
CREATE OR REPLACE FUNCTION update_card_last_used()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.CardID IS NOT NULL THEN
        UPDATE SmartCard
        SET LastUsedAt = CURRENT_TIMESTAMP
        WHERE CardID = NEW.CardID;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_journey_update_card_usage
    AFTER INSERT ON Journey
    FOR EACH ROW
    EXECUTE FUNCTION update_card_last_used();

-- ============================================================================
-- TRIGGER FUNCTIONS FOR TICKET OPERATIONS
-- ============================================================================

-- Function to mark ticket as used when journey starts
CREATE OR REPLACE FUNCTION mark_ticket_used()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.TicketID IS NOT NULL THEN
        UPDATE Ticket
        SET IsUsed = TRUE,
            UsedAt = NEW.EntryTime
        WHERE TicketID = NEW.TicketID
          AND IsUsed = FALSE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_journey_mark_ticket_used
    AFTER INSERT ON Journey
    FOR EACH ROW
    EXECUTE FUNCTION mark_ticket_used();

-- ============================================================================
-- TRIGGER FUNCTIONS FOR JOURNEY FARE CALCULATION
-- ============================================================================

-- Function to calculate and deduct fare when journey completes
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
                
                -- Update journey fare
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

-- ============================================================================
-- TRIGGER FUNCTIONS FOR BOOKING VALIDATION
-- ============================================================================

-- Function to validate booking against fare table
CREATE OR REPLACE FUNCTION validate_booking_fare()
RETURNS TRIGGER AS $$
DECLARE
    v_expected_fare DECIMAL(10,2);
BEGIN
    -- Get expected fare
    v_expected_fare := get_current_fare(NEW.SourceStationID, NEW.DestinationStationID);
    
    -- Validate that the booking fare matches expected fare
    IF v_expected_fare > 0 AND ABS(NEW.TotalFare - v_expected_fare) > 0.01 THEN
        RAISE EXCEPTION 'Booking fare (%) does not match expected fare (%) for route',
            NEW.TotalFare, v_expected_fare;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_booking_validate_fare
    BEFORE INSERT OR UPDATE ON Booking
    FOR EACH ROW
    EXECUTE FUNCTION validate_booking_fare();

-- ============================================================================
-- STORED PROCEDURES FOR BUSINESS OPERATIONS
-- ============================================================================

-- Procedure to create a new ticket booking
CREATE OR REPLACE FUNCTION create_ticket_booking(
    p_user_id INTEGER,
    p_source_station_id INTEGER,
    p_destination_station_id INTEGER,
    p_payment_method payment_method,
    p_validity_hours INTEGER DEFAULT 24
)
RETURNS TABLE(
    booking_id INTEGER,
    transaction_id INTEGER,
    ticket_id INTEGER,
    qr_code VARCHAR,
    total_fare DECIMAL(10,2),
    valid_from TIMESTAMP,
    valid_until TIMESTAMP
) AS $$
DECLARE
    v_transaction_id INTEGER;
    v_booking_id INTEGER;
    v_ticket_id INTEGER;
    v_payment_id INTEGER;
    v_fare DECIMAL(10,2);
    v_qr_code VARCHAR(255);
    v_valid_from TIMESTAMP;
    v_valid_until TIMESTAMP;
BEGIN
    -- Get fare for the route
    v_fare := get_current_fare(p_source_station_id, p_destination_station_id);
    
    IF v_fare <= 0 THEN
        RAISE EXCEPTION 'No fare found for route from station % to station %',
            p_source_station_id, p_destination_station_id;
    END IF;
    
    -- Create transaction
    INSERT INTO Transaction (UserID, Amount, TransactionType)
    VALUES (p_user_id, v_fare, 'Booking')
    RETURNING TransactionID INTO v_transaction_id;
    
    -- Create booking
    INSERT INTO Booking (TransactionID, SourceStationID, DestinationStationID, TotalFare)
    VALUES (v_transaction_id, p_source_station_id, p_destination_station_id, v_fare)
    RETURNING BookingID INTO v_booking_id;
    
    -- Create payment record
    INSERT INTO Payment (TransactionID, PaymentMethod, Status)
    VALUES (v_transaction_id, p_payment_method, 'Success')
    RETURNING PaymentID INTO v_payment_id;
    
    -- Generate QR code and validity period
    v_qr_code := 'QR-' || v_booking_id || '-' || EXTRACT(EPOCH FROM CURRENT_TIMESTAMP)::TEXT;
    v_valid_from := CURRENT_TIMESTAMP;
    v_valid_until := CURRENT_TIMESTAMP + (p_validity_hours || ' hours')::INTERVAL;
    
    -- Create ticket
    INSERT INTO Ticket (BookingID, QRCodeData, ValidFrom, ValidUntil)
    VALUES (v_booking_id, v_qr_code, v_valid_from, v_valid_until)
    RETURNING TicketID INTO v_ticket_id;
    
    -- Return booking details
    RETURN QUERY
    SELECT 
        v_booking_id,
        v_transaction_id,
        v_ticket_id,
        v_qr_code,
        v_fare,
        v_valid_from,
        v_valid_until;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_ticket_booking IS 
    'Creates a complete ticket booking with transaction, payment, and ticket';

-- Procedure to recharge a smart card
CREATE OR REPLACE FUNCTION recharge_smart_card(
    p_user_id INTEGER,
    p_card_id INTEGER,
    p_amount DECIMAL(10,2),
    p_payment_method payment_method
)
RETURNS TABLE(
    transaction_id INTEGER,
    recharge_id INTEGER,
    new_balance DECIMAL(10,2),
    status TEXT
) AS $$
DECLARE
    v_transaction_id INTEGER;
    v_recharge_id INTEGER;
    v_payment_id INTEGER;
    v_new_balance DECIMAL(10,2);
BEGIN
    -- Validate amount
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Recharge amount must be positive';
    END IF;
    
    -- Verify card exists and belongs to user (or is anonymous)
    IF NOT EXISTS (
        SELECT 1 FROM SmartCard 
        WHERE CardID = p_card_id 
          AND (UserID = p_user_id OR UserID IS NULL)
    ) THEN
        RAISE EXCEPTION 'Card % not found or does not belong to user %', 
            p_card_id, p_user_id;
    END IF;
    
    -- Create transaction
    INSERT INTO Transaction (UserID, Amount, TransactionType)
    VALUES (p_user_id, p_amount, 'Recharge')
    RETURNING TransactionID INTO v_transaction_id;
    
    -- Create recharge record (triggers balance update)
    INSERT INTO Recharge (TransactionID, CardID)
    VALUES (v_transaction_id, p_card_id)
    RETURNING RechargeID INTO v_recharge_id;
    
    -- Create payment record
    INSERT INTO Payment (TransactionID, PaymentMethod, Status)
    VALUES (v_transaction_id, p_payment_method, 'Success')
    RETURNING PaymentID INTO v_payment_id;
    
    -- Get new balance
    SELECT Balance INTO v_new_balance
    FROM SmartCard
    WHERE CardID = p_card_id;
    
    -- Return recharge details
    RETURN QUERY
    SELECT 
        v_transaction_id,
        v_recharge_id,
        v_new_balance,
        'Success'::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION recharge_smart_card IS 
    'Recharges a smart card with specified amount';

-- Procedure to start a journey
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
    -- Validate journey type matches provided ID
    IF p_journey_type = 'Ticket' THEN
        IF p_ticket_id IS NULL THEN
            RAISE EXCEPTION 'Ticket ID required for ticket-based journey';
        END IF;
        
        -- Validate ticket
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
        
        -- Minimum balance check (e.g., at least ₹10)
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

COMMENT ON FUNCTION start_journey IS 
    'Initiates a new journey with validation';

-- Procedure to complete a journey
CREATE OR REPLACE FUNCTION complete_journey(
    p_journey_id INTEGER,
    p_exit_station_id INTEGER
)
RETURNS TABLE(
    journey_id INTEGER,
    fare_deducted DECIMAL(10,2),
    status TEXT
) AS $$
DECLARE
    v_journey RECORD;
    v_fare DECIMAL(10,2);
BEGIN
    -- Get journey details
    SELECT * INTO v_journey
    FROM Journey
    WHERE JourneyID = p_journey_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Journey % not found', p_journey_id;
    END IF;
    
    IF v_journey.Status != 'Active' THEN
        RAISE EXCEPTION 'Journey % is not active (status: %)', 
            p_journey_id, v_journey.Status;
    END IF;
    
    -- Update journey with exit details
    -- Add 1 second to ensure ExitTime > EntryTime (constraint requirement)
    UPDATE Journey
    SET 
        ExitStationID = p_exit_station_id,
        ExitTime = CURRENT_TIMESTAMP + INTERVAL '1 second',
        Status = 'Completed'
    WHERE JourneyID = p_journey_id
    RETURNING FareDeducted INTO v_fare;
    
    -- Return completion details
    RETURN QUERY
    SELECT 
        p_journey_id,
        v_fare,
        'Completed'::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION complete_journey IS 
    'Completes an active journey and calculates fare';

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to get user's transaction history
CREATE OR REPLACE FUNCTION get_user_transactions(
    p_user_id INTEGER,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    transaction_id INTEGER,
    amount DECIMAL(10,2),
    transaction_type VARCHAR,
    transaction_timestamp TIMESTAMP,
    description TEXT,
    payment_method VARCHAR,
    payment_status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.TransactionID,
        t.Amount,
        t.TransactionType::VARCHAR,
        t.Timestamp,
        t.Description,
        p.PaymentMethod::VARCHAR,
        p.Status::VARCHAR
    FROM Transaction t
    LEFT JOIN Payment p ON t.TransactionID = p.TransactionID
    WHERE t.UserID = p_user_id
    ORDER BY t.Timestamp DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Function to get card journey history
CREATE OR REPLACE FUNCTION get_card_journey_history(
    p_card_id INTEGER,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
    journey_id INTEGER,
    entry_station VARCHAR,
    exit_station VARCHAR,
    entry_time TIMESTAMP,
    exit_time TIMESTAMP,
    fare_deducted DECIMAL(10,2),
    status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        j.JourneyID,
        s1.StationName,
        s2.StationName,
        j.EntryTime,
        j.ExitTime,
        j.FareDeducted,
        j.Status::VARCHAR
    FROM Journey j
    LEFT JOIN Station s1 ON j.EntryStationID = s1.StationID
    LEFT JOIN Station s2 ON j.ExitStationID = s2.StationID
    WHERE j.CardID = p_card_id
    ORDER BY j.EntryTime DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- AUDIT LOGGING TRIGGERS
-- ============================================================================

-- Generic audit logging function for INSERT operations
CREATE OR REPLACE FUNCTION log_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_record_id INTEGER;
    v_new_jsonb JSONB;
BEGIN
    -- Convert NEW to JSONB first
    v_new_jsonb := to_jsonb(NEW);
    
    -- Extract the record ID from JSONB based on table name (case-insensitive)
    v_record_id := CASE LOWER(TG_TABLE_NAME)
        WHEN 'user' THEN (v_new_jsonb->>'userid')::INTEGER
        WHEN 'smartcard' THEN (v_new_jsonb->>'cardid')::INTEGER
        WHEN 'station' THEN (v_new_jsonb->>'stationid')::INTEGER
        WHEN 'line' THEN (v_new_jsonb->>'lineid')::INTEGER
        WHEN 'transaction' THEN (v_new_jsonb->>'transactionid')::INTEGER
        WHEN 'booking' THEN (v_new_jsonb->>'bookingid')::INTEGER
        WHEN 'recharge' THEN (v_new_jsonb->>'rechargeid')::INTEGER
        WHEN 'payment' THEN (v_new_jsonb->>'paymentid')::INTEGER
        WHEN 'ticket' THEN (v_new_jsonb->>'ticketid')::INTEGER
        WHEN 'journey' THEN (v_new_jsonb->>'journeyid')::INTEGER
        WHEN 'fare' THEN (v_new_jsonb->>'fareid')::INTEGER
        WHEN 'stationline' THEN (v_new_jsonb->>'stationlineid')::INTEGER
        ELSE NULL
    END;
    
    INSERT INTO Logs (
        TableName, 
        OperationType, 
        RecordID, 
        NewValues, 
        Description
    ) VALUES (
        TG_TABLE_NAME,
        'INSERT',
        v_record_id,
        v_new_jsonb,
        'Record created in ' || TG_TABLE_NAME
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Generic audit logging function for UPDATE operations
CREATE OR REPLACE FUNCTION log_update()
RETURNS TRIGGER AS $$
DECLARE
    v_record_id INTEGER;
    v_new_jsonb JSONB;
BEGIN
    -- Convert NEW to JSONB first
    v_new_jsonb := to_jsonb(NEW);
    
    -- Extract the record ID from JSONB based on table name (case-insensitive)
    v_record_id := CASE LOWER(TG_TABLE_NAME)
        WHEN 'user' THEN (v_new_jsonb->>'userid')::INTEGER
        WHEN 'smartcard' THEN (v_new_jsonb->>'cardid')::INTEGER
        WHEN 'station' THEN (v_new_jsonb->>'stationid')::INTEGER
        WHEN 'line' THEN (v_new_jsonb->>'lineid')::INTEGER
        WHEN 'transaction' THEN (v_new_jsonb->>'transactionid')::INTEGER
        WHEN 'booking' THEN (v_new_jsonb->>'bookingid')::INTEGER
        WHEN 'recharge' THEN (v_new_jsonb->>'rechargeid')::INTEGER
        WHEN 'payment' THEN (v_new_jsonb->>'paymentid')::INTEGER
        WHEN 'ticket' THEN (v_new_jsonb->>'ticketid')::INTEGER
        WHEN 'journey' THEN (v_new_jsonb->>'journeyid')::INTEGER
        WHEN 'fare' THEN (v_new_jsonb->>'fareid')::INTEGER
        WHEN 'stationline' THEN (v_new_jsonb->>'stationlineid')::INTEGER
        ELSE NULL
    END;
    
    INSERT INTO Logs (
        TableName, 
        OperationType, 
        RecordID, 
        OldValues,
        NewValues, 
        Description
    ) VALUES (
        TG_TABLE_NAME,
        'UPDATE',
        v_record_id,
        to_jsonb(OLD),
        v_new_jsonb,
        'Record updated in ' || TG_TABLE_NAME
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Generic audit logging function for DELETE operations
CREATE OR REPLACE FUNCTION log_delete()
RETURNS TRIGGER AS $$
DECLARE
    v_record_id INTEGER;
    v_old_jsonb JSONB;
BEGIN
    -- Convert OLD to JSONB first
    v_old_jsonb := to_jsonb(OLD);
    
    -- Extract the record ID from JSONB based on table name (case-insensitive)
    v_record_id := CASE LOWER(TG_TABLE_NAME)
        WHEN 'user' THEN (v_old_jsonb->>'userid')::INTEGER
        WHEN 'smartcard' THEN (v_old_jsonb->>'cardid')::INTEGER
        WHEN 'station' THEN (v_old_jsonb->>'stationid')::INTEGER
        WHEN 'line' THEN (v_old_jsonb->>'lineid')::INTEGER
        WHEN 'transaction' THEN (v_old_jsonb->>'transactionid')::INTEGER
        WHEN 'booking' THEN (v_old_jsonb->>'bookingid')::INTEGER
        WHEN 'recharge' THEN (v_old_jsonb->>'rechargeid')::INTEGER
        WHEN 'payment' THEN (v_old_jsonb->>'paymentid')::INTEGER
        WHEN 'ticket' THEN (v_old_jsonb->>'ticketid')::INTEGER
        WHEN 'journey' THEN (v_old_jsonb->>'journeyid')::INTEGER
        WHEN 'fare' THEN (v_old_jsonb->>'fareid')::INTEGER
        WHEN 'stationline' THEN (v_old_jsonb->>'stationlineid')::INTEGER
        ELSE NULL
    END;
    
    INSERT INTO Logs (
        TableName, 
        OperationType, 
        RecordID, 
        OldValues,
        Description
    ) VALUES (
        TG_TABLE_NAME,
        'DELETE',
        v_record_id,
        v_old_jsonb,
        'Record deleted from ' || TG_TABLE_NAME
    );
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to User table
CREATE TRIGGER trg_audit_user_insert
    AFTER INSERT ON "User"
    FOR EACH ROW EXECUTE FUNCTION log_insert();

CREATE TRIGGER trg_audit_user_update
    AFTER UPDATE ON "User"
    FOR EACH ROW EXECUTE FUNCTION log_update();

CREATE TRIGGER trg_audit_user_delete
    AFTER DELETE ON "User"
    FOR EACH ROW EXECUTE FUNCTION log_delete();

-- Apply audit triggers to SmartCard table
CREATE TRIGGER trg_audit_smartcard_insert
    AFTER INSERT ON SmartCard
    FOR EACH ROW EXECUTE FUNCTION log_insert();

CREATE TRIGGER trg_audit_smartcard_update
    AFTER UPDATE ON SmartCard
    FOR EACH ROW EXECUTE FUNCTION log_update();

CREATE TRIGGER trg_audit_smartcard_delete
    AFTER DELETE ON SmartCard
    FOR EACH ROW EXECUTE FUNCTION log_delete();

-- Apply audit triggers to Transaction table
CREATE TRIGGER trg_audit_transaction_insert
    AFTER INSERT ON Transaction
    FOR EACH ROW EXECUTE FUNCTION log_insert();

CREATE TRIGGER trg_audit_transaction_update
    AFTER UPDATE ON Transaction
    FOR EACH ROW EXECUTE FUNCTION log_update();

CREATE TRIGGER trg_audit_transaction_delete
    AFTER DELETE ON Transaction
    FOR EACH ROW EXECUTE FUNCTION log_delete();

-- Apply audit triggers to Booking table
CREATE TRIGGER trg_audit_booking_insert
    AFTER INSERT ON Booking
    FOR EACH ROW EXECUTE FUNCTION log_insert();

CREATE TRIGGER trg_audit_booking_update
    AFTER UPDATE ON Booking
    FOR EACH ROW EXECUTE FUNCTION log_update();

CREATE TRIGGER trg_audit_booking_delete
    AFTER DELETE ON Booking
    FOR EACH ROW EXECUTE FUNCTION log_delete();

-- Apply audit triggers to Recharge table
CREATE TRIGGER trg_audit_recharge_insert
    AFTER INSERT ON Recharge
    FOR EACH ROW EXECUTE FUNCTION log_insert();

CREATE TRIGGER trg_audit_recharge_update
    AFTER UPDATE ON Recharge
    FOR EACH ROW EXECUTE FUNCTION log_update();

CREATE TRIGGER trg_audit_recharge_delete
    AFTER DELETE ON Recharge
    FOR EACH ROW EXECUTE FUNCTION log_delete();

-- Apply audit triggers to Payment table
CREATE TRIGGER trg_audit_payment_insert
    AFTER INSERT ON Payment
    FOR EACH ROW EXECUTE FUNCTION log_insert();

CREATE TRIGGER trg_audit_payment_update
    AFTER UPDATE ON Payment
    FOR EACH ROW EXECUTE FUNCTION log_update();

CREATE TRIGGER trg_audit_payment_delete
    AFTER DELETE ON Payment
    FOR EACH ROW EXECUTE FUNCTION log_delete();

-- Apply audit triggers to Ticket table
CREATE TRIGGER trg_audit_ticket_insert
    AFTER INSERT ON Ticket
    FOR EACH ROW EXECUTE FUNCTION log_insert();

CREATE TRIGGER trg_audit_ticket_update
    AFTER UPDATE ON Ticket
    FOR EACH ROW EXECUTE FUNCTION log_update();

CREATE TRIGGER trg_audit_ticket_delete
    AFTER DELETE ON Ticket
    FOR EACH ROW EXECUTE FUNCTION log_delete();

-- Apply audit triggers to Journey table
CREATE TRIGGER trg_audit_journey_insert
    AFTER INSERT ON Journey
    FOR EACH ROW EXECUTE FUNCTION log_insert();

CREATE TRIGGER trg_audit_journey_update
    AFTER UPDATE ON Journey
    FOR EACH ROW EXECUTE FUNCTION log_update();

CREATE TRIGGER trg_audit_journey_delete
    AFTER DELETE ON Journey
    FOR EACH ROW EXECUTE FUNCTION log_delete();

-- Apply audit triggers to Fare table
CREATE TRIGGER trg_audit_fare_insert
    AFTER INSERT ON Fare
    FOR EACH ROW EXECUTE FUNCTION log_insert();

CREATE TRIGGER trg_audit_fare_update
    AFTER UPDATE ON Fare
    FOR EACH ROW EXECUTE FUNCTION log_update();

CREATE TRIGGER trg_audit_fare_delete
    AFTER DELETE ON Fare
    FOR EACH ROW EXECUTE FUNCTION log_delete();

-- Apply audit triggers to Station table
CREATE TRIGGER trg_audit_station_insert
    AFTER INSERT ON Station
    FOR EACH ROW EXECUTE FUNCTION log_insert();

CREATE TRIGGER trg_audit_station_update
    AFTER UPDATE ON Station
    FOR EACH ROW EXECUTE FUNCTION log_update();

CREATE TRIGGER trg_audit_station_delete
    AFTER DELETE ON Station
    FOR EACH ROW EXECUTE FUNCTION log_delete();

-- Apply audit triggers to Line table
CREATE TRIGGER trg_audit_line_insert
    AFTER INSERT ON Line
    FOR EACH ROW EXECUTE FUNCTION log_insert();

CREATE TRIGGER trg_audit_line_update
    AFTER UPDATE ON Line
    FOR EACH ROW EXECUTE FUNCTION log_update();

CREATE TRIGGER trg_audit_line_delete
    AFTER DELETE ON Line
    FOR EACH ROW EXECUTE FUNCTION log_delete();

-- Apply audit triggers to StationLine table
CREATE TRIGGER trg_audit_stationline_insert
    AFTER INSERT ON StationLine
    FOR EACH ROW EXECUTE FUNCTION log_insert();

CREATE TRIGGER trg_audit_stationline_update
    AFTER UPDATE ON StationLine
    FOR EACH ROW EXECUTE FUNCTION log_update();

CREATE TRIGGER trg_audit_stationline_delete
    AFTER DELETE ON StationLine
    FOR EACH ROW EXECUTE FUNCTION log_delete();

COMMENT ON FUNCTION log_insert() IS 'Generic function to log INSERT operations to audit table';
COMMENT ON FUNCTION log_update() IS 'Generic function to log UPDATE operations to audit table';
COMMENT ON FUNCTION log_delete() IS 'Generic function to log DELETE operations to audit table';

-- ============================================================================
-- END OF TRIGGERS AND BUSINESS LOGIC
-- ============================================================================
