const express = require('express');
const { 
  getGlobalDashboard, 
  createGym, 
  toggleGymStatus 
} = require('../controllers/admin.controller');
const { authMiddleware, checkRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

// Todas as rotas de admin exigem autenticação e a role SUPER_ADMIN
router.use(authMiddleware);
router.use(checkRoles('SUPER_ADMIN'));

router.get('/dashboard', getGlobalDashboard);
router.post('/gyms', createGym);
router.put('/gyms/:id/status', toggleGymStatus);

module.exports = router;
