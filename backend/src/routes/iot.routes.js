const express = require('express');
const { updateOccupancy } = require('../controllers/iot.controller');

const router = express.Router();

// Endpoint público/local simples — sem autenticação por API Key
router.post('/update', updateOccupancy);

module.exports = router;
