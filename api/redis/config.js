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

const rateLimitMiddleware = async (socket, roomId, next) => {
  const userId = socket.user.id;
  const key = `message-count:${userId}:${roomId}`;

  try {
    let messageCount = await redisClient.get(key);
    if (messageCount === null) {
      messageCount = 0;
    } else {
      messageCount = parseInt(messageCount, 10);
    }

    if (messageCount >= 5) {
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

    } else {
      messageCount += 1;
      await redisClient.set(key, messageCount, { EX: 60 });
      console.log(`User ${userId} has sent ${messageCount} messages in room ${roomId}`);

      next();
    }
  } catch (error) {
    console.error('Redis error:', error);
    next(error);
  }
};


module.exports = rateLimitMiddleware;
