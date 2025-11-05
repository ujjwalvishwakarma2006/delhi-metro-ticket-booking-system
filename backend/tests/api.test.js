const request = require('supertest');
const app = require('../src/server');
const { pool } = require('../src/config/database');

// Test data
let authToken = '';
let userId = 0;
let cardId = 0;
let ticketId = 0;
let journeyId = 0;
let testStationId1 = 0;
let testStationId2 = 0;

// Cleanup before and after tests
beforeAll(async () => {
  // Clean up any existing test data to ensure idempotent tests
  try {
    // First, find the test user's ID
    const userResult = await pool.query('SELECT userid FROM "User" WHERE email = $1', ['test@example.com']);
    
    if (userResult.rows.length > 0) {
      const testUserId = userResult.rows[0].userid;
      
      // Delete in reverse order of dependencies to avoid constraint violations
      // 1. Delete journeys related to test user's tickets and cards
      await pool.query(`
        DELETE FROM journey 
        WHERE ticketid IN (
          SELECT t.ticketid FROM ticket t
          JOIN booking b ON t.bookingid = b.bookingid
          JOIN transaction tr ON b.transactionid = tr.transactionid
          WHERE tr.userid = $1
        ) OR cardid IN (
          SELECT cardid FROM smartcard WHERE userid = $1
        )
      `, [testUserId]);
      
      // 2. Delete tickets (via booking → transaction relationship)
      await pool.query(`
        DELETE FROM ticket 
        WHERE bookingid IN (
          SELECT b.bookingid FROM booking b
          JOIN transaction tr ON b.transactionid = tr.transactionid
          WHERE tr.userid = $1
        )
      `, [testUserId]);
      
      // 3. Delete bookings (via transaction relationship)
      await pool.query(`
        DELETE FROM booking 
        WHERE transactionid IN (
          SELECT transactionid FROM transaction WHERE userid = $1
        )
      `, [testUserId]);
      
      // 4. Delete recharges
      await pool.query('DELETE FROM recharge WHERE cardid IN (SELECT cardid FROM smartcard WHERE userid = $1)', [testUserId]);
      
      // 5. Delete transactions
      await pool.query('DELETE FROM transaction WHERE userid = $1', [testUserId]);
      
      // 6. Delete smart cards
      await pool.query('DELETE FROM smartcard WHERE userid = $1', [testUserId]);
      
      // 7. Finally, delete the user
      await pool.query('DELETE FROM "User" WHERE userid = $1', [testUserId]);
    }
  } catch (error) {
    console.warn('Cleanup warning (non-critical):', error.message);
  }

  // Get test stations (table names are lowercase in the database)
  const stationsResult = await pool.query(
    'SELECT stationid FROM station WHERE isoperational = true ORDER BY stationid LIMIT 2'
  );
  if (stationsResult.rows.length < 2) {
    throw new Error('Not enough stations in database for testing');
  }
  testStationId1 = stationsResult.rows[0].stationid;
  testStationId2 = stationsResult.rows[1].stationid;
});

afterAll(async () => {
  // Clean up test data after tests complete
  try {
    const userResult = await pool.query('SELECT userid FROM "User" WHERE email = $1', ['test@example.com']);
    
    if (userResult.rows.length > 0) {
      const testUserId = userResult.rows[0].userid;
      
      // Delete in reverse order of dependencies
      await pool.query(`
        DELETE FROM journey 
        WHERE ticketid IN (
          SELECT t.ticketid FROM ticket t
          JOIN booking b ON t.bookingid = b.bookingid
          JOIN transaction tr ON b.transactionid = tr.transactionid
          WHERE tr.userid = $1
        ) OR cardid IN (
          SELECT cardid FROM smartcard WHERE userid = $1
        )
      `, [testUserId]);
      
      await pool.query(`DELETE FROM ticket WHERE bookingid IN (SELECT b.bookingid FROM booking b JOIN transaction tr ON b.transactionid = tr.transactionid WHERE tr.userid = $1)`, [testUserId]);
      await pool.query(`DELETE FROM booking WHERE transactionid IN (SELECT transactionid FROM transaction WHERE userid = $1)`, [testUserId]);
      await pool.query('DELETE FROM recharge WHERE cardid IN (SELECT cardid FROM smartcard WHERE userid = $1)', [testUserId]);
      await pool.query('DELETE FROM transaction WHERE userid = $1', [testUserId]);
      await pool.query('DELETE FROM smartcard WHERE userid = $1', [testUserId]);
      await pool.query('DELETE FROM "User" WHERE userid = $1', [testUserId]);
    }
  } catch (error) {
    console.warn('Cleanup warning (non-critical):', error.message);
  }
  
  // Close database connection pool
  await pool.end();
});

describe('1. Auth Module Tests', () => {
  describe('POST /api/auth/signup', () => {
    it('should create a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          phone: '+919876543210',
          password: 'password123',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.user.smartCard).toBeNull(); // No smart card initially

      authToken = response.body.data.token;
      userId = response.body.data.user.id;
      
      // Register a smart card for the user
      const cardResponse = await request(app)
        .post('/api/cards/register')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentMethod: 'UPI',
        })
        .expect(201);

      expect(cardResponse.body.success).toBe(true);
      expect(cardResponse.body.data.card).toHaveProperty('cardId');
      expect(cardResponse.body.data.card.balance).toBe(0); // Initial balance is 0
      expect(cardResponse.body.data.registrationFee).toBe(50);

      cardId = cardResponse.body.data.card.cardId;
      
      // Recharge the card so tests can use it
      await request(app)
        .post('/api/cards/recharge')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 500,
          paymentMethod: 'UPI',
        })
        .expect(200);
    });

    it('should return error for duplicate email', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Test User 2',
          email: 'test@example.com',
          phone: '+919876543211',
          password: 'password123',
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should return validation error for missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Test User',
          email: 'test2@example.com',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation');
    });

    it('should return validation error for invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Test User',
          email: 'invalid-email',
          phone: '+919876543210',
          password: 'password123',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.email).toBe('test@example.com');
    });

    it('should return error for incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid');
    });

    it('should return error for non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.user.smartCard).toBeDefined();
    });

    it('should return error without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return error with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});

describe('2. Stations & Fares Module Tests', () => {
  describe('GET /api/stations', () => {
    it('should return list of all stations', async () => {
      const response = await request(app)
        .get('/api/stations')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stations).toBeInstanceOf(Array);
      expect(response.body.data.stations.length).toBeGreaterThan(0);
      expect(response.body.data.stations[0]).toHaveProperty('id');
      expect(response.body.data.stations[0]).toHaveProperty('name');
      expect(response.body.data.stations[0]).toHaveProperty('code');
    });
  });

  describe('GET /api/stations/fares', () => {
    it('should return fare for valid route', async () => {
      const response = await request(app)
        .get(`/api/stations/fares?fromStationId=${testStationId1}&toStationId=${testStationId2}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('fare');
      expect(response.body.data.fare).toBeGreaterThan(0);
      expect(response.body.data).toHaveProperty('from');
      expect(response.body.data).toHaveProperty('to');
    });

    it('should return error for same source and destination', async () => {
      const response = await request(app)
        .get(`/api/stations/fares?fromStationId=${testStationId1}&toStationId=${testStationId1}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('different');
    });

    it('should return validation error for missing parameters', async () => {
      const response = await request(app)
        .get('/api/stations/fares?fromStationId=1')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return error for non-existent station', async () => {
      const response = await request(app)
        .get('/api/stations/fares?fromStationId=99999&toStationId=99998')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});

describe('3. Ticketing Module Tests', () => {
  describe('POST /api/tickets/book', () => {
    it('should book a ticket successfully', async () => {
      const response = await request(app)
        .post('/api/tickets/book')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fromStationId: testStationId1,
          toStationId: testStationId2,
          paymentMethod: 'UPI',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('ticketId');
      expect(response.body.data).toHaveProperty('qrCodeData');
      expect(response.body.data).toHaveProperty('fare');
      expect(response.body.data.status).toBe('active');

      ticketId = response.body.data.ticketId;
    });

    it('should return error for unauthorized request', async () => {
      const response = await request(app)
        .post('/api/tickets/book')
        .send({
          fromStationId: testStationId1,
          toStationId: testStationId2,
          paymentMethod: 'UPI',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return validation error for invalid payment method', async () => {
      const response = await request(app)
        .post('/api/tickets/book')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fromStationId: testStationId1,
          toStationId: testStationId2,
          paymentMethod: 'Cash',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return error for same source and destination', async () => {
      const response = await request(app)
        .post('/api/tickets/book')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fromStationId: testStationId1,
          toStationId: testStationId1,
          paymentMethod: 'UPI',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/tickets/history', () => {
    it('should return user history', async () => {
      const response = await request(app)
        .get('/api/tickets/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('history');
      expect(response.body.data.history).toBeInstanceOf(Array);
      expect(response.body.data.history.length).toBeGreaterThan(0);
    });

    it('should return error for unauthorized request', async () => {
      const response = await request(app)
        .get('/api/tickets/history')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});

describe('4. Smart Card Module Tests', () => {
  describe('GET /api/cards/balance', () => {
    it('should return card balance', async () => {
      const response = await request(app)
        .get('/api/cards/balance')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('balance');
      expect(response.body.data).toHaveProperty('cardId');
      expect(response.body.data.cardId).toBe(cardId);
    });

    it('should return error for unauthorized request', async () => {
      const response = await request(app)
        .get('/api/cards/balance')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/cards/recharge', () => {
    it('should recharge card successfully', async () => {
      const response = await request(app)
        .post('/api/cards/recharge')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 500,
          paymentMethod: 'UPI',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('newBalance');
      expect(response.body.data.amountAdded).toBe(500);
      expect(response.body.data.newBalance).toBeGreaterThan(response.body.data.previousBalance);
    });

    it('should return validation error for amount below minimum', async () => {
      const response = await request(app)
        .post('/api/cards/recharge')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 5,
          paymentMethod: 'UPI',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return validation error for amount above maximum', async () => {
      const response = await request(app)
        .post('/api/cards/recharge')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 15000,
          paymentMethod: 'UPI',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return error for unauthorized request', async () => {
      const response = await request(app)
        .post('/api/cards/recharge')
        .send({
          amount: 500,
          paymentMethod: 'UPI',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/cards', () => {
    it('should return card details with recharge history', async () => {
      const response = await request(app)
        .get('/api/cards')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('card');
      expect(response.body.data).toHaveProperty('recentRecharges');
      expect(response.body.data.recentRecharges).toBeInstanceOf(Array);
    });
  });
});

describe('5. Journey Validation Module Tests', () => {
  describe('POST /api/journey/entry', () => {
    it('should allow entry with valid ticket', async () => {
      const response = await request(app)
        .post('/api/journey/entry')
        .send({
          mediaType: 'Ticket',
          mediaId: ticketId,
          stationId: testStationId1,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('journeyId');
      expect(response.body.message).toContain('Entry permitted');

      journeyId = response.body.data.journeyId;
    });

    it('should return error for already used ticket', async () => {
      const response = await request(app)
        .post('/api/journey/entry')
        .send({
          mediaType: 'Ticket',
          mediaId: ticketId,
          stationId: testStationId1,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toMatch(/already been used|active journey/);
    });

    it('should allow entry with valid card', async () => {
      // First complete the ticket journey
      await request(app)
        .post('/api/journey/exit')
        .send({
          mediaType: 'Ticket',
          mediaId: ticketId,
          stationId: testStationId2,
        });

      const response = await request(app)
        .post('/api/journey/entry')
        .send({
          mediaType: 'Card',
          mediaId: cardId,
          stationId: testStationId1,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('journeyId');
    });

    it('should return validation error for missing fields', async () => {
      const response = await request(app)
        .post('/api/journey/entry')
        .send({
          mediaType: 'Card',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return error for non-existent station', async () => {
      const response = await request(app)
        .post('/api/journey/entry')
        .send({
          mediaType: 'Card',
          mediaId: cardId,
          stationId: 99999,
        })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/journey/exit', () => {
    it('should allow exit with valid card', async () => {
      const response = await request(app)
        .post('/api/journey/exit')
        .send({
          mediaType: 'Card',
          mediaId: cardId,
          stationId: testStationId2,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('fareCharged');
      expect(response.body.message).toContain('Exit permitted');
    });

    it('should return error for no active journey', async () => {
      const response = await request(app)
        .post('/api/journey/exit')
        .send({
          mediaType: 'Card',
          mediaId: cardId,
          stationId: testStationId2,
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No active journey');
    });

    it('should return validation error for missing fields', async () => {
      const response = await request(app)
        .post('/api/journey/exit')
        .send({
          mediaType: 'Card',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});

describe('6. Health Check Tests', () => {
  describe('GET /health', () => {
    it('should return server health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.database).toBe('Connected');
    });
  });
});

describe('7. Error Handling Tests', () => {
  describe('404 Not Found', () => {
    it('should return 404 for non-existent endpoint', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });
});
