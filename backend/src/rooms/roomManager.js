const rooms = new Map();

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function createRoom(hostSocketId, nickname, settings = {}) {
  const code = generateCode();
  rooms.set(code, {
    code,
    hostSocketId,
    status: 'waiting',
    players: [{ socketId: hostSocketId, nickname, score: 0, hasGuessed: false }],
    settings: { rounds: settings.rounds || 10, guessTime: settings.guessTime || 30 },
    currentRound: 0,
    songs: [],
    roundTimer: null,
  });
  return rooms.get(code);
}

function getRoom(code) {
  return rooms.get(code) || null;
}

function getRoomBySocket(socketId) {
  for (const room of rooms.values()) {
    if (room.players.some(p => p.socketId === socketId)) return room;
  }
  return null;
}

function addPlayer(code, socketId, nickname) {
  const room = rooms.get(code);
  if (!room) return null;
  if (room.players.some(p => p.socketId === socketId)) return room;
  room.players.push({ socketId, nickname, score: 0, hasGuessed: false });
  return room;
}

function removePlayer(socketId) {
  const room = getRoomBySocket(socketId);
  if (!room) return null;
  room.players = room.players.filter(p => p.socketId !== socketId);
  if (room.players.length === 0) {
    if (room.roundTimer) clearTimeout(room.roundTimer);
    rooms.delete(room.code);
    return null;
  }
  if (room.hostSocketId === socketId) {
    room.hostSocketId = room.players[0].socketId;
  }
  return room;
}

function updateSettings(code, settings) {
  const room = rooms.get(code);
  if (!room) return null;
  room.settings = { ...room.settings, ...settings };
  return room;
}

function deleteRoom(code) {
  const room = rooms.get(code);
  if (room?.roundTimer) clearTimeout(room.roundTimer);
  rooms.delete(code);
}

module.exports = { createRoom, getRoom, getRoomBySocket, addPlayer, removePlayer, updateSettings, deleteRoom };
