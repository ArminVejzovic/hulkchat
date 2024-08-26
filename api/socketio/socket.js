const pool = require('../postgresql/config.js');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { rateLimitMiddleware } = require('../redis/config.js');

const onlineUsers = new Map();
let messageSeenIntervals = new Map();

exports.authenticateSocketUser = (socket, next) => {
  const token = socket.handshake.query.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }

  jwt.verify(token, process.env.SECURE_KEY, (err, user) => {
    if (err) {
      return next(new Error('Authentication error'));
    }
    socket.user = user;
    next();
  });
};

exports.leaveRoom = async (socket, data) => {
  const user = socket.user;
  const { roomId, receiverId } = data;

  if (roomId) {
    socket.leave(roomId);
    clearInterval(messageSeenIntervals.get(user.id));
    messageSeenIntervals.delete(user.id);

    socket.to(roomId).emit('userLeft', { userId: user.id });

  } else if (receiverId) {
    socket.leave(receiverId);

    clearInterval(messageSeenIntervals.get(user.id));
    messageSeenIntervals.delete(user.id);

    await pool.query(
      'UPDATE messages SET status = $1 WHERE receiver_id = $2 AND sender_id = $3 AND status = $4',
      ['delivered', user.id, receiverId, 'sent']
    );
    socket.emit('messageStatusUpdate', { status: 'delivered' });
    socket.to(receiverId).emit('messageStatusUpdate', { status: 'delivered' });
  }

}


exports.initializeSocketUser = (socket) => {
  const user = socket.user;
  socket.join(user.id);

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

  rateLimitMiddleware(socket, roomId, receiverId, async (err) => {
    if (err) {
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
      const receiverSocket = Array.from(socket.server.sockets.sockets.values()).find(s => s.user?.id === receiverId);

      if (receiverSocket) {
        if (messageSeenIntervals.has(receiverId) && receiverSocket.currentReceiverId === user.id) {
          await pool.query(
            'UPDATE messages SET status = $1 WHERE id = $2',
            ['seen', newMessage.id]
          );
          socket.emit('messageStatusUpdate', { messageId: newMessage.id, status: 'seen' });
          receiverSocket.emit('messageStatusUpdate', { messageId: newMessage.id, status: 'seen' });
        } else {
          await pool.query(
            'UPDATE messages SET status = $1 WHERE id = $2',
            ['delivered', newMessage.id]
          );
          socket.emit('messageStatusUpdate', { messageId: newMessage.id, status: 'delivered' });
          receiverSocket.emit('messageStatusUpdate', { messageId: newMessage.id, status: 'delivered' });
        }
        receiverSocket.emit('newMessage', newMessage);
      } else {
        await pool.query(
          'UPDATE messages SET status = $1 WHERE id = $2',
          ['sent', newMessage.id]
        );
        socket.emit('messageStatusUpdate', { messageId: newMessage.id, status: 'sent' });
      }
    } else if (roomId) {
      socket.to(roomId).emit('newMessage', newMessage);
    }
  });
}



exports.joinRoom = async (socket, { receiverId, roomId }) => {
  const user = socket.user;

  if (receiverId) {
    socket.currentReceiverId = receiverId;
    socket.join(receiverId);

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
      if (socket.rooms.has(receiverId)) {
        await pool.query(
          'UPDATE messages SET status = $1 WHERE receiver_id = $2 AND sender_id = $3 AND status = $4',
          ['seen', user.id, receiverId, 'delivered']
        );
        socket.emit('messageStatusUpdate', { status: 'seen' });
        socket.to(receiverId).emit('messageStatusUpdate', { status: 'seen' });
      }
    }, 5000);

    messageSeenIntervals.set(user.id, intervalId);

  } else {
    socket.currentRoomId = roomId;
    socket.join(roomId);

    const recentMessages = await pool.query(
      'SELECT * FROM messages WHERE room_id = $1 ORDER BY created_at DESC LIMIT 50',
      [roomId]
    );

    socket.emit('recentMessages', recentMessages.rows);
  }
}