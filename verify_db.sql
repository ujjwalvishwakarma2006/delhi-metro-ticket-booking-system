-- Verify database initialization
SELECT 'Users' as table_name, count(*) as count FROM "User"
UNION ALL
SELECT 'Stations', count(*) FROM station
UNION ALL
SELECT 'SmartCards', count(*) FROM smartcard
UNION ALL
SELECT 'Journeys', count(*) FROM journey
UNION ALL
SELECT 'Tickets', count(*) FROM ticket;

-- Check sample journeys
SELECT journeyid, journeytype, entrystationid, exitstationid, status, farededucted
FROM journey
ORDER BY journeyid;
