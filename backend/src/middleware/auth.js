const jwt = require('jsonwebtoken');
const ResponseHandler = require('../utils/responseHandler');
const asyncHandler = require('../utils/asyncHandler');
const { query } = require('../config/database');

/**
 * JWT Authentication Middleware
 * Verifies JWT token and attaches user to request object
 */
const authenticate = asyncHandler(async (req, res, next) => {
  let token;

  // Check if token exists in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Check if token exists
  if (!token) {
    return ResponseHandler.unauthorized(res, 'No token provided, authorization denied');
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const result = await query(
      'SELECT userid, name, email, phone, createdat FROM "User" WHERE userid = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return ResponseHandler.unauthorized(res, 'User not found');
    }

    // Attach user to request object
    req.user = result.rows[0];
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    if (error.name === 'JsonWebTokenError') {
      return ResponseHandler.unauthorized(res, 'Invalid token');
    }
    if (error.name === 'TokenExpiredError') {
      return ResponseHandler.unauthorized(res, 'Token expired');
    }
    return ResponseHandler.unauthorized(res, 'Authentication failed');
  }
});

module.exports = { authenticate };
