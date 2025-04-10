const { Server } = require('socket.io');
const redis = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const { sendMessage } = require('./producer');

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;

let io;

const initSocket = async (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  const pubClient = redis.createClient({ url: `redis://${REDIS_HOST}:${REDIS_PORT}` });
  const subClient = pubClient.duplicate();


    // Attach event handlers for Redis clients
    pubClient.on('connect', () => {
      console.log('🔌 Redis pubClient connecting...');
    });
  
    pubClient.on('ready', () => {
      console.log('✅ Redis pubClient connected and ready');
    });
  
    pubClient.on('error', (err) => {
      console.error('❗ Redis pubClient error:', err);
    });
  
    pubClient.on('reconnecting', () => {
      console.warn('♻️ Redis pubClient reconnecting...');
    });
  
    subClient.on('connect', () => {
      console.log('🔌 Redis subClient connecting...');
    });
  
    subClient.on('ready', () => {
      console.log('✅ Redis subClient connected and ready');
    });
  
    subClient.on('error', (err) => {
      console.error('❗ Redis subClient error:', err);
    });
  
    subClient.on('reconnecting', () => {
      console.warn('♻️ Redis subClient reconnecting...');
    });
    

  await pubClient.connect();
  await subClient.connect();
  console.log(`🔗 Redis adapter connected at ${REDIS_HOST}:${REDIS_PORT}`);

  io.adapter(createAdapter(pubClient, subClient));

  io.on('connection', (socket) => {
    const { userId } = socket.handshake.query;

    if (userId) {
      console.log(`✅ User ${userId} connected on socket ${socket.id}`);
      socket.join(`user:${userId}`);
    } else {
      console.warn('⚠️ WebSocket connected without userId');
    }

    socket.on('message', async (data) => {
      const payload = {
        ...data,
        timestamp: new Date().toISOString(),
        userId,
      };
      console.log(`📨 Message from ${userId}:`, payload);
      await sendMessage(payload);
    });

    socket.on('disconnect', () => {
      console.log(`❌ User ${userId} disconnected`);
    });
  });
};

const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized!");
  return io;
};

module.exports = { initSocket, getIO };
