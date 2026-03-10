const jwt = require('jsonwebtoken');

// ── Xác thực JWT ──────────────────────────────────────────
const verifyToken = (req, res, next) => {
  // Lấy token từ header Authorization: Bearer <token>
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Không có token. Vui lòng đăng nhập.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'carentell_secret_key');
    req.user = decoded; // { id, username, role }
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: 'Token không hợp lệ hoặc đã hết hạn.'
    });
  }
};

// ── Chỉ cho phép admin ────────────────────────────────────
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({
    success: false,
    message: 'Chỉ admin mới có quyền thực hiện hành động này.'
  });
};

module.exports = { verifyToken, requireAdmin };