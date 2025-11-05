const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const ResponseHandler = require('../utils/responseHandler');
const asyncHandler = require('../utils/asyncHandler');
const systemEvents = require('../utils/eventEmitter');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/signup
 * @access  Public
 */
const signup = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  // Check if user already exists
  const existingUser = await query('SELECT userid FROM "User" WHERE email = $1', [email]);

  if (existingUser.rows.length > 0) {
    return ResponseHandler.error(res, 409, 'User with this email already exists');
  }

  // Hash password
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  // Create user
  const result = await query(
    'INSERT INTO "User" (name, email, phone, passwordhash) VALUES ($1, $2, $3, $4) RETURNING userid, name, email, phone, createdat',
    [name, email, phone, passwordHash]
  );

  const user = result.rows[0];

  // Note: Smart card is NOT automatically created during signup
  // Users must register a smart card separately via POST /api/cards/register

  // Generate JWT token
  const token = jwt.sign({ userId: user.userid, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });

  // Emit new user event for live logging
  systemEvents.emitNewUser({
    id: user.userid,
    name: user.name,
    email: user.email,
  });

  return ResponseHandler.success(res, 201, 'User registered successfully', {
    token,
    user: {
      id: user.userid,
      name: user.name,
      email: user.email,
      phone: user.phone,
      createdAt: user.createdat,
      smartCard: null, // No smart card initially
    },
  });
});

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Get user with password hash
  const result = await query(
    'SELECT userid, name, email, phone, passwordhash, createdat FROM "User" WHERE email = $1',
    [email]
  );

  if (result.rows.length === 0) {
    return ResponseHandler.error(res, 401, 'Invalid email or password');
  }

  const user = result.rows[0];

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.passwordhash);

  if (!isPasswordValid) {
    return ResponseHandler.error(res, 401, 'Invalid email or password');
  }

  // Get user's smart card
  const cardResult = await query(
    'SELECT cardid, balance, isactive FROM smartcard WHERE userid = $1 AND isactive = true',
    [user.userid]
  );

  // Generate JWT token
  const token = jwt.sign({ userId: user.userid, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });

  return ResponseHandler.success(res, 200, 'Login successful', {
    token,
    user: {
      id: user.userid,
      name: user.name,
      email: user.email,
      phone: user.phone,
      createdAt: user.createdat,
      smartCard: cardResult.rows.length > 0 ? {
        cardId: cardResult.rows[0].cardid,
        balance: parseFloat(cardResult.rows[0].balance),
        isActive: cardResult.rows[0].isactive,
      } : null,
    },
  });
});

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  const userId = req.user.userid;

  // Get user details
  const userResult = await query(
    'SELECT userid, name, email, phone, createdat FROM "User" WHERE userid = $1',
    [userId]
  );

  if (userResult.rows.length === 0) {
    return ResponseHandler.notFound(res, 'User');
  }

  const user = userResult.rows[0];

  // Get user's smart card
  const cardResult = await query(
    'SELECT cardid, balance, isactive, issuedat, lastusedat FROM smartcard WHERE userid = $1 AND isactive = true',
    [userId]
  );

  return ResponseHandler.success(res, 200, 'User profile retrieved successfully', {
    user: {
      id: user.userid,
      name: user.name,
      email: user.email,
      phone: user.phone,
      createdAt: user.createdat,
      smartCard: cardResult.rows.length > 0 ? {
        cardId: cardResult.rows[0].cardid,
        balance: parseFloat(cardResult.rows[0].balance),
        isActive: cardResult.rows[0].isactive,
        issuedAt: cardResult.rows[0].issuedat,
        lastUsedAt: cardResult.rows[0].lastusedat,
      } : null,
    },
  });
});

module.exports = {
  signup,
  login,
  getMe,
};
