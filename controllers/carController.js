const Car = require('../models/carModel');

// Get all cars
exports.getAllCars = async (req, res) => {
  try {
    const cars = await Car.find();
    res.json({
      success: true,
      data: cars
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving cars',
      error: error.message
    });
  }
};

// Get a single car by carNumber
exports.getCarByNumber = async (req, res) => {
  try {
    const { carNumber } = req.params;
    const car = await Car.findOne({ carNumber });
    
    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car not found'
      });
    }
    
    res.json({
      success: true,
      data: car
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving car',
      error: error.message
    });
  }
};

// Create a new car
exports.createCar = async (req, res) => {
  try {
    const { carNumber, capacity, status, pricePerDay, features } = req.body;
    
    // Validate required fields
    if (!carNumber || !capacity || !pricePerDay) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: carNumber, capacity, pricePerDay'
      });
    }
    
    const car = new Car({
      carNumber,
      capacity,
      status: status || 'available',
      pricePerDay,
      features: features || []
    });
    
    const savedCar = await car.save();
    
    res.status(201).json({
      success: true,
      message: 'Car created successfully',
      data: savedCar
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating car',
      error: error.message
    });
  }
};

// Update car
exports.updateCar = async (req, res) => {
  try {
    const { carNumber } = req.params;
    const updateData = req.body;
    
    const car = await Car.findOneAndUpdate(
      { carNumber },
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Car updated successfully',
      data: car
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating car',
      error: error.message
    });
  }
};

// Delete car
exports.deleteCar = async (req, res) => {
  try {
    const { carNumber } = req.params;
    
    const car = await Car.findOneAndDelete({ carNumber });
    
    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Car deleted successfully',
      data: car
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting car',
      error: error.message
    });
  }
};
