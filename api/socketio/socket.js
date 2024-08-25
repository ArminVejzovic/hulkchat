const pool = require('../postgresql/config.js');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { rateLimitMiddleware } = require('../redis/config.js'); 

const onlineUsers = new Map();
let messageSeenIntervals = new Map();

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

exports.leaveRoom = async (socket, data) => {
  const user = socket.user;
  const { roomId, receiverId } = data;

  try {
    if (roomId) {
      socket.leave(roomId);
      console.log(`User ${user.username} left room ${roomId}`);

      clearInterval(messageSeenIntervals.get(user.id));
      messageSeenIntervals.delete(user.id);

      socket.broadcast.emit('userStatus', { userId: user.id, status: 'offline' });
      socket.to(roomId).emit('userLeft', { userId: user.id });

    } else if (receiverId) {
      socket.leave(receiverId);
      console.log(`User ${user.username} left private chat with ${receiverId}`);

      clearInterval(messageSeenIntervals.get(user.id));
      messageSeenIntervals.delete(user.id);

      await pool.query(
        'UPDATE messages SET status = $1 WHERE receiver_id = $2 AND sender_id = $3 AND status = $4',
        ['seen', user.id, receiverId, 'delivered']
      );

      socket.broadcast.emit('userStatus', { userId: user.id, status: 'offline' });
      socket.to(receiverId).emit('userLeft', { userId: user.id });
    }

    const onlineUsersList = Array.from(onlineUsers.entries()).map(([id, username]) => ({ id, username }));
    socket.broadcast.emit('onlineUsers', onlineUsersList);

  } catch (error) {
    console.error('Error handling leaveRoom:', error);
  }
};

exports.initializeSocketUser = (socket) => {
  const user = socket.user;
  socket.join(user.id);
  console.log(`User ${user.username} connected with ID ${user.id}`);

  onlineUsers.set(user.id, user.username);
  socket.broadcast.emit('userStatus', { userId: user.id, status: 'online' });

  const onlineUsersList = Array.from(onlineUsers.entries()).map(([id, username]) => ({ id, username }));
  socket.emit('onlineUsers', onlineUsersList);

  const deliveredMessages = Array.from(onlineUsers.keys()).filter(userId => userId !== socket.user.id);
  deliveredMessages.forEach(async receiverId => {
    const messages = await pool.query(
      'SELECT id FROM messages WHERE receiver_id = $1 AND sender_id = $2 AND status = $3',
      [user.id, receiverId, 'sent']
    );

    for (const message of messages.rows) {
      await pool.query(
        'UPDATE messages SET status = $1 WHERE id = $2',
        ['delivered', message.id]
      );
      socket.emit('messageStatusUpdate', { messageId: message.id, status: 'delivered' });
      socket.to(receiverId).emit('messageStatusUpdate', { messageId: message.id, status: 'delivered' });
    }
  });
};

exports.onDisconnection = async (socket) => {
  const user = socket.user;

  onlineUsers.delete(user.id);
  console.log(`User ${user.username} disconnected`);

  clearInterval(messageSeenIntervals.get(user.id));
  messageSeenIntervals.delete(user.id);

  const rooms = await pool.query(
    'SELECT room_id FROM room_members WHERE user_id = $1',
    [user.id]
  );

  for (const room of rooms.rows) {
    const roomId = room.room_id;
    const messages = await pool.query(
      'SELECT id FROM messages WHERE room_id = $1',
      [roomId]
    );

    for (const message of messages.rows) {
      await pool.query(
        'UPDATE messages SET status = $1 WHERE id = $2',
        ['sent', message.id]
      );
    }
  }

  socket.broadcast.emit('userStatus', { userId: user.id, status: 'offline' });

  const onlineUsersList = Array.from(onlineUsers.entries()).map(([id, username]) => ({ id, username }));
  socket.broadcast.emit('onlineUsers', onlineUsersList);
};

exports.sendMessage = async (socket, message) => {
  const user = socket.user;
  const { roomId, content, receiverId } = message;

  try {
    rateLimitMiddleware(socket, roomId, receiverId, async (err) => {
      if (err) {
        console.error('Rate limit exceeded:', err);
        socket.emit('error', { message: err.message });
        return;
      }

      const result = await pool.query(
        'INSERT INTO messages (content, sender_id, receiver_id, status, room_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [content, user.id, receiverId, 'sent', roomId || null]
      );

      const newMessage = result.rows[0];

      socket.emit('newMessage', newMessage);
      if (receiverId) {
        socket.to(receiverId).emit('newMessage', newMessage);

        const receiverSocket = Array.from(socket.server.sockets.sockets.values()).find(s => s.user?.id === receiverId);

        if (receiverSocket && receiverSocket.currentReceiverId === user.id) {
          await pool.query(
            'UPDATE messages SET status = $1 WHERE id = $2',
            ['seen', newMessage.id]
          );
          socket.emit('messageStatusUpdate', { messageId: newMessage.id, status: 'seen' });
          socket.to(receiverId).emit('messageStatusUpdate', { messageId: newMessage.id, status: 'seen' });
        } else if (receiverId && onlineUsers.has(receiverId)) {
          await pool.query(
            'UPDATE messages SET status = $1 WHERE id = $2',
            ['delivered', newMessage.id]
          );
          socket.emit('messageStatusUpdate', { messageId: newMessage.id, status: 'delivered' });
          socket.to(receiverId).emit('messageStatusUpdate', { messageId: newMessage.id, status: 'delivered' });
        }
      } else if (roomId) {
        socket.to(roomId).emit('newMessage', newMessage);
      }
    });
  } catch (error) {
    console.error('Error sending message:', error);
  }
};

exports.joinRoom = async (socket, { receiverId, roomId }) => {
  const user = socket.user;

  try {
    if (receiverId) {
      socket.currentReceiverId = receiverId;
      socket.join(receiverId);
      console.log(`User ${user.username} joined private chat with ${receiverId}`);

      await pool.query(
        'UPDATE messages SET status = $1 WHERE receiver_id = $2 AND sender_id = $3 AND status = $4',
        ['seen', user.id, receiverId, 'delivered']
      );

      const recentMessages = await pool.query(
        'SELECT * FROM messages WHERE (receiver_id = $1 AND sender_id = $2) OR (receiver_id = $2 AND sender_id = $1) ORDER BY created_at DESC LIMIT 50',
        [user.id, receiverId]
      );

      socket.emit('recentMessages', recentMessages.rows);

      recentMessages.rows.forEach((msg) => {
        if (msg.status === 'seen') {
          socket.emit('messageStatusUpdate', { messageId: msg.id, status: 'seen' });
          socket.to(receiverId).emit('messageStatusUpdate', { messageId: msg.id, status: 'seen' });
        }
      });

      const intervalId = setInterval(async () => {
        await pool.query(
          'UPDATE messages SET status = $1 WHERE receiver_id = $2 AND sender_id = $3 AND status = $4',
          ['seen', user.id, receiverId, 'delivered']
        );
        socket.emit('messageStatusUpdate', { status: 'seen' });
        socket.to(receiverId).emit('messageStatusUpdate', { status: 'seen' });
      }, 5000);

      messageSeenIntervals.set(user.id, intervalId);

    } else {
      socket.currentRoomId = roomId;
      socket.join(roomId);
      console.log(`User ${user.username} joined room ${roomId}`);

      const recentMessages = await pool.query(
        'SELECT * FROM messages WHERE room_id = $1 ORDER BY created_at DESC LIMIT 50',
        [roomId]
      );

      socket.emit('recentMessages', recentMessages.rows);
    }
  } catch (error) {
    console.error('Error joining chat:', error);
  }
};
