// socket.js
const { Server } = require('socket.io');
const redis = require('redis');
const connectedUsers = require('./connectedUsers');
const { sendMessage } = require('./producer');

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;

// Redis clients
const redisPublisher = redis.createClient({ url: `redis://${REDIS_HOST}:${REDIS_PORT}` });
const redisSubscriber = redis.createClient({ url: `redis://${REDIS_HOST}:${REDIS_PORT}` });

 

let io;

// 🛠️ Handle Redis errors & reconnects
function handleRedisEvents(client, name) {
  client.on('error', (err) => {
    console.error(`[Redis ${name}] Error:`, err.message);
  });
  client.on('connect', () => {
    console.log(`[Redis ${name}] Connected`);
  });
  client.on('reconnecting', () => {
    console.warn(`[Redis ${name}] Reconnecting...`);
  });
  client.on('end', () => {
    console.warn(`[Redis ${name}] Connection closed`);
  });
}

handleRedisEvents(redisPublisher, 'Publisher');
handleRedisEvents(redisSubscriber, 'Subscriber');

(async () => {
  await redisPublisher.connect();
  await redisSubscriber.connect();
})();

// Subscribe and deliver Redis-published messages to connected WebSocket clients
redisSubscriber.on('message', (channel, message) => {
  const userId = channel.split(':')[1];
  const socketId = connectedUsers.get(userId);
  if (socketId) {
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      socket.emit('message', JSON.parse(message));
    }
  }
});

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', async (socket) => {
    const { userId } = socket.handshake.query;

    if (userId) {
      connectedUsers.set(userId, socket.id);
      console.log(`User ${userId} connected with socket id ${socket.id}`);

      // Subscribe to Redis channel for this user
      await redisSubscriber.subscribe(`user:${userId}`);
    } else {
      console.warn('User connected without userId');
    }

  // 📩 Handle incoming WebSocket message
  socket.on('message', async (data) => {
    console.log(`Message received from ${userId}:`, data);
    const playload = {
      ...data,
      timestamp: new Date().toISOString(),
      userId
    };
     await sendMessage(playload);
    // console.log("Message sent to SQS", result);
    
  });



    socket.on('disconnect', async () => {
      connectedUsers.delete(userId);
      console.log(`User ${userId} disconnected.`);

      if (userId) {
        await redisSubscriber.unsubscribe(`user:${userId}`);
      }
    });
  });
};

const getIO = () => {
    if (!io) throw new Error("Socket.io not initialized!");
    return io;
  };

module.exports = { initSocket, getIO: getIO };
