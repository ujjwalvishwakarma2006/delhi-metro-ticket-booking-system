const express = require('express');
const router = express.Router();
const { getAllStations, getFare } = require('../controllers/station.controller');
const validators = require('../middleware/validators');

// Public routes
router.get('/', getAllStations);
router.get('/fares', validators.getFares, getFare);

module.exports = router;
