const request = require('supertest');
const express = require('express');
const { register, login, verifyToken, authenticateToken } = require('../../controllers/authController.js');
const pool = require('../../postgresql/config.js');
jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');


const app = express();
app.use(express.json());

app.post('/register', register);
app.post('/login', login);
app.get('/verify', authenticateToken, verifyToken);


jest.mock('../../postgresql/config.js');

describe('Auth Controller', () => {
  describe('POST /register', () => {
    it('should register a new user', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      pool.query.mockResolvedValueOnce({});

      const res = await request(app).post('/register').send({
        username: 'testuser',
        password: 'testpassword',
      });

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('message', 'User successfully registered');
    });

    it('should return 400 if username already exists', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ username: 'testuser' }] }); // User exists

      const res = await request(app).post('/register').send({
        username: 'testuser',
        password: 'testpassword',
      });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error', 'Username already exists');
    });
  });

  describe('POST /login', () => {
    it('should log in a user with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('testpassword', 10);
      pool.query.mockResolvedValueOnce({ rows: [{ username: 'testuser', password: hashedPassword }] });

      const res = await request(app).post('/login').send({
        username: 'testuser',
        password: 'testpassword',
      });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('token');
    });

    it('should return 400 if username does not exist', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app).post('/login').send({
        username: 'testuser',
        password: 'testpassword',
      });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error', 'Invalid username or password');
    });

    it('should return 400 if password is incorrect', async () => {
      const hashedPassword = await bcrypt.hash('wrongpassword', 10);
      pool.query.mockResolvedValueOnce({ rows: [{ username: 'testuser', password: hashedPassword }] });

      const res = await request(app).post('/login').send({
        username: 'testuser',
        password: 'testpassword',
      });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error', 'Invalid username or password');
    });
  });

  describe('GET /verify', () => {
    it('should verify a valid token', async () => {
      const token = jwt.sign({ username: 'testuser' }, process.env.SECURE_KEY, { expiresIn: '1h' });

      const res = await request(app)
        .get('/verify')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Token is valid');
    });

    it('should return 401 if token is missing', async () => {
      const res = await request(app).get('/verify');

      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('error', 'Access denied');
    });

    it('should return 403 if token is invalid', async () => {
      const res = await request(app)
        .get('/verify')
        .set('Authorization', 'Bearer invalidtoken');

      expect(res.statusCode).toEqual(403);
      expect(res.body).toHaveProperty('error', 'Invalid token');
    });
  });
});
