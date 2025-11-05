const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const systemEvents = require('../utils/eventEmitter');

/**
 * Initialize WebSocket server for live logging
 * @param {http.Server} server - HTTP server instance
 */
function initializeWebSocket(server) {
  const wss = new WebSocket.Server({ 
    noServer: true,
    path: '/api/logs/subscribe'
  });

  // Handle WebSocket upgrade requests
  server.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url, `http://${request.headers.host}`);
    
    if (pathname === '/api/logs/subscribe') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // Handle new WebSocket connections
  wss.on('connection', (ws, request) => {
    console.log('📡 New WebSocket connection established');

    // Extract token from query parameter
    const url = new URL(request.url, `http://${request.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.send(JSON.stringify({
        error: true,
        message: 'Authentication required. Please provide token in query parameter.',
      }));
      ws.close();
      return;
    }

    // Verify JWT token
    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.userId;
    } catch (error) {
      ws.send(JSON.stringify({
        error: true,
        message: 'Invalid or expired token',
      }));
      ws.close();
      return;
    }

    // Send connection success message
    ws.send(JSON.stringify({
      success: true,
      message: 'Connected to live logging stream',
      timestamp: new Date().toISOString(),
    }));

    // Create event handlers for this client
    const eventHandlers = {
      NEW_USER: (data) => sendIfOpen(ws, data),
      TICKET_BOOKED: (data) => sendIfOpen(ws, data),
      CARD_REGISTERED: (data) => sendIfOpen(ws, data),
      CARD_RECHARGED: (data) => sendIfOpen(ws, data),
      JOURNEY_ENTRY: (data) => sendIfOpen(ws, data),
      JOURNEY_EXIT: (data) => sendIfOpen(ws, data),
    };

    // Register event listeners
    Object.entries(eventHandlers).forEach(([event, handler]) => {
      systemEvents.on(event, handler);
    });

    // Handle client disconnection
    ws.on('close', () => {
      console.log('📡 WebSocket connection closed');
      // Remove all event listeners for this client
      Object.entries(eventHandlers).forEach(([event, handler]) => {
        systemEvents.removeListener(event, handler);
      });
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Handle incoming messages (for potential two-way communication)
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        console.log('Received message from client:', data);
        
        // Echo back confirmation
        ws.send(JSON.stringify({
          success: true,
          message: 'Message received',
          receivedData: data,
        }));
      } catch (error) {
        ws.send(JSON.stringify({
          error: true,
          message: 'Invalid message format',
        }));
      }
    });
  });

  console.log('✅ WebSocket server initialized for live logging');
  return wss;
}

/**
 * Helper function to send data only if WebSocket is open
 */
function sendIfOpen(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

module.exports = { initializeWebSocket };
