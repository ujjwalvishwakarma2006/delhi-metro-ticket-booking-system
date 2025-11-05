-- ============================================================================
-- Delhi Metro Ticket Booking System - Indexes and Query Optimization
-- ============================================================================
-- Description: Comprehensive indexing strategy for optimal query performance
-- Purpose: Improve query response times for common operations
-- ============================================================================

-- ============================================================================
-- INDEXES FOR USER TABLE
-- ============================================================================

-- Index on email for fast login queries
-- Justification: Email is used frequently for authentication
CREATE INDEX idx_user_email ON "User"(Email);

-- Index on phone for customer support lookups
CREATE INDEX idx_user_phone ON "User"(Phone);

-- Partial index for active users (if we add IsActive column later)
-- CREATE INDEX idx_user_active ON "User"(UserID) WHERE IsActive = TRUE;

COMMENT ON INDEX idx_user_email IS 'Speeds up user authentication by email';
COMMENT ON INDEX idx_user_phone IS 'Enables quick lookup by phone number';

-- ============================================================================
-- INDEXES FOR SMARTCARD TABLE
-- ============================================================================

-- Index on UserID for finding all cards belonging to a user
-- Justification: Users may have multiple cards
CREATE INDEX idx_smartcard_user ON SmartCard(UserID);

-- Partial index for active cards with balance
-- Justification: Most queries focus on active, funded cards
CREATE INDEX idx_smartcard_active_balance 
    ON SmartCard(CardID, Balance) 
    WHERE IsActive = TRUE AND Balance > 0;

-- Index on last used timestamp for analytics
CREATE INDEX idx_smartcard_lastused ON SmartCard(LastUsedAt DESC);

COMMENT ON INDEX idx_smartcard_user IS 'Links cards to their owners';
COMMENT ON INDEX idx_smartcard_active_balance IS 'Optimizes queries for usable cards';

-- ============================================================================
-- INDEXES FOR STATION TABLE
-- ============================================================================

-- Index on station code for quick reference lookups
-- Justification: StationCode is used in user-facing interfaces
CREATE INDEX idx_station_code ON Station(StationCode);

-- Index on station name for search functionality
CREATE INDEX idx_station_name ON Station(StationName);

-- Partial index for operational stations only
CREATE INDEX idx_station_operational 
    ON Station(StationID) 
    WHERE IsOperational = TRUE;

COMMENT ON INDEX idx_station_code IS 'Fast lookup by station code';
COMMENT ON INDEX idx_station_operational IS 'Filters only active stations';

-- ============================================================================
-- INDEXES FOR LINE TABLE
-- ============================================================================

-- Index on line name for search and display
CREATE INDEX idx_line_name ON Line(LineName);

-- Partial index for active lines
CREATE INDEX idx_line_active ON Line(LineID) WHERE IsActive = TRUE;

-- ============================================================================
-- INDEXES FOR STATIONLINE TABLE
-- ============================================================================

-- Composite index for station-to-line mapping
CREATE INDEX idx_stationline_station_line ON StationLine(StationID, LineID);

-- Index for finding all stations on a line (ordered)
CREATE INDEX idx_stationline_line_sequence ON StationLine(LineID, SequenceOrder);

-- Reverse index for finding all lines at a station
CREATE INDEX idx_stationline_station ON StationLine(StationID);

COMMENT ON INDEX idx_stationline_line_sequence IS 'Retrieves stations in order for a line';

-- ============================================================================
-- INDEXES FOR TRANSACTION TABLE
-- ============================================================================

-- Index on UserID for transaction history queries
-- Justification: Users frequently check their transaction history
CREATE INDEX idx_transaction_user ON Transaction(UserID);

-- Composite index on UserID and Timestamp for paginated history
-- Justification: Transaction history is typically sorted by time
CREATE INDEX idx_transaction_user_time ON Transaction(UserID, Timestamp DESC);

-- Index on timestamp for time-based analytics
CREATE INDEX idx_transaction_timestamp ON Transaction(Timestamp DESC);

-- Index on transaction type for categorized queries
CREATE INDEX idx_transaction_type ON Transaction(TransactionType);

-- Composite index for user-specific type filtering
CREATE INDEX idx_transaction_user_type ON Transaction(UserID, TransactionType, Timestamp DESC);

COMMENT ON INDEX idx_transaction_user_time IS 'Optimizes user transaction history queries';
COMMENT ON INDEX idx_transaction_timestamp IS 'Supports time-based reporting';

-- ============================================================================
-- INDEXES FOR BOOKING TABLE
-- ============================================================================

-- Index on TransactionID (already unique, but explicitly indexed)
-- CREATE UNIQUE INDEX idx_booking_transaction ON Booking(TransactionID);

-- Index on source station for route analysis
CREATE INDEX idx_booking_source ON Booking(SourceStationID);

-- Index on destination station for route analysis
CREATE INDEX idx_booking_destination ON Booking(DestinationStationID);

-- Composite index for route-specific queries
CREATE INDEX idx_booking_route ON Booking(SourceStationID, DestinationStationID);

-- Index on booking date for time-based queries
CREATE INDEX idx_booking_date ON Booking(BookingDate DESC);

COMMENT ON INDEX idx_booking_route IS 'Analyzes popular routes';
COMMENT ON INDEX idx_booking_date IS 'Enables time-based booking analysis';

-- ============================================================================
-- INDEXES FOR RECHARGE TABLE
-- ============================================================================

-- Index on CardID for recharge history
CREATE INDEX idx_recharge_card ON Recharge(CardID);

-- Composite index for card recharge history with time
CREATE INDEX idx_recharge_card_date ON Recharge(CardID, RechargeDate DESC);

-- Index on recharge date for analytics
CREATE INDEX idx_recharge_date ON Recharge(RechargeDate DESC);

COMMENT ON INDEX idx_recharge_card_date IS 'Shows recharge history for a card';

-- ============================================================================
-- INDEXES FOR PAYMENT TABLE
-- ============================================================================

-- Index on status for filtering successful/failed payments
CREATE INDEX idx_payment_status ON Payment(Status);

-- Index on payment method for analytics
CREATE INDEX idx_payment_method ON Payment(PaymentMethod);

-- Composite index for failed payment analysis
CREATE INDEX idx_payment_status_processed 
    ON Payment(Status, ProcessedAt DESC) 
    WHERE Status = 'Failed';

-- Index on gateway reference for reconciliation
CREATE INDEX idx_payment_gateway ON Payment(GatewayRef) WHERE GatewayRef IS NOT NULL;

COMMENT ON INDEX idx_payment_status_processed IS 'Identifies failed payments for retry';
COMMENT ON INDEX idx_payment_gateway IS 'Links to external payment gateway';

-- ============================================================================
-- INDEXES FOR TICKET TABLE
-- ============================================================================

-- Index on QRCodeData for fast validation at gates
-- Justification: Critical for entry/exit gate performance
CREATE UNIQUE INDEX idx_ticket_qr ON Ticket(QRCodeData);

-- Index on validity period for active ticket queries
CREATE INDEX idx_ticket_validity ON Ticket(ValidFrom, ValidUntil);

-- Partial index for unused tickets
CREATE INDEX idx_ticket_unused 
    ON Ticket(TicketID, ValidUntil) 
    WHERE IsUsed = FALSE;

-- Index on used timestamp for analytics
CREATE INDEX idx_ticket_used ON Ticket(UsedAt) WHERE UsedAt IS NOT NULL;

COMMENT ON INDEX idx_ticket_qr IS 'Critical for gate validation performance';
COMMENT ON INDEX idx_ticket_unused IS 'Finds valid, unused tickets';

-- ============================================================================
-- INDEXES FOR JOURNEY TABLE
-- ============================================================================

-- Index on TicketID for ticket-based journeys
CREATE INDEX idx_journey_ticket ON Journey(TicketID) WHERE TicketID IS NOT NULL;

-- Index on CardID for card-based journeys
CREATE INDEX idx_journey_card ON Journey(CardID) WHERE CardID IS NOT NULL;

-- Index on entry station for station-wise analytics
CREATE INDEX idx_journey_entry ON Journey(EntryStationID);

-- Index on exit station for station-wise analytics
CREATE INDEX idx_journey_exit ON Journey(ExitStationID) WHERE ExitStationID IS NOT NULL;

-- Composite index for route analysis
CREATE INDEX idx_journey_route ON Journey(EntryStationID, ExitStationID) 
    WHERE ExitStationID IS NOT NULL;

-- Index on entry time for time-based queries
CREATE INDEX idx_journey_entry_time ON Journey(EntryTime DESC);

-- Index on status for active journey queries
CREATE INDEX idx_journey_status ON Journey(Status);

-- Partial index for active (incomplete) journeys
CREATE INDEX idx_journey_active 
    ON Journey(JourneyID, EntryTime) 
    WHERE Status = 'Active' AND ExitStationID IS NULL;

-- Composite index for card journey history
CREATE INDEX idx_journey_card_time ON Journey(CardID, EntryTime DESC) 
    WHERE CardID IS NOT NULL;

COMMENT ON INDEX idx_journey_active IS 'Finds incomplete journeys for monitoring';
COMMENT ON INDEX idx_journey_route IS 'Analyzes travel patterns between stations';

-- ============================================================================
-- INDEXES FOR FARE TABLE
-- ============================================================================

-- Composite index on source and destination (already unique with effective date)
-- This is critical for fare lookup during booking
CREATE INDEX idx_fare_route ON Fare(SourceStationID, DestinationStationID);

-- Index on effective dates for temporal queries
CREATE INDEX idx_fare_effective ON Fare(EffectiveFrom, EffectiveUntil);

-- Partial index for currently active fares (removed CURRENT_DATE for immutability)
-- Note: Query with WHERE clause at application level instead
-- CREATE INDEX idx_fare_current 
--     ON Fare(SourceStationID, DestinationStationID, FareAmount) 
--     WHERE EffectiveUntil IS NULL;

COMMENT ON INDEX idx_fare_route IS 'Fast lookup for fare rates by route';

-- ============================================================================
-- QUERY OPTIMIZATION: MATERIALIZED VIEWS
-- ============================================================================

-- Materialized view for popular routes (refreshed periodically)
-- Justification: Expensive aggregation query used for analytics
CREATE MATERIALIZED VIEW mv_popular_routes AS
SELECT 
    b.SourceStationID,
    s1.StationName AS SourceStationName,
    b.DestinationStationID,
    s2.StationName AS DestinationStationName,
    COUNT(*) AS TotalBookings,
    SUM(b.TotalFare) AS TotalRevenue,
    AVG(b.TotalFare) AS AverageFare,
    MAX(b.BookingDate) AS LastBookingDate
FROM Booking b
JOIN Station s1 ON b.SourceStationID = s1.StationID
JOIN Station s2 ON b.DestinationStationID = s2.StationID
GROUP BY 
    b.SourceStationID, 
    s1.StationName,
    b.DestinationStationID, 
    s2.StationName
ORDER BY TotalBookings DESC;

-- Index on the materialized view for faster queries
CREATE INDEX idx_mv_popular_routes_bookings 
    ON mv_popular_routes(TotalBookings DESC);

COMMENT ON MATERIALIZED VIEW mv_popular_routes IS 
    'Pre-aggregated popular routes for analytics dashboard';

-- Materialized view for daily transaction summary
CREATE MATERIALIZED VIEW mv_daily_transaction_summary AS
SELECT 
    DATE(Timestamp) AS TransactionDate,
    TransactionType,
    COUNT(*) AS TransactionCount,
    SUM(Amount) AS TotalAmount,
    AVG(Amount) AS AverageAmount,
    MIN(Amount) AS MinAmount,
    MAX(Amount) AS MaxAmount
FROM Transaction
GROUP BY DATE(Timestamp), TransactionType
ORDER BY TransactionDate DESC, TransactionType;

CREATE INDEX idx_mv_daily_summary_date 
    ON mv_daily_transaction_summary(TransactionDate DESC);

COMMENT ON MATERIALIZED VIEW mv_daily_transaction_summary IS 
    'Daily aggregated transaction metrics for reporting';

-- Materialized view for station usage statistics
CREATE MATERIALIZED VIEW mv_station_usage AS
SELECT 
    s.StationID,
    s.StationName,
    s.StationCode,
    COUNT(DISTINCT j.JourneyID) AS TotalJourneys,
    COUNT(DISTINCT CASE WHEN j.EntryStationID = s.StationID THEN j.JourneyID END) AS EntriesCount,
    COUNT(DISTINCT CASE WHEN j.ExitStationID = s.StationID THEN j.JourneyID END) AS ExitsCount,
    MAX(j.EntryTime) AS LastUsedTime
FROM Station s
LEFT JOIN Journey j ON s.StationID = j.EntryStationID OR s.StationID = j.ExitStationID
WHERE j.Status = 'Completed'
GROUP BY s.StationID, s.StationName, s.StationCode
ORDER BY TotalJourneys DESC;

CREATE INDEX idx_mv_station_usage_journeys 
    ON mv_station_usage(TotalJourneys DESC);

COMMENT ON MATERIALIZED VIEW mv_station_usage IS 
    'Station-wise journey statistics for capacity planning';

-- ============================================================================
-- QUERY OPTIMIZATION: FUNCTIONS
-- ============================================================================

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW mv_popular_routes;
    REFRESH MATERIALIZED VIEW mv_daily_transaction_summary;
    REFRESH MATERIALIZED VIEW mv_station_usage;
    
    RAISE NOTICE 'All materialized views refreshed successfully';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_analytics_views() IS 
    'Refreshes all materialized views for updated analytics';

-- Function to get current fare between two stations
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

COMMENT ON FUNCTION get_current_fare IS 
    'Returns the current active fare for a route';

-- ============================================================================
-- STATISTICS UPDATES
-- ============================================================================

-- Analyze all tables to update query planner statistics
ANALYZE "User";
ANALYZE SmartCard;
ANALYZE Station;
ANALYZE Line;
ANALYZE StationLine;
ANALYZE Transaction;
ANALYZE Booking;
ANALYZE Recharge;
ANALYZE Payment;
ANALYZE Ticket;
ANALYZE Journey;
ANALYZE Fare;

-- ============================================================================
-- END OF INDEXES AND OPTIMIZATION
-- ============================================================================
