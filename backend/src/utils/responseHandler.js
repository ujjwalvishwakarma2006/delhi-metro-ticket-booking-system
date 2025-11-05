/**
 * Standardized API response handlers
 */

class ResponseHandler {
  /**
   * Success response
   * @param {Object} res - Express response object
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Success message
   * @param {Object} data - Response data
   */
  static success(res, statusCode = 200, message = 'Success', data = null) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  /**
   * Error response
   * @param {Object} res - Express response object
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Error message
   * @param {Array} errors - Array of error details
   */
  static error(res, statusCode = 500, message = 'Internal Server Error', errors = null) {
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
    });
  }

  /**
   * Validation error response
   * @param {Object} res - Express response object
   * @param {Array} errors - Validation errors array
   */
  static validationError(res, errors) {
    return this.error(res, 400, 'Validation failed', errors);
  }

  /**
   * Not found response
   * @param {Object} res - Express response object
   * @param {string} resource - Resource name
   */
  static notFound(res, resource = 'Resource') {
    return this.error(res, 404, `${resource} not found`);
  }

  /**
   * Unauthorized response
   * @param {Object} res - Express response object
   * @param {string} message - Custom message
   */
  static unauthorized(res, message = 'Unauthorized access') {
    return this.error(res, 401, message);
  }

  /**
   * Forbidden response
   * @param {Object} res - Express response object
   * @param {string} message - Custom message
   */
  static forbidden(res, message = 'Access forbidden') {
    return this.error(res, 403, message);
  }
}

module.exports = ResponseHandler;
