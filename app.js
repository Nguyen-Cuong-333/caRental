const express   = require('express');
const mongoose  = require('mongoose');
const bodyParser = require('body-parser');
const path      = require('path');
const cors      = require('cors');
require('dotenv').config();

// Import routes
const carRoutes     = require('./routes/carRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const authRoutes    = require('./routes/authRoutes');

// Initialize Express app
const app = express();

// ── CORS ──────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(s => s.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Cho phép requests không có origin (Postman, mobile app, curl)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS blocked: origin ${origin} không được phép.`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// ── Middleware ────────────────────────────────────────────
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'views')));

// Set EJS as view engine
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
    await seedAdmin(); // Tạo tài khoản admin mặc định nếu chưa có
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
  });

// Tạo tài khoản admin mặc định khi khởi động (nếu chưa tồn tại)
async function seedAdmin() {
  const User = require('./models/userModel');
  const exists = await User.findOne({ username: 'admin' });
  if (!exists) {
    await User.create({
      username: process.env.ADMIN_USERNAME || 'admin',
      password: process.env.ADMIN_PASSWORD || 'admin123',
      role: 'admin'
    });
    console.log('👤 Tài khoản admin mặc định đã được tạo: admin / admin123');
  }
}

// ── Home route (trả về login page nếu chưa auth) ─────────
app.get('/', (req, res) => {
  res.render('index');
});

// ── API Routes ────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/cars',     carRoutes);
app.use('/api/bookings', bookingRoutes);

// ── 404 Error handler ────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Error handling middleware ─────────────────────────────
app.use((err, req, res, next) => {
  // Xử lý lỗi CORS
  if (err.message && err.message.startsWith('CORS blocked')) {
    return res.status(403).json({ success: false, message: err.message });
  }
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
});

// ── Start server ──────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚗 CarRent Pro đang chạy tại http://localhost:${PORT}`);
  console.log(`🔑 JWT Secret: ${process.env.JWT_SECRET ? '(từ .env)' : '(mặc định — hãy đặt JWT_SECRET trong .env)'}`);
});

module.exports = app;