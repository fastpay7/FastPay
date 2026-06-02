// Socket.IO room & event management
const connectedUsers = new Map(); // userId → socketId

function initSocket(io) {
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // User registers with their userId so we can push targeted events
    socket.on('register', (userId) => {
      connectedUsers.set(userId, socket.id);
      socket.join(`user:${userId}`);
      console.log(`👤 User ${userId} registered on socket ${socket.id}`);
    });

    socket.on('disconnect', () => {
      for (const [uid, sid] of connectedUsers.entries()) {
        if (sid === socket.id) { connectedUsers.delete(uid); break; }
      }
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });
}

// Emit to a specific user
function emitToUser(io, userId, event, data) {
  io.to(`user:${userId}`).emit(event, data);
}

module.exports = { initSocket, emitToUser, connectedUsers };
