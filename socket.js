// socket.js
const { Server } = require('socket.io');
const connectedUsers = require('./connectedUsers');
const { sendMessage } = require('./producer');

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    const { userId } = socket.handshake.query;

    if (userId) {
      connectedUsers.set(userId, socket.id);
      console.log(`User ${userId} connected with socket id ${socket.id}`);
    } else {
      console.warn('User connected without userId');
    }

    // 👇 Listen for incoming messages from clients
  socket.on('message', async (data) => {
    console.log(`Message received from ${userId}:`, data);
    const playload = {
      ...data,
      timestamp: new Date().toISOString(),
      userId
    };
    const result = await sendMessage(playload);
    console.log("Message sent to SQS", result);
    
  });



    socket.on('disconnect', () => {
      connectedUsers.delete(userId);
      console.log(`User ${userId} disconnected.`);
    });
  });
};

const getIO = () => {
    if (!io) throw new Error("Socket.io not initialized!");
    return io;
  };

module.exports = { initSocket, getIO: getIO };
