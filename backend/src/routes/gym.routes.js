const express = require('express');
const multer = require('multer');
const { 
  getPublicGym, 
  getOwnerGym, 
  updateGymSettings, 
  getPeakHours,
  getPublicPeakHours,
  updateGymVisuals
} = require('../controllers/gym.controller');
const { authMiddleware, checkRoles } = require('../middlewares/auth.middleware');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Rotas públicas (abertas)
router.get('/public/:slug', getPublicGym);
router.get('/public/:slug/peak-hours', getPublicPeakHours);

// Rotas protegidas (Dono/Staff da Academia)
router.get('/owner', authMiddleware, getOwnerGym);
router.put('/settings', authMiddleware, checkRoles('OWNER'), updateGymSettings);
router.put('/visuals', authMiddleware, checkRoles('OWNER'), upload.single('logo'), updateGymVisuals);
router.get('/peak-hours', authMiddleware, getPeakHours);

module.exports = router;
