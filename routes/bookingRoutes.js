const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

// =============================
// SPECIFIC ROUTES (đặt lên trên)
// =============================

// Overdue bookings — staff & admin
router.get('/overdue', verifyToken, bookingController.getOverdueBookings);

// Get bookings for a specific car
router.get('/car/:carNumber', verifyToken, bookingController.getBookingsByCarNumber);

// Get bookings for a specific customer
router.get('/customer/:customerName', verifyToken, bookingController.getBookingsByCustomerName);

// =============================
// GENERAL ROUTES
// =============================

// Get all bookings — staff & admin
router.get('/', verifyToken, bookingController.getAllBookings);

// Create a new booking — staff & admin
router.post('/', verifyToken, bookingController.createBooking);

// =============================
// PARAM ROUTES (luôn đặt cuối)
// =============================

// Get a specific booking by ID
router.get('/:bookingId', verifyToken, bookingController.getBookingById);

// Update a booking
router.put('/:bookingId', verifyToken, bookingController.updateBooking);

// Pickup & Return — staff & admin
router.post('/:bookingId/pickup', verifyToken, bookingController.pickupBooking);
router.post('/:bookingId/return', verifyToken, bookingController.returnBooking);

// Delete — chỉ admin
router.delete('/:bookingId', verifyToken, requireAdmin, bookingController.deleteBooking);

module.exports = router;