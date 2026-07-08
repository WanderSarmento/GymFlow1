const express = require('express');
const { webUpdateOccupancy, webSetOccupancy, webGetOccupancy } = require('../controllers/web.controller');

const router = express.Router();

// GET  /api/v1/web/ocupacao   → Lê a ocupação atual (para carregar o contador no painel)
router.get('/ocupacao', webGetOccupancy);

// POST /api/v1/web/update     → Incrementa (+1) ou decrementa (-1) a ocupação
router.post('/update', webUpdateOccupancy);

// POST /api/v1/web/set-value  → Define um valor exato de ocupação
router.post('/set-value', webSetOccupancy);

module.exports = router;
