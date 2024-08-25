const redis = require('redis');
const { createClient } = redis;
require('dotenv').config();

const redisClient = createClient({
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  }
});

redisClient.on("ready", function() {  
  console.log("Connected to Redis server successfully");  
});

redisClient.on('error', (err) => {
  console.error('Redis error:', err);
});

redisClient.connect().catch(console.error);

const rateLimitedRooms = {};
const rateLimitedPrivateChats = {};

const rateLimitMiddleware = async (socket, roomId, receiverId, next) => {
  const userId = socket.user.id;
  const key = receiverId 
    ? `private-message-count:${userId}:${receiverId}` 
    : `message-count:${userId}:${roomId}`;

  try {
    let messageCount = await redisClient.get(key);
    if (messageCount === null) {
      messageCount = 0;
    } else {
      messageCount = parseInt(messageCount, 10);
    }

    if (messageCount >= 5) {
      if (receiverId) {
        if (!rateLimitedPrivateChats[userId]) {
          rateLimitedPrivateChats[userId] = new Set();
        }
        rateLimitedPrivateChats[userId].add(receiverId);
        socket.emit('rateLimitUpdated', Array.from(rateLimitedPrivateChats[userId]));

        console.log(`User ${userId} is blocked in private chat with user ${receiverId} for 60 seconds.`);

        setTimeout(async () => {
          await redisClient.set(key, 0);
          rateLimitedPrivateChats[userId].delete(receiverId);

          socket.emit('rateLimitUpdated', Array.from(rateLimitedPrivateChats[userId]));

          console.log(`Rate limit reset for user ${userId} in private chat with user ${receiverId}`);
        }, 60000);
      } else {
        if (!rateLimitedRooms[userId]) {
          rateLimitedRooms[userId] = new Set();
        }
        rateLimitedRooms[userId].add(roomId);
        socket.emit('rateLimitUpdated', Array.from(rateLimitedRooms[userId]));

        console.log(`User ${userId} is blocked in room ${roomId} for 60 seconds.`);

        setTimeout(async () => {
          await redisClient.set(key, 0);
          rateLimitedRooms[userId].delete(roomId);

          socket.emit('rateLimitUpdated', Array.from(rateLimitedRooms[userId]));

          console.log(`Rate limit reset for user ${userId} in room ${roomId}`);
        }, 60000);
      }
    } else {
      messageCount += 1;
      await redisClient.set(key, messageCount, { EX: 60 });
      console.log(`User ${userId} has sent ${messageCount} messages in ${receiverId ? `private chat with ${receiverId}` : `room ${roomId}`}`);

      next();
    }
  } catch (error) {
    console.error('Redis error:', error);
    next();
  }
};


module.exports = { rateLimitMiddleware };
