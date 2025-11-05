const express = require('express');
const router = express.Router();
const { bookTicket, getHistory } = require('../controllers/ticket.controller');
const { authenticate } = require('../middleware/auth');
const validators = require('../middleware/validators');

// Protected routes
router.post('/book', authenticate, validators.bookTicket, bookTicket);
router.get('/history', authenticate, getHistory);

module.exports = router;
