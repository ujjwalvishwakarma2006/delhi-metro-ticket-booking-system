-- ============================================================================
-- Delhi Metro Ticket Booking System - Sample Data
-- ============================================================================
-- Description: Realistic sample data for testing and development
-- Purpose: Populate database with representative test data
-- ============================================================================

-- ============================================================================
-- INSERT SAMPLE USERS
-- ============================================================================

-- Using pgcrypto's crypt function for password hashing (password: "password123")
INSERT INTO "User" (Name, Email, Phone, PasswordHash) VALUES
('Rahul Sharma', 'rahul.sharma@email.com', '+919876543210', crypt('password123', gen_salt('bf'))),
('Priya Patel', 'priya.patel@email.com', '+919876543211', crypt('password123', gen_salt('bf'))),
('Amit Kumar', 'amit.kumar@email.com', '+919876543212', crypt('password123', gen_salt('bf'))),
('Sneha Gupta', 'sneha.gupta@email.com', '+919876543213', crypt('password123', gen_salt('bf'))),
('Vikram Singh', 'vikram.singh@email.com', '+919876543214', crypt('password123', gen_salt('bf'))),
('Ananya Verma', 'ananya.verma@email.com', '+919876543215', crypt('password123', gen_salt('bf'))),
('Rohan Mehta', 'rohan.mehta@email.com', '+919876543216', crypt('password123', gen_salt('bf'))),
('Kavya Reddy', 'kavya.reddy@email.com', '+919876543217', crypt('password123', gen_salt('bf'))),
('Arjun Malhotra', 'arjun.malhotra@email.com', '+919876543218', crypt('password123', gen_salt('bf'))),
('Ishita Joshi', 'ishita.joshi@email.com', '+919876543219', crypt('password123', gen_salt('bf')));

-- ============================================================================
-- INSERT METRO LINES
-- ============================================================================

INSERT INTO Line (LineName, LineColor, TotalStations, LengthKm, IsActive) VALUES
('Red Line', 'Red', 29, 34.19, TRUE),
('Blue Line', 'Blue', 50, 56.61, TRUE),
('Yellow Line', 'Yellow', 37, 48.88, TRUE),
('Green Line', 'Green', 21, 24.82, TRUE),
('Violet Line', 'Violet', 38, 46.58, TRUE),
('Pink Line', 'Pink', 38, 59.01, TRUE),
('Magenta Line', 'Magenta', 25, 38.235, TRUE),
('Orange Line', 'Orange', 21, 25.69, TRUE);

-- ============================================================================
-- INSERT METRO STATIONS
-- ============================================================================

-- Red Line Stations
INSERT INTO Station (StationName, StationCode, Location, IsOperational, OpenedOn) VALUES
('Shaheed Sthal (New Bus Adda)', 'SSNBA', 'Ghaziabad', TRUE, '2005-12-25'),
('Hindon River', 'HDR', 'Ghaziabad', TRUE, '2005-12-25'),
('Arthala', 'ATL', 'Ghaziabad', TRUE, '2005-12-25'),
('Mohan Nagar', 'MNG', 'Ghaziabad', TRUE, '2005-12-25'),
('Shyam Park', 'SPK', 'Delhi', TRUE, '2008-06-13'),
('Major Mohit Sharma Rajendra Nagar', 'RJN', 'Delhi', TRUE, '2008-06-13'),
('Shaheed Nagar', 'SDN', 'Delhi', TRUE, '2008-06-13'),
('Dilshad Garden', 'DGN', 'Delhi', TRUE, '2008-06-13'),
('Jhilmil', 'JML', 'Delhi', TRUE, '2008-06-13'),
('Mansarovar Park', 'MSP', 'Delhi', TRUE, '2008-06-13');

-- Blue Line Stations
INSERT INTO Station (StationName, StationCode, Location, IsOperational, OpenedOn) VALUES
('Noida Electronic City', 'NEC', 'Noida', TRUE, '2009-01-09'),
('Noida Sector 62', 'NS62', 'Noida', TRUE, '2009-01-09'),
('Noida Sector 59', 'NS59', 'Noida', TRUE, '2009-01-09'),
('Noida Sector 61', 'NS61', 'Noida', TRUE, '2009-01-09'),
('Noida Sector 52', 'NS52', 'Noida', TRUE, '2009-01-09'),
('Noida Sector 34', 'NS34', 'Noida', TRUE, '2009-01-09'),
('Noida City Centre', 'NCC', 'Noida', TRUE, '2009-01-09'),
('Golf Course', 'GFC', 'Noida', TRUE, '2009-01-09'),
('Botanical Garden', 'BTG', 'Noida', TRUE, '2009-01-09'),
('Noida Sector 18', 'NS18', 'Noida', TRUE, '2009-01-09');

-- Yellow Line Stations
INSERT INTO Station (StationName, StationCode, Location, IsOperational, OpenedOn) VALUES
('Samaypur Badli', 'SPB', 'Delhi', TRUE, '2009-09-04'),
('Rohini Sector 18-19', 'RS1819', 'Delhi', TRUE, '2009-09-04'),
('Haiderpur Badli Mor', 'HBM', 'Delhi', TRUE, '2009-09-04'),
('Jahangirpuri', 'JHP', 'Delhi', TRUE, '2009-09-04'),
('Adarsh Nagar', 'ADN', 'Delhi', TRUE, '2004-12-20'),
('Azadpur', 'AZP', 'Delhi', TRUE, '2004-12-20'),
('Model Town', 'MDT', 'Delhi', TRUE, '2004-12-20'),
('GTB Nagar', 'GTBN', 'Delhi', TRUE, '2004-12-20'),
('Vishwavidyalaya', 'VVY', 'Delhi', TRUE, '2004-12-20'),
('Vidhan Sabha', 'VDS', 'Delhi', TRUE, '2004-12-20');

-- Green Line Stations
INSERT INTO Station (StationName, StationCode, Location, IsOperational, OpenedOn) VALUES
('Brigadier Hoshiar Singh', 'BHS', 'Bahadurgarh', TRUE, '2018-06-24'),
('Mundka Industrial Area', 'MIA', 'Delhi', TRUE, '2018-06-24'),
('Ghevra Metro Station', 'GMS', 'Delhi', TRUE, '2018-06-24'),
('Tikri Kalan', 'TKL', 'Delhi', TRUE, '2018-06-24'),
('Tikri Border', 'TKB', 'Delhi', TRUE, '2018-06-24'),
('Mundka', 'MUN', 'Delhi', TRUE, '2010-04-03'),
('Rajdhani Park', 'RDP', 'Delhi', TRUE, '2011-08-27'),
('Nangloi', 'NGL', 'Delhi', TRUE, '2011-08-27'),
('Nangloi Railway Station', 'NGLR', 'Delhi', TRUE, '2011-08-27'),
('Surajmal Stadium', 'SMS', 'Delhi', TRUE, '2011-08-27');

-- Pink Line Stations  
INSERT INTO Station (StationName, StationCode, Location, IsOperational, OpenedOn) VALUES
('Majlis Park', 'MJP', 'Delhi', TRUE, '2018-03-14'),
('Azadpur', 'AZP2', 'Delhi', TRUE, '2018-03-14'),
('Shalimar Bagh', 'SHB', 'Delhi', TRUE, '2018-03-14'),
('Netaji Subhash Place', 'NSP', 'Delhi', TRUE, '2018-03-14'),
('Shakurpur', 'SKP', 'Delhi', TRUE, '2018-03-14'),
('Punjabi Bagh West', 'PBW', 'Delhi', TRUE, '2018-03-14'),
('ESI Hospital', 'ESIH', 'Delhi', TRUE, '2018-03-14'),
('Rajouri Garden', 'RJG', 'Delhi', TRUE, '2018-03-14'),
('Mayapuri', 'MYP', 'Delhi', TRUE, '2018-03-14'),
('Naraina Vihar', 'NVH', 'Delhi', TRUE, '2018-03-14');

-- ============================================================================
-- MAP STATIONS TO LINES (Sample mapping)
-- ============================================================================

-- Red Line Station Mapping
INSERT INTO StationLine (StationID, LineID, SequenceOrder) 
SELECT StationID, 1, ROW_NUMBER() OVER (ORDER BY StationID)
FROM Station WHERE StationID BETWEEN 1 AND 10;

-- Blue Line Station Mapping
INSERT INTO StationLine (StationID, LineID, SequenceOrder)
SELECT StationID, 2, ROW_NUMBER() OVER (ORDER BY StationID)
FROM Station WHERE StationID BETWEEN 11 AND 20;

-- Yellow Line Station Mapping
INSERT INTO StationLine (StationID, LineID, SequenceOrder)
SELECT StationID, 3, ROW_NUMBER() OVER (ORDER BY StationID)
FROM Station WHERE StationID BETWEEN 21 AND 30;

-- Green Line Station Mapping
INSERT INTO StationLine (StationID, LineID, SequenceOrder)
SELECT StationID, 4, ROW_NUMBER() OVER (ORDER BY StationID)
FROM Station WHERE StationID BETWEEN 31 AND 40;

-- Pink Line Station Mapping
INSERT INTO StationLine (StationID, LineID, SequenceOrder)
SELECT StationID, 5, ROW_NUMBER() OVER (ORDER BY StationID)
FROM Station WHERE StationID BETWEEN 41 AND 50;

-- ============================================================================
-- INSERT FARE DATA
-- ============================================================================

-- Function to generate fare based on distance
-- Formula: Base fare ₹10 + ₹2 per station
DO $$
DECLARE
    station_rec RECORD;
    dest_rec RECORD;
    distance INTEGER;
    fare DECIMAL(10,2);
BEGIN
    FOR station_rec IN SELECT StationID FROM Station LOOP
        FOR dest_rec IN SELECT StationID FROM Station WHERE StationID != station_rec.StationID LOOP
            -- Calculate distance as absolute difference in IDs (simplified)
            distance := ABS(dest_rec.StationID - station_rec.StationID);
            
            -- Calculate fare: ₹10 base + ₹2 per station
            fare := 10.00 + (distance * 2.00);
            
            -- Cap maximum fare at ₹60
            IF fare > 60.00 THEN
                fare := 60.00;
            END IF;
            
            -- Insert fare record
            INSERT INTO Fare (SourceStationID, DestinationStationID, FareAmount, DistanceKm, EffectiveFrom)
            VALUES (station_rec.StationID, dest_rec.StationID, fare, distance * 1.5, CURRENT_DATE);
        END LOOP;
    END LOOP;
END $$;

-- ============================================================================
-- INSERT SMART CARDS
-- ============================================================================

-- Cards linked to users
INSERT INTO SmartCard (UserID, Balance, IsActive) VALUES
(1, 500.00, TRUE),
(2, 250.00, TRUE),
(3, 150.00, TRUE),
(4, 300.00, TRUE),
(5, 450.00, TRUE),
(6, 200.00, TRUE),
(7, 350.00, TRUE),
(8, 100.00, TRUE),
(9, 275.00, TRUE),
(10, 400.00, TRUE);

-- Anonymous cards (not linked to users)
INSERT INTO SmartCard (UserID, Balance, IsActive) VALUES
(NULL, 100.00, TRUE),
(NULL, 150.00, TRUE),
(NULL, 200.00, TRUE),
(NULL, 50.00, TRUE),
(NULL, 75.00, TRUE);

-- ============================================================================
-- INSERT SAMPLE TRANSACTIONS AND BOOKINGS
-- ============================================================================

-- Sample bookings using the stored procedure
-- Booking 1: Rahul books from Shaheed Sthal to Dilshad Garden
SELECT * FROM create_ticket_booking(1, 1, 8, 'UPI', 24);

-- Booking 2: Priya books from Noida Electronic City to Botanical Garden
SELECT * FROM create_ticket_booking(2, 11, 19, 'Credit Card', 24);

-- Booking 3: Amit books from Samaypur Badli to Vishwavidyalaya
SELECT * FROM create_ticket_booking(3, 21, 29, 'Debit Card', 24);

-- Booking 4: Sneha books from Brigadier Hoshiar Singh to Nangloi
SELECT * FROM create_ticket_booking(4, 31, 38, 'UPI', 24);

-- Booking 5: Vikram books from Majlis Park to Rajouri Garden
SELECT * FROM create_ticket_booking(5, 41, 48, 'Wallet', 24);

-- ============================================================================
-- INSERT SAMPLE RECHARGES
-- ============================================================================

-- Sample recharges using the stored procedure
SELECT * FROM recharge_smart_card(1, 1, 200.00, 'UPI');
SELECT * FROM recharge_smart_card(2, 2, 300.00, 'Credit Card');
SELECT * FROM recharge_smart_card(3, 3, 150.00, 'Debit Card');
SELECT * FROM recharge_smart_card(4, 4, 250.00, 'Net Banking');
SELECT * FROM recharge_smart_card(5, 5, 100.00, 'UPI');

-- ============================================================================
-- INSERT SAMPLE JOURNEYS
-- ============================================================================

-- Start some journeys with cards
-- Function signature: start_journey(p_journey_type, p_entry_station_id, p_ticket_id, p_card_id)
DO $$
DECLARE
    v_journey_id INTEGER;
BEGIN
    -- Journey 1: Card-based journey (completed)
    v_journey_id := start_journey('Card', 1, NULL, 1);
    PERFORM complete_journey(v_journey_id, 5);
    
    -- Journey 2: Card-based journey (completed)
    v_journey_id := start_journey('Card', 11, NULL, 2);
    PERFORM complete_journey(v_journey_id, 15);
    
    -- Journey 3: Card-based journey (in progress)
    v_journey_id := start_journey('Card', 21, NULL, 3);
    
    -- Journey 4: Ticket-based journey (completed)
    v_journey_id := start_journey('Ticket', 1, 1, NULL);
    PERFORM complete_journey(v_journey_id, 8);
    
    -- Journey 5: Card-based journey (completed)
    v_journey_id := start_journey('Card', 31, NULL, 4);
    PERFORM complete_journey(v_journey_id, 35);
END $$;

-- ============================================================================
-- REFRESH MATERIALIZED VIEWS WITH INITIAL DATA
-- ============================================================================

SELECT refresh_analytics_views();

-- ============================================================================
-- DISPLAY SUMMARY STATISTICS
-- ============================================================================

DO $$
DECLARE
    user_count INTEGER;
    station_count INTEGER;
    line_count INTEGER;
    card_count INTEGER;
    transaction_count INTEGER;
    booking_count INTEGER;
    journey_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM "User";
    SELECT COUNT(*) INTO station_count FROM Station;
    SELECT COUNT(*) INTO line_count FROM Line;
    SELECT COUNT(*) INTO card_count FROM SmartCard;
    SELECT COUNT(*) INTO transaction_count FROM Transaction;
    SELECT COUNT(*) INTO booking_count FROM Booking;
    SELECT COUNT(*) INTO journey_count FROM Journey;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Database Initialization Complete!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Users: %', user_count;
    RAISE NOTICE 'Stations: %', station_count;
    RAISE NOTICE 'Lines: %', line_count;
    RAISE NOTICE 'Smart Cards: %', card_count;
    RAISE NOTICE 'Transactions: %', transaction_count;
    RAISE NOTICE 'Bookings: %', booking_count;
    RAISE NOTICE 'Journeys: %', journey_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Sample users password: password123';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- END OF SAMPLE DATA
-- ============================================================================
