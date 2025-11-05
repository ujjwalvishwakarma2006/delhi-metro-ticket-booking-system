const { body, query, validationResult } = require('express-validator');
const ResponseHandler = require('../utils/responseHandler');

/**
 * Middleware to handle validation results
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));
    return ResponseHandler.validationError(res, formattedErrors);
  }
  next();
};

/**
 * Validation rules for different endpoints
 */
const validators = {
  // Auth validators
  signup: [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email format').normalizeEmail(),
    body('phone').trim().notEmpty().withMessage('Phone is required').matches(/^[0-9+\-\s()]{10,15}$/).withMessage('Invalid phone format'),
    body('password').notEmpty().withMessage('Password is required').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    handleValidationErrors,
  ],

  login: [
    body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Invalid email format').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
    handleValidationErrors,
  ],

  // Fare validators
  getFares: [
    query('fromStationId').notEmpty().withMessage('fromStationId is required').isInt({ min: 1 }).withMessage('fromStationId must be a positive integer'),
    query('toStationId').notEmpty().withMessage('toStationId is required').isInt({ min: 1 }).withMessage('toStationId must be a positive integer'),
    handleValidationErrors,
  ],

  // Ticket booking validators
  bookTicket: [
    body('fromStationId').notEmpty().withMessage('fromStationId is required').isInt({ min: 1 }).withMessage('fromStationId must be a positive integer'),
    body('toStationId').notEmpty().withMessage('toStationId is required').isInt({ min: 1 }).withMessage('toStationId must be a positive integer'),
    body('paymentMethod').notEmpty().withMessage('paymentMethod is required').isIn(['UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'Wallet']).withMessage('Invalid payment method'),
    handleValidationErrors,
  ],

  // Smart card validators
  registerCard: [
    body('paymentMethod').notEmpty().withMessage('paymentMethod is required').isIn(['UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'Wallet']).withMessage('Invalid payment method'),
    handleValidationErrors,
  ],

  rechargeCard: [
    body('amount').notEmpty().withMessage('Amount is required').isFloat({ min: 10, max: 10000 }).withMessage('Amount must be between ₹10 and ₹10,000'),
    body('paymentMethod').notEmpty().withMessage('paymentMethod is required').isIn(['UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'Wallet']).withMessage('Invalid payment method'),
    handleValidationErrors,
  ],

  // Journey validators
  journeyEntry: [
    body('mediaType').notEmpty().withMessage('mediaType is required').isIn(['Ticket', 'Card']).withMessage('mediaType must be either Ticket or Card'),
    body('mediaId').notEmpty().withMessage('mediaId is required').isInt({ min: 1 }).withMessage('mediaId must be a positive integer'),
    body('stationId').notEmpty().withMessage('stationId is required').isInt({ min: 1 }).withMessage('stationId must be a positive integer'),
    handleValidationErrors,
  ],

  journeyExit: [
    body('mediaType').notEmpty().withMessage('mediaType is required').isIn(['Ticket', 'Card']).withMessage('mediaType must be either Ticket or Card'),
    body('mediaId').notEmpty().withMessage('mediaId is required').isInt({ min: 1 }).withMessage('mediaId must be a positive integer'),
    body('stationId').notEmpty().withMessage('stationId is required').isInt({ min: 1 }).withMessage('stationId must be a positive integer'),
    handleValidationErrors,
  ],
};

module.exports = validators;
