const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const pool = require('./postgresql/config');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const {
    authenticateSocketUser,
    initializeSocketUser,
    onDisconnection,
    sendMessage,
    joinRoom,
    leaveRoom,
} = require('./socketio/socket.js');
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }
});
require('dotenv').config();

app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

io.use(authenticateSocketUser);

app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    const userExists = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (userExists.rows.length > 0) {
        return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, hashedPassword]);

    res.status(201).json({ message: 'User successfully registered' });
});

app.post('/login', async (req, res) => {
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
});

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

app.get('/users', authenticateToken, async (req, res) => {
    const users = await pool.query('SELECT * FROM users');
    res.json(users.rows);
});

app.get('/chatRooms', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const chatRooms = await pool.query(
      `SELECT chat_rooms.* 
       FROM chat_rooms
       JOIN room_members ON chat_rooms.id = room_members.room_id
       WHERE room_members.user_id = $1`,
      [userId]
    );
    res.json(chatRooms.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chat rooms' });
  }
});

app.post('/chatRooms', authenticateToken, async (req, res) => {
    const { name } = req.body;

    try {
        const result = await pool.query('INSERT INTO chat_rooms (name) VALUES ($1) RETURNING *', [name]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create chat room' });
    }
});

app.get('/messages/:roomId', authenticateToken, async (req, res) => {
    const { roomId } = req.params;

    const messages = await pool.query('SELECT * FROM messages WHERE room_id = $1 ORDER BY created_at ASC', [roomId]);
    res.json(messages.rows);
});

app.post('/messages', authenticateToken, async (req, res) => {
    const { content, room_id, sender_id, receiver_id } = req.body;

    try {
        const result = await pool.query(
            'INSERT INTO messages (content, room_id, sender_id, receiver_id) VALUES ($1, $2, $3, $4) RETURNING *',
            [content, room_id, sender_id, receiver_id]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to send message' });
    }
});


app.get('/messages/private/:userId', authenticateToken, async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.user.id;

  try {
      const messages = await pool.query(
          `SELECT * FROM messages
           WHERE (sender_id = $1 AND receiver_id = $2)
           OR (sender_id = $2 AND receiver_id = $1)
           ORDER BY created_at ASC`,
          [currentUserId, userId]
      );
      res.json(messages.rows);
  } catch (error) {
      res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  initializeSocketUser(socket);

  socket.on('sendMessage', (message) => {
    console.log('sendMessage event:', message);
    sendMessage(socket, message);
  });

  socket.on('joinRoom', (data) => {
    console.log('joinRoom event:', data);
    joinRoom(socket, data);
  });

  socket.on('leaveRoom', (data) => {
    console.log('leaveRoom event:', data);
    leaveRoom(socket, data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    onDisconnection(socket);
  });

  

});

app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
    });
});

server.listen(4000, () => {
    console.log(`Listening on port ${4000}`);
});
