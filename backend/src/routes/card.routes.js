const express = require('express');
const router = express.Router();
const { registerCard, rechargeCard, getBalance, getCardDetails } = require('../controllers/card.controller');
const { authenticate } = require('../middleware/auth');
const validators = require('../middleware/validators');

// Protected routes
router.post('/register', authenticate, validators.registerCard, registerCard);
router.post('/recharge', authenticate, validators.rechargeCard, rechargeCard);
router.get('/balance', authenticate, getBalance);
router.get('/', authenticate, getCardDetails);

module.exports = router;
