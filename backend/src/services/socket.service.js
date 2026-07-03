let io;

function initSocket(server) {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Cliente conectado: ${socket.id}`);

    // Permite que navegadores entrem na sala da academia (via ID ou Slug)
    socket.on('join_gym', (roomName) => {
      socket.join(`gym:${roomName}`);
      console.log(`[Socket] Cliente ${socket.id} entrou na sala: gym:${roomName}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Cliente desconectado: ${socket.id}`);
    });
  });

  return io;
}

function getIo() {
  if (!io) {
    throw new Error('Socket.io não foi inicializado.');
  }
  return io;
}

module.exports = { initSocket, getIo };
