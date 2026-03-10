const express = require('express');
const router = express.Router();
const carController = require('../controllers/carController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

// GET — tất cả user đã login đều đọc được
router.get('/',            verifyToken, carController.getAllCars);
router.get('/:carNumber',  verifyToken, carController.getCarByNumber);

// POST / PUT / DELETE — chỉ admin
router.post('/',             verifyToken, requireAdmin, carController.createCar);
router.put('/:carNumber',    verifyToken, requireAdmin, carController.updateCar);
router.delete('/:carNumber', verifyToken, requireAdmin, carController.deleteCar);

module.exports = router;