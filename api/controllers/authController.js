const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../postgresql/config.js');

const register = async (req, res) => {
  const { username, password } = req.body;

  const userExists = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  if (userExists.rows.length > 0) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, hashedPassword]);

  res.status(201).json({ message: 'User successfully registered' });
};

const login = async (req, res) => {
  const { username, password } = req.body;

  const user = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  if (user.rows.length === 0) {
    return res.status(400).json({ error: 'Invalid username or password' });
  }

  const validPassword = await bcrypt.compare(password, user.rows[0].password);
  if (!validPassword) {
    return res.status(400).json({ error: 'Invalid username or password' });
  }

  const token = jwt.sign(
    { id: user.rows[0].id, username: user.rows[0].username },
    process.env.SECURE_KEY,
    { expiresIn: '1h' }
  );

  res.json({ token });
};

const verifyToken = (req, res) => {
  return res.status(200).json({ message: 'Token is valid' });
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }

  jwt.verify(token, process.env.SECURE_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  });
};

module.exports = { register, login, verifyToken, authenticateToken };
