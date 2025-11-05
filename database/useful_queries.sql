-- ============================================================================
-- Delhi Metro Ticket Booking System - Useful Queries Reference
-- ============================================================================
-- Description: Collection of useful queries for common operations
-- Purpose: Quick reference for developers and testers
-- ============================================================================

-- ============================================================================
-- BASIC DATA RETRIEVAL
-- ============================================================================

-- Get all users
SELECT UserID, Name, Email, Phone, CreatedAt 
FROM "User" 
ORDER BY CreatedAt DESC;

-- Get all stations on a specific line
SELECT s.StationName, s.StationCode, sl.SequenceOrder
FROM Station s
JOIN StationLine sl ON s.StationID = sl.StationID
JOIN Line l ON sl.LineID = l.LineID
WHERE l.LineName = 'Blue Line'
ORDER BY sl.SequenceOrder;

-- Get all active smart cards with their balances
SELECT sc.CardID, u.Name AS CardHolder, sc.Balance, sc.IsActive, sc.LastUsedAt
FROM SmartCard sc
LEFT JOIN "User" u ON sc.UserID = u.UserID
WHERE sc.IsActive = TRUE
ORDER BY sc.Balance DESC;

-- ============================================================================
-- USER OPERATIONS
-- ============================================================================

-- Get user's complete profile with cards
SELECT 
    u.UserID,
    u.Name,
    u.Email,
    u.Phone,
    COUNT(DISTINCT sc.CardID) AS TotalCards,
    COALESCE(SUM(sc.Balance), 0) AS TotalBalance,
    COUNT(DISTINCT t.TransactionID) AS TotalTransactions,
    COALESCE(SUM(t.Amount), 0) AS TotalSpent
FROM "User" u
LEFT JOIN SmartCard sc ON u.UserID = sc.UserID
LEFT JOIN Transaction t ON u.UserID = t.UserID
WHERE u.UserID = 1
GROUP BY u.UserID, u.Name, u.Email, u.Phone;

-- Get user's transaction history with details
SELECT 
    t.TransactionID,
    t.Amount,
    t.TransactionType,
    t.Timestamp,
    p.PaymentMethod,
    p.Status AS PaymentStatus,
    CASE 
        WHEN t.TransactionType = 'Booking' THEN 
            (SELECT CONCAT(s1.StationName, ' → ', s2.StationName)
             FROM Booking b
             JOIN Station s1 ON b.SourceStationID = s1.StationID
             JOIN Station s2 ON b.DestinationStationID = s2.StationID
             WHERE b.TransactionID = t.TransactionID)
        WHEN t.TransactionType = 'Recharge' THEN
            (SELECT CONCAT('Card #', r.CardID)
             FROM Recharge r
             WHERE r.TransactionID = t.TransactionID)
    END AS Details
FROM Transaction t
LEFT JOIN Payment p ON t.TransactionID = p.TransactionID
WHERE t.UserID = 1
ORDER BY t.Timestamp DESC
LIMIT 20;

-- ============================================================================
-- BOOKING OPERATIONS
-- ============================================================================

-- Get all bookings with full details
SELECT 
    b.BookingID,
    u.Name AS PassengerName,
    s1.StationName AS FromStation,
    s2.StationName AS ToStation,
    b.TotalFare,
    b.BookingDate,
    t.QRCodeData,
    t.ValidFrom,
    t.ValidUntil,
    t.IsUsed,
    p.PaymentMethod,
    p.Status AS PaymentStatus
FROM Booking b
JOIN Transaction tr ON b.TransactionID = tr.TransactionID
JOIN "User" u ON tr.UserID = u.UserID
JOIN Station s1 ON b.SourceStationID = s1.StationID
JOIN Station s2 ON b.DestinationStationID = s2.StationID
JOIN Ticket t ON b.BookingID = t.BookingID
JOIN Payment p ON tr.TransactionID = p.TransactionID
ORDER BY b.BookingDate DESC;

-- Get unused tickets
SELECT 
    t.TicketID,
    t.QRCodeData,
    b.BookingID,
    u.Name AS PassengerName,
    s1.StationName AS FromStation,
    s2.StationName AS ToStation,
    t.ValidFrom,
    t.ValidUntil,
    CASE 
        WHEN t.ValidUntil < CURRENT_TIMESTAMP THEN 'Expired'
        WHEN t.ValidFrom > CURRENT_TIMESTAMP THEN 'Not Yet Valid'
        ELSE 'Valid'
    END AS Status
FROM Ticket t
JOIN Booking b ON t.BookingID = b.BookingID
JOIN Transaction tr ON b.TransactionID = tr.TransactionID
JOIN "User" u ON tr.UserID = u.UserID
JOIN Station s1 ON b.SourceStationID = s1.StationID
JOIN Station s2 ON b.DestinationStationID = s2.StationID
WHERE t.IsUsed = FALSE
ORDER BY t.ValidFrom;

-- ============================================================================
-- JOURNEY TRACKING
-- ============================================================================

-- Get all active (incomplete) journeys
SELECT 
    j.JourneyID,
    j.JourneyType,
    CASE 
        WHEN j.JourneyType = 'Card' THEN CONCAT('Card #', j.CardID)
        WHEN j.JourneyType = 'Ticket' THEN CONCAT('Ticket #', j.TicketID)
    END AS PaymentMethod,
    s1.StationName AS EntryStation,
    j.EntryTime,
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - j.EntryTime))/60 AS MinutesElapsed
FROM Journey j
JOIN Station s1 ON j.EntryStationID = s1.StationID
WHERE j.Status = 'Active' AND j.ExitStationID IS NULL
ORDER BY j.EntryTime;

-- Get completed journeys with fare details
SELECT 
    j.JourneyID,
    j.JourneyType,
    s1.StationName AS FromStation,
    s2.StationName AS ToStation,
    j.EntryTime,
    j.ExitTime,
    EXTRACT(EPOCH FROM (j.ExitTime - j.EntryTime))/60 AS DurationMinutes,
    j.FareDeducted,
    j.Status
FROM Journey j
JOIN Station s1 ON j.EntryStationID = s1.StationID
JOIN Station s2 ON j.ExitStationID = s2.StationID
WHERE j.Status = 'Completed'
ORDER BY j.ExitTime DESC
LIMIT 50;

-- Get journey history for a specific card
SELECT 
    j.JourneyID,
    s1.StationName AS FromStation,
    s2.StationName AS ToStation,
    DATE(j.EntryTime) AS JourneyDate,
    TO_CHAR(j.EntryTime, 'HH24:MI') AS EntryTime,
    TO_CHAR(j.ExitTime, 'HH24:MI') AS ExitTime,
    j.FareDeducted,
    j.Status
FROM Journey j
LEFT JOIN Station s1 ON j.EntryStationID = s1.StationID
LEFT JOIN Station s2 ON j.ExitStationID = s2.StationID
WHERE j.CardID = 1
ORDER BY j.EntryTime DESC;

-- ============================================================================
-- ANALYTICS QUERIES
-- ============================================================================

-- Most popular routes (top 10)
SELECT * FROM mv_popular_routes LIMIT 10;

-- Daily transaction summary (last 7 days)
SELECT * FROM mv_daily_transaction_summary 
WHERE TransactionDate >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY TransactionDate DESC, TransactionType;

-- Busiest stations (by total journeys)
SELECT * FROM mv_station_usage 
ORDER BY TotalJourneys DESC 
LIMIT 10;

-- Revenue analysis by day
SELECT 
    DATE(t.Timestamp) AS TransactionDate,
    COUNT(CASE WHEN t.TransactionType = 'Booking' THEN 1 END) AS BookingCount,
    COUNT(CASE WHEN t.TransactionType = 'Recharge' THEN 1 END) AS RechargeCount,
    SUM(CASE WHEN t.TransactionType = 'Booking' THEN t.Amount ELSE 0 END) AS BookingRevenue,
    SUM(CASE WHEN t.TransactionType = 'Recharge' THEN t.Amount ELSE 0 END) AS RechargeRevenue,
    SUM(t.Amount) AS TotalRevenue
FROM Transaction t
JOIN Payment p ON t.TransactionID = p.TransactionID
WHERE p.Status = 'Success'
GROUP BY DATE(t.Timestamp)
ORDER BY TransactionDate DESC
LIMIT 30;

-- Peak hours analysis
SELECT 
    EXTRACT(HOUR FROM EntryTime) AS Hour,
    COUNT(*) AS JourneyCount,
    ROUND(AVG(FareDeducted), 2) AS AvgFare
FROM Journey
WHERE Status = 'Completed' 
  AND EntryTime >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY EXTRACT(HOUR FROM EntryTime)
ORDER BY Hour;

-- Payment method distribution
SELECT 
    p.PaymentMethod,
    COUNT(*) AS TransactionCount,
    SUM(t.Amount) AS TotalAmount,
    ROUND(AVG(t.Amount), 2) AS AverageAmount,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 2) AS PercentageOfTotal
FROM Payment p
JOIN Transaction t ON p.TransactionID = t.TransactionID
WHERE p.Status = 'Success'
GROUP BY p.PaymentMethod
ORDER BY TransactionCount DESC;

-- ============================================================================
-- FARE QUERIES
-- ============================================================================

-- Get fare between two stations (by station code)
SELECT 
    s1.StationName AS FromStation,
    s2.StationName AS ToStation,
    f.FareAmount,
    f.DistanceKm
FROM Fare f
JOIN Station s1 ON f.SourceStationID = s1.StationID
JOIN Station s2 ON f.DestinationStationID = s2.StationID
WHERE s1.StationCode = 'SSNBA' AND s2.StationCode = 'DGN'
  AND f.EffectiveFrom <= CURRENT_DATE
  AND (f.EffectiveUntil IS NULL OR f.EffectiveUntil > CURRENT_DATE);

-- Get all fares from a specific station
SELECT 
    s2.StationName AS DestinationStation,
    s2.StationCode,
    f.FareAmount,
    f.DistanceKm
FROM Fare f
JOIN Station s1 ON f.SourceStationID = s1.StationID
JOIN Station s2 ON f.DestinationStationID = s2.StationID
WHERE s1.StationCode = 'NCC'
  AND f.EffectiveFrom <= CURRENT_DATE
  AND (f.EffectiveUntil IS NULL OR f.EffectiveUntil > CURRENT_DATE)
ORDER BY f.FareAmount;

-- ============================================================================
-- MAINTENANCE QUERIES
-- ============================================================================

-- Check database size
SELECT 
    pg_size_pretty(pg_database_size('delhi_metro_system')) AS DatabaseSize;

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS TotalSize,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS DataSize,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS IndexSize
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan AS NumberOfScans,
    idx_tup_read AS TuplesRead,
    idx_tup_fetch AS TuplesFetched
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Find unused indexes (0 scans)
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS IndexSize
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- Check for missing indexes (sequential scans)
SELECT 
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    CASE 
        WHEN seq_scan > 0 THEN ROUND(100.0 * idx_scan / (seq_scan + idx_scan), 2)
        ELSE 0 
    END AS IndexUsagePercent
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY seq_scan DESC;

-- Active connections
SELECT 
    datname AS Database,
    usename AS Username,
    application_name AS Application,
    client_addr AS ClientAddress,
    state AS State,
    query_start AS QueryStart,
    state_change AS StateChange
FROM pg_stat_activity
WHERE datname = 'delhi_metro_system'
ORDER BY query_start DESC;

-- Long running queries
SELECT 
    pid,
    now() - query_start AS duration,
    query,
    state
FROM pg_stat_activity
WHERE state = 'active' 
  AND now() - query_start > interval '5 minutes'
ORDER BY duration DESC;

-- Refresh all materialized views
SELECT refresh_analytics_views();

-- Update statistics for query planner
ANALYZE;

-- Vacuum and analyze all tables
VACUUM ANALYZE;

-- ============================================================================
-- TESTING QUERIES
-- ============================================================================

-- Verify referential integrity
DO $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    -- Check for orphaned smart cards
    SELECT COUNT(*) INTO orphaned_count
    FROM SmartCard sc
    WHERE sc.UserID IS NOT NULL 
      AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u.UserID = sc.UserID);
    
    IF orphaned_count > 0 THEN
        RAISE NOTICE 'Found % orphaned smart cards', orphaned_count;
    ELSE
        RAISE NOTICE 'No orphaned smart cards found';
    END IF;
END $$;

-- Check data consistency
SELECT 
    'Transactions without payments' AS Issue,
    COUNT(*) AS Count
FROM Transaction t
LEFT JOIN Payment p ON t.TransactionID = p.TransactionID
WHERE p.PaymentID IS NULL

UNION ALL

SELECT 
    'Bookings without tickets' AS Issue,
    COUNT(*) AS Count
FROM Booking b
LEFT JOIN Ticket t ON b.BookingID = t.BookingID
WHERE t.TicketID IS NULL

UNION ALL

SELECT 
    'Active journeys older than 24 hours' AS Issue,
    COUNT(*) AS Count
FROM Journey j
WHERE j.Status = 'Active' 
  AND j.EntryTime < CURRENT_TIMESTAMP - INTERVAL '24 hours';

-- ============================================================================
-- END OF USEFUL QUERIES
-- ============================================================================
