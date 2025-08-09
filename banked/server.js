/* server.js */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

// 初始化Express应用
const app = express();
app.use(cors()); // 允许跨域请求
app.use(express.json()); // 解析JSON请求体

// 创建MySQL连接池
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
});

// 生成JWT令牌
function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '7d' } // 7天有效期
  );
}

// 身份验证中间件（保护需要登录的接口）
function auth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'No token' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET); // 验证令牌并解析用户信息
    next(); // 验证通过，继续处理请求
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// 记录登录日志到数据库
async function logLogin({ userId, username, ip, ua, success, message }) {
  const sql = `
    INSERT INTO login_logs 
    (user_id, username, ip, user_agent, success, message) 
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  await pool.execute(sql, [
    userId || null,
    username,
    ip || null,
    ua || null,
    success ? 1 : 0,
    message || null
  ]);
}

// 注册接口
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body || {};

  // 验证请求参数
  if (!username || !password) {
    return res.status(400).json({ message: 'username/password required' });
  }

  // 检查用户名是否已存在
  const [rows] = await pool.execute(
    'SELECT id FROM users WHERE username=?',
    [username]
  );
  if (rows.length) {
    return res.status(409).json({ message: 'username exists' });
  }

  // 加密密码并创建用户
  const hash = await bcrypt.hash(password, 10); // 10轮加密
  const [result] = await pool.execute(
    'INSERT INTO users (username, password_hash) VALUES (?, ?)',
    [username, hash]
  );

  res.json({ id: result.insertId, username });
});

// 登录接口
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress; // 获取客户端IP
  const ua = req.headers['user-agent']; // 获取用户代理（浏览器/设备信息）

  // 查询用户
  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE username=?',
    [username]
  );
  if (!rows.length) {
    await logLogin({ username, ip, ua, success: false, message: 'user not found' });
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const user = rows[0];
  // 验证密码
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    await logLogin({
      userId: user.id,
      username,
      ip,
      ua,
      success: false,
      message: 'wrong password'
    });
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // 更新最后登录时间
  await pool.execute(
    'UPDATE users SET last_login_at = NOW() WHERE id=?',
    [user.id]
  );

  // 生成令牌并记录成功日志
  const token = signToken(user);
  await logLogin({
    userId: user.id,
    username,
    ip,
    ua,
    success: true,
    message: 'login ok'
  });

  res.json({
    token,
    user: { id: user.id, username: user.username }
  });
});

// 获取当前登录用户信息（需要身份验证）
app.get('/api/me', auth, async (req, res) => {
  res.json({ user: req.user });
});

// 记录自定义日志（需要身份验证）
app.post('/api/logs', auth, async (req, res) => {
  const { message } = req.body || {};
  await pool.execute(
    'INSERT INTO login_logs (user_id, username, success, message) VALUES (?, ?, 1, ?)',
    [req.user.id, req.user.username, message || 'event']
  );
  res.json({ ok: true });
});

// 启动服务器
app.listen(process.env.PORT || 3000, () => {
  console.log('API on http://localhost:' + (process.env.PORT || 3000));
});