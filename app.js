const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

// Import routes
const carRoutes = require('./routes/carRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const authRoutes = require('./routes/authRoutes');

// Initialize Express app
const app = express();


// ── CORS CONFIG (FIX RENDER ERROR) ─────────────────────────
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'https://carentell-pro.onrender.com'
];

app.use(cors({
  origin: function (origin, callback) {

    // Cho phép Postman / curl / mobile
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(null, false);

  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));


// ── Middleware ────────────────────────────────────────────
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'views')));

// Set EJS view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


// ── MongoDB Connection ────────────────────────────────────
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/carRentalDB';

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('✅ MongoDB connected successfully');
  await seedAdmin();
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
});


// ── Create default admin account ──────────────────────────
async function seedAdmin() {
  const User = require('./models/userModel');

  const exists = await User.findOne({ username: 'admin' });

  if (!exists) {
    await User.create({
      username: process.env.ADMIN_USERNAME || 'admin',
      password: process.env.ADMIN_PASSWORD || 'admin123',
      role: 'admin'
    });

    console.log('👤 Admin created: admin / admin123');
  }
}


// ── Home route ────────────────────────────────────────────
app.get('/', (req, res) => {
  res.render('index');
});


// ── API Routes ────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/cars', carRoutes);
app.use('/api/bookings', bookingRoutes);


// ── 404 Handler ───────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});


// ── Global Error Handler ──────────────────────────────────
app.use((err, req, res, next) => {

  console.error(err.stack);

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message
  });
});


// ── Start Server ──────────────────────────────────────────
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚗 CarRent Pro running at http://localhost:${PORT}`);
  console.log(`🔑 JWT Secret: ${process.env.JWT_SECRET ? '(from .env)' : '(missing, please set JWT_SECRET)'}`);
});


module.exports = app;