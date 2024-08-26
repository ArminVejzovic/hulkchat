const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
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
const authRoutes = require('./routes/authRoutes.js');
const chatRoutes = require('./routes/chatRoutes');
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

app.use(authRoutes);
app.use(chatRoutes);

io.use(authenticateSocketUser);

io.on('connection', (socket) => {

  initializeSocketUser(socket);

  socket.on('sendMessage', (message) => {
    sendMessage(socket, message);
  });

  socket.on('joinRoom', (data) => {
    joinRoom(socket, data);
  });

  socket.on('leaveRoom', (data) => {
    leaveRoom(socket, data);
  });

  socket.on('disconnect', () => {
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

server.listen(4000);
