const express = require('express');
const router = express.Router();
const { journeyEntry, journeyExit } = require('../controllers/journey.controller');
const validators = require('../middleware/validators');

// Public routes (used by station gates)
router.post('/entry', validators.journeyEntry, journeyEntry);
router.post('/exit', validators.journeyExit, journeyExit);

module.exports = router;
