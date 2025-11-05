const ResponseHandler = require('../utils/responseHandler');

/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // PostgreSQL errors
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique violation
        return ResponseHandler.error(res, 409, 'Resource already exists', [
          { field: err.constraint, message: 'This value already exists' },
        ]);
      case '23503': // Foreign key violation
        return ResponseHandler.error(res, 400, 'Invalid reference', [
          { field: err.constraint, message: 'Referenced resource does not exist' },
        ]);
      case '23502': // Not null violation
        return ResponseHandler.error(res, 400, 'Required field missing', [
          { field: err.column, message: 'This field is required' },
        ]);
      case '22P02': // Invalid text representation
        return ResponseHandler.error(res, 400, 'Invalid data format');
      default:
        console.error('Unhandled database error:', err);
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return ResponseHandler.unauthorized(res, 'Invalid token');
  }
  if (err.name === 'TokenExpiredError') {
    return ResponseHandler.unauthorized(res, 'Token expired');
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return ResponseHandler.validationError(res, err.errors);
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  return ResponseHandler.error(res, statusCode, message);
};

module.exports = errorHandler;
