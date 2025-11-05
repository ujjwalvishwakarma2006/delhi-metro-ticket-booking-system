const express = require('express');
const router = express.Router();
const { signup, login, getMe } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const validators = require('../middleware/validators');

// Public routes
router.post('/signup', validators.signup, signup);
router.post('/login', validators.login, login);

// Protected routes
router.get('/me', authenticate, getMe);

module.exports = router;
