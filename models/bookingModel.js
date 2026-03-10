const mongoose = require('mongoose');

// Define Booking Schema
const bookingSchema = new mongoose.Schema({
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  carNumber: {
    type: String,
    required: true
    // this is a simple plate/string, not an ObjectId reference
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true,
    validate: {
      validator: function(value) {
        return value > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  returnDate: {
    type: Date,
    default: null
  },
  // optionally record when the customer actually picked up the car
  pickupDate: {
    type: Date,
    default: null
  },
  // track booking status for various stages (initially booked)
  status: {
    type: String,
    enum: ['booked', 'pickup', 'returned'],
    default: 'booked'
  },
  lateDays: {
    type: Number,
    default: 0,
    min: 0
  },
  extraCharge: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  }
}, {
  timestamps: true
});

// Create and export Booking model
const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
