const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const errorHandler = require('./middleware/errorHandler');
const { pool } = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth.routes');
const stationRoutes = require('./routes/station.routes');
const ticketRoutes = require('./routes/ticket.routes');
const cardRoutes = require('./routes/card.routes');
const journeyRoutes = require('./routes/journey.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' })); // CORS
app.use(morgan('dev')); // Request logging
app.use(express.json()); // JSON body parser
app.use(express.urlencoded({ extended: true })); // URL-encoded body parser

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    await pool.query('SELECT 1');
    res.status(200).json({
      success: true,
      message: 'Server is healthy',
      timestamp: new Date().toISOString(),
      database: 'Connected',
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Server is unhealthy',
      timestamp: new Date().toISOString(),
      database: 'Disconnected',
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/stations', stationRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/journey', journeyRoutes);

// Event simulator for testing WebSocket (development only)
if (process.env.NODE_ENV !== 'production') {
  const { simulateEvents } = require('./utils/testEvents');
  let simulatorRunning = false;
  
  app.post('/api/test/start-simulator', (req, res) => {
    if (!simulatorRunning) {
      simulateEvents();
      simulatorRunning = true;
      res.json({ success: true, message: 'Event simulator started' });
    } else {
      res.json({ success: false, message: 'Simulator already running' });
    }
  });
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path,
  });
});

// Global error handler
app.use(errorHandler);

// Start server only if not in test mode
let server;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    console.log('==========================================');
    console.log('🚇 Delhi Metro Ticket Booking System API');
    console.log('==========================================');
    console.log(`📡 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🗄️  Database: ${process.env.DB_NAME || 'delhi_metro_system'}`);
    console.log('==========================================');
  });

  // Initialize WebSocket server for live logging
  const { initializeWebSocket } = require('./utils/websocket');
  initializeWebSocket(server);

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      pool.end(() => {
        console.log('Database pool has ended');
        process.exit(0);
      });
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
      pool.end(() => {
        console.log('Database pool has ended');
        process.exit(0);
      });
    });
  });
}

module.exports = app;
