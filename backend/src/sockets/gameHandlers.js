const rm = require('../rooms/roomManager');
const { fetchRandomSongs, startRound, handleGuess } = require('../rooms/gameEngine');

module.exports = function registerHandlers(io, socket) {
  socket.on('room:create', ({ nickname, settings } = {}) => {
    if (!nickname?.trim()) return socket.emit('error', { message: 'Nickname requerido' });
    const room = rm.createRoom(socket.id, nickname.trim(), settings);
    socket.join(room.code);
    socket.emit('room:created', { code: room.code, room: safeRoom(room) });
    io.to(room.code).emit('room:updated', safeRoom(room));
  });

  socket.on('room:join', ({ code, nickname } = {}) => {
    if (!nickname?.trim()) return socket.emit('error', { message: 'Nickname requerido' });
    const upper = code?.toUpperCase().trim();
    const room = rm.getRoom(upper);
    if (!room) return socket.emit('error', { message: 'Sala no encontrada' });
    if (room.status !== 'waiting') return socket.emit('error', { message: 'La partida ya comenzó' });
    rm.addPlayer(upper, socket.id, nickname.trim());
    socket.join(upper);
    socket.emit('room:joined', { code: upper, room: safeRoom(room) });
    io.to(upper).emit('room:updated', safeRoom(room));
    socket.to(upper).emit('player:joined', { nickname: nickname.trim() });
  });

  socket.on('room:settings', ({ code, settings } = {}) => {
    const room = rm.getRoom(code);
    if (!room || room.hostSocketId !== socket.id) return;
    rm.updateSettings(code, settings);
    io.to(code).emit('room:updated', safeRoom(room));
  });

  socket.on('game:start', async ({ code } = {}) => {
    const room = rm.getRoom(code);
    if (!room || room.hostSocketId !== socket.id) return socket.emit('error', { message: 'Solo el host puede iniciar' });
    if (room.status !== 'waiting') return;
    if (room.players.length < 1) return socket.emit('error', { message: 'Se necesita al menos 1 jugador' });

    try {
      const songs = await fetchRandomSongs(room.settings.rounds);
      if (songs.length === 0) return socket.emit('error', { message: 'No hay canciones aprobadas en la base de datos' });
      room.songs = songs;
      room.currentRound = 0;
      room.status = 'playing';
      io.to(code).emit('game:starting', { totalRounds: songs.length });
      setTimeout(() => startRound(io, room), 3000);
    } catch (err) {
      console.error('game:start error', err);
      socket.emit('error', { message: 'Error al cargar canciones' });
    }
  });

  socket.on('guess:submit', ({ game, song } = {}) => {
    const room = rm.getRoomBySocket(socket.id);
    if (!room || room.status !== 'playing') return;
    handleGuess(io, room, socket.id, { game: game || '', song: song || '' });
  });

  socket.on('disconnect', () => {
    const room = rm.getRoomBySocket(socket.id);
    if (!room) return;
    const player = room.players.find(p => p.socketId === socket.id);
    const nickname = player?.nickname;
    const updated = rm.removePlayer(socket.id);
    if (updated) {
      if (nickname) socket.to(updated.code).emit('player:left', { nickname });
      io.to(updated.code).emit('room:updated', safeRoom(updated));
    }
  });
};

function safeRoom(room) {
  return {
    code: room.code,
    status: room.status,
    hostSocketId: room.hostSocketId,
    players: room.players.map(({ socketId, nickname, score, hasGuessed }) => ({ socketId, nickname, score, hasGuessed })),
    settings: room.settings,
    currentRound: room.currentRound,
    totalRounds: room.songs?.length ?? 0,
  };
}
