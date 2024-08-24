const pool = require('../postgresql/config.js');
const jwt = require('jsonwebtoken');
const rateLimitMiddleware = require('../redis/config.js')
require('dotenv').config();

exports.authenticateSocketUser = (socket, next) => {
  const token = socket.handshake.query.token;
  if (!token) {
    console.log('Authentication error: No token provided');
    return next(new Error('Authentication error'));
  }

  jwt.verify(token, process.env.SECURE_KEY, (err, user) => {
    if (err) {
      console.log('Authentication error: Invalid token');
      return next(new Error('Authentication error'));
    }
    socket.user = user;
    console.log(`User ${user.username} authenticated`);
    next();
  });
};

exports.leaveRoom = (socket, data) => {
  const { roomId } = data;
  socket.leave(roomId);
  console.log(`User ${socket.user.username} left room ${roomId}`);
};

exports.initializeSocketUser = async (socket) => {
  const user = socket.user;
  socket.join(user.id); 
  console.log(`User ${user.username} connected with ID ${user.id}`);

};

exports.onDisconnection = (socket) => {
  const user = socket.user;
  console.log(`User ${user.username} disconnected`);
};

exports.sendMessage = async (socket, message) => {
  const user = socket.user;
  const { roomId, content, receiverId } = message;

  console.log(`User ${user.username} is sending a message to room ${roomId}`);

  rateLimitMiddleware(socket, roomId, async (err) => {
    if (err) {
      console.error('Rate limit exceeded:', err);
      socket.emit('error', { message: err.message });
      return;
    }

    try {
      const result = await pool.query(
        'INSERT INTO messages (content, room_id, sender_id, receiver_id) VALUES ($1, $2, $3, $4) RETURNING *',
        [content, roomId, user.id, receiverId]
      );
      
      const newMessage = result.rows[0];
      
      socket.emit('newMessage', newMessage);
      socket.to(roomId).emit('newMessage', newMessage);

    } catch (error) {
      console.error('Error sending message:', error);
    }
  });
};

exports.joinRoom = async (socket, { roomId }) => {
  const user = socket.user;
  
  try {
    await pool.query(
      'INSERT INTO room_members (user_id, room_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [user.id, roomId]
    );

    socket.currentRoomId = roomId;

    socket.join(roomId);
    console.log(`User ${user.username} joined room ${roomId}`);

    const recentMessages = await pool.query(
      'SELECT * FROM messages WHERE room_id = $1 ORDER BY created_at DESC LIMIT 50',
      [roomId]
    );

    socket.emit('recentMessages', recentMessages.rows);
  } catch (error) {
    console.error('Error joining room:', error);
  }
};
