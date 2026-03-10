const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const JWT_SECRET  = process.env.JWT_SECRET  || 'carentell_secret_key';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

// Tạo JWT
const signToken = (user) =>
  jwt.sign(
    { id: user._id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );

/* =====================================================
   REGISTER
===================================================== */
exports.register = async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập username và password.' });
    }

    const exists = await User.findOne({ username });
    if (exists) {
      return res.status(409).json({ success: false, message: 'Username đã tồn tại.' });
    }

    const user = await User.create({ username, password, role: role || 'staff' });
    const token = signToken(user);

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công.',
      token,
      user: { id: user._id, username: user.username, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server.', error: err.message });
  }
};

/* =====================================================
   LOGIN
===================================================== */
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập username và password.' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Sai username hoặc password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Sai username hoặc password.' });
    }

    const token = signToken(user);

    res.json({
      success: true,
      message: 'Đăng nhập thành công.',
      token,
      user: { id: user._id, username: user.username, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server.', error: err.message });
  }
};

/* =====================================================
   GET ME (lấy thông tin user đang đăng nhập)
===================================================== */
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy user.' });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server.', error: err.message });
  }
};

/* =====================================================
   GET ALL USERS (admin only)
===================================================== */
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, total: users.length, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server.', error: err.message });
  }
};

/* =====================================================
   DELETE USER (admin only)
===================================================== */
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'Không tìm thấy user.' });
    res.json({ success: true, message: 'Đã xóa user thành công.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server.', error: err.message });
  }
};