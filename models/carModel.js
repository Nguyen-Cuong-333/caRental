const mongoose = require('mongoose');

// Define Car Schema
const carSchema = new mongoose.Schema({
  carNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  capacity: {
    type: Number,
    required: true,
    min: 1
  },
  status: {
    type: String,
    enum: ['available', 'rented', 'maintenance'],
    default: 'available'
  },
  pricePerDay: {
    type: Number,
    required: true,
    min: 0
  },
  features: {
    type: [String],
    default: []
  },
  type: {
    type: String,
    enum: ['sedan', 'suv', 'luxury', 'sports', 'van'],
    default: 'sedan'
  }
}, {
  timestamps: true
});

// Create and export Car model
const Car = mongoose.model('Car', carSchema);

module.exports = Car;
