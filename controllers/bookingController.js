const Booking = require('../models/bookingModel');
const Car = require('../models/carModel');

/* =====================================================
   HELPER FUNCTIONS
===================================================== */

// Calculate rental days
const calculateRentalDays = (startDate, endDate) => {
  const timeDiff = new Date(endDate) - new Date(startDate);
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  return daysDiff > 0 ? daysDiff : 1;
};

// Calculate late days and extra charge (vnd20k per day)
const calculateLateInfo = (dueDate, returnDate) => {
  if (!returnDate) {
    return { lateDays: 0, extraCharge: 0 };
  }
  const timeDiff = new Date(returnDate) - new Date(dueDate);
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  const lateDays = daysDiff > 0 ? daysDiff : 0;
  return {
    lateDays,
    extraCharge: lateDays * 20000 // 20k VND per late day
  };
};

// Check overlapping bookings (bao gồm cả booking chưa trả xe)
const checkOverlappingBookings = async (
  carNumber,
  startDate,
  endDate,
  excludeBookingId = null
) => {
const query = {
  carNumber,
  status: { $ne: 'returned' },  // bỏ qua booking đã trả xe
  startDate: { $lt: new Date(endDate) },
  endDate: { $gt: new Date(startDate) }
};

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  const overlappingBooking = await Booking.findOne(query);
  return !!overlappingBooking;
};

/* =====================================================
   GET ALL BOOKINGS
===================================================== */

exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      // carNumber is a plain string, not an ObjectId, so no population needed
      .sort({ createdAt: -1 });

    // attach computed fields
    const enriched = bookings.map(b => {
      const rentalDays = calculateRentalDays(b.startDate, b.endDate);
      return {
        ...b.toObject(),
        
        rentalDays,
        lateDays: b.lateDays || 0,
        extraCharge: b.extraCharge || 0
      };
    });

    res.json({
      success: true,
      total: bookings.length,
      data: enriched
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving bookings',
      error: error.message
    });
  }
};

/* =====================================================
   GET BOOKING BY ID
===================================================== */

exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    // carNumber is stored directly on booking as string

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const rentalDays = calculateRentalDays(booking.startDate, booking.endDate);
    res.json({
      success: true,
      data: {
        ...booking.toObject(),
        rentalDays,
        lateDays: booking.lateDays || 0,
        extraCharge: booking.extraCharge || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving booking',
      error: error.message
    });
  }
};

/* =====================================================
   CREATE BOOKING
===================================================== */

exports.createBooking = async (req, res) => {
  try {
    const { customerName, carNumber, startDate, endDate, returnDate } = req.body;

    if (!customerName || !carNumber || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    const car = await Car.findOne({ carNumber });
    if (!car) {
      return res.status(404).json({
        success: false,
        message: 'Car not found'
      });
    }

    const hasConflict = await checkOverlappingBookings(
      carNumber,
      start,
      end
    );

    if (hasConflict) {
      return res.status(409).json({
        success: false,
        message: 'Car already booked in selected time'
      });
    }

    const rentalDays = calculateRentalDays(start, end);
    let totalAmount = rentalDays * car.pricePerDay;

    // if returnDate provided, compute late days and extra charge
    let lateDays = 0;
    let extraCharge = 0;
    let returnDt = null;
    if (returnDate) {
      returnDt = new Date(returnDate);
      const lateInfo = calculateLateInfo(end, returnDt);
      lateDays = lateInfo.lateDays;
      extraCharge = lateInfo.extraCharge;
      totalAmount += extraCharge;
    }

    const booking = await Booking.create({
      customerName,
      carNumber,
      startDate: start,
      endDate: end,
      returnDate: returnDt,
      lateDays,
      extraCharge,
      totalAmount
      // status and pickupDate will take defaults from schema ('booked' and null)
    });

// Nếu startDate <= hôm nay thì xe đang được thuê, ngược lại vẫn available
const newStatus = start <= new Date() ? 'rented' : 'available';
await Car.findOneAndUpdate(
  { carNumber },
  { status: newStatus }
);
    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: {
        ...booking.toObject(),
        rentalDays,
        lateDays,
        extraCharge
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating booking',
      error: error.message
    });
  }
};

/* =====================================================
   UPDATE BOOKING
===================================================== */

exports.updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const { customerName, startDate, endDate } = req.body;
    const updateData = {};

    if (customerName) updateData.customerName = customerName;

    // update rental period if provided
    if (startDate || endDate) {
      const newStart = startDate ? new Date(startDate) : booking.startDate;
      const newEnd = endDate ? new Date(endDate) : booking.endDate;

      if (newEnd <= newStart) {
        return res.status(400).json({
          success: false,
          message: 'End date must be after start date'
        });
      }

      const hasConflict = await checkOverlappingBookings(
        booking.carNumber,
        newStart,
        newEnd,
        booking._id
      );

      if (hasConflict) {
        return res.status(409).json({
          success: false,
          message: 'Car already booked in selected time'
        });
      }

      const car = await Car.findOne({ carNumber: booking.carNumber });
      const rentalDays = calculateRentalDays(newStart, newEnd);

      updateData.startDate = newStart;
      updateData.endDate = newEnd;
      updateData.totalAmount = rentalDays * car.pricePerDay;
    }

    // handle return date if provided (could be set when car is returned)
    if (req.body.returnDate) {
      const returnDt = new Date(req.body.returnDate);
      const dueDate = updateData.endDate || booking.endDate;

      const lateInfo = calculateLateInfo(dueDate, returnDt);
      updateData.returnDate = returnDt;
      updateData.lateDays = lateInfo.lateDays;
      updateData.extraCharge = lateInfo.extraCharge;

      // adjust total amount with extra charge (rental portion already in totalAmount if changed above)
      updateData.totalAmount = (updateData.totalAmount || booking.totalAmount) + lateInfo.extraCharge;

      // update car status to available when returned
      await Car.findOneAndUpdate(
        { carNumber: booking.carNumber },
        { status: 'available' }
      );
    }
    const updatedBooking = await Booking.findByIdAndUpdate(
      booking._id,
      updateData,
      { new: true }
    );

    // include some calculated fields for convenience
    const rentalDays = calculateRentalDays(updatedBooking.startDate, updatedBooking.endDate);
    res.json({
      success: true,
      message: 'Booking updated successfully',
      data: {
        ...updatedBooking.toObject(),
        rentalDays,
        lateDays: updatedBooking.lateDays,
        extraCharge: updatedBooking.extraCharge
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating booking',
      error: error.message
    });
  }
};

/* =====================================================
   PICKUP BOOKING
   - pickupDate is set to now
   - current time must be >= startDate
   - booking.status becomes 'pickup'
   - car status updated to 'rented' (if not already)
===================================================== */

exports.pickupBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const now = new Date();
    booking.pickupDate = now;
    booking.status = 'pickup';
    await booking.save();

    // ensure car shows as rented
    await Car.findOneAndUpdate(
      { carNumber: booking.carNumber },
      { status: 'rented' }
    );

    res.json({
      success: true,
      message: 'Car pickup recorded',
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error processing pickup',
      error: error.message
    });
  }
};

exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    await Car.findOneAndUpdate(
      { carNumber: booking.carNumber },
      { status: 'available' }
    );

    res.json({
      success: true,
      message: 'Booking deleted successfully'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting booking',
      error: error.message
    });
  }
};

/* =====================================================
   GET BOOKINGS BY CAR
===================================================== */

exports.getBookingsByCarNumber = async (req, res) => {
  try {
    const bookings = await Booking.find({
      carNumber: req.params.carNumber
    }).sort({ startDate: 1 });

    res.json({
      success: true,
      total: bookings.length,
      data: bookings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving bookings',
      error: error.message
    });
  }
};

/* =====================================================
   GET BOOKINGS BY CUSTOMER
===================================================== */

exports.getBookingsByCustomerName = async (req, res) => {
  try {
    const bookings = await Booking.find({
      customerName: req.params.customerName
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      total: bookings.length,
      data: bookings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving bookings',
      error: error.message
    });
  }
};

/* =====================================================
   GET OVERDUE BOOKINGS
   endDate = null && startDate quá 24h
===================================================== */

exports.getOverdueBookings = async (req, res) => {
  try {
    const date24hAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

const overdueBookings = await Booking.find({
  endDate: { $lt: new Date() },
  status: { $ne: 'returned' }
})
  .sort({ startDate: 1 });

    res.json({
      success: true,
      message: 'Overdue bookings retrieved successfully',
      total: overdueBookings.length,
      data: overdueBookings
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving overdue bookings',
      error: error.message
    });
  }
};
exports.returnBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.status === 'returned') {
      return res.status(400).json({ success: false, message: 'Car already returned' });
    }

    const returnDate = new Date();
    const { lateDays, extraCharge } = calculateLateInfo(booking.endDate, returnDate);

    booking.returnDate = returnDate;
    booking.lateDays = lateDays;
    booking.extraCharge = extraCharge;
    booking.totalAmount = booking.totalAmount + extraCharge;
    booking.status = 'returned';
    await booking.save();

    await Car.findOneAndUpdate(
      { carNumber: booking.carNumber },
      { status: 'available' }
    );

    res.json({
      success: true,
      message: 'Car returned successfully',
      data: booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error processing return',
      error: error.message
    });
  }
};