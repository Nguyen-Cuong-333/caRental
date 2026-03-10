const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', authController.register);
router.post('/login',    authController.login);

// Protected routes (cần đăng nhập)
router.get('/me', verifyToken, authController.getMe);

// Admin only
router.get('/users',         verifyToken, requireAdmin, authController.getAllUsers);
router.delete('/users/:userId', verifyToken, requireAdmin, authController.deleteUser);

module.exports = router;