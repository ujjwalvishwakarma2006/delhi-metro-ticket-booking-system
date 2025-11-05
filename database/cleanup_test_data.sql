-- Cleanup test data
TRUNCATE TABLE journey, ticket, booking, recharge, payment, transaction, smartcard, logs RESTART IDENTITY CASCADE;
DELETE FROM "User" WHERE email = 'test@example.com';
