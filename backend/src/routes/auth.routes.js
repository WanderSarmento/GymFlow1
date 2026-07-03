const express = require('express');
const { login, getMe } = require('../controllers/auth.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/login', login);
router.get('/me', authMiddleware, getMe);

module.exports = router;
