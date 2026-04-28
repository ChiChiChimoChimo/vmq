const { getDb } = require('../firebase-admin');

function normalize(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

function isCorrectGame(guess, song) {
  const targets = [song.gameTitle, ...(song.aliases || [])].map(normalize);
  return targets.includes(normalize(guess));
}

function isCorrectSong(guess, song) {
  return normalize(guess) === normalize(song.songTitle);
}

function calcScore(timeRemaining, duration) {
  const ratio = Math.max(0, timeRemaining / duration);
  return Math.round(100 + 900 * ratio);
}

function calcSongBonus(timeRemaining, duration) {
  const ratio = Math.max(0, timeRemaining / duration);
  return Math.round(50 + 200 * ratio);
}

async function fetchRandomSongs(count) {
  const db = getDb();
  const snap = await db.collection('songs').where('status', '==', 'approved').get();
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, Math.min(count, all.length));
}

function startRound(io, room) {
  const song = room.songs[room.currentRound];
  room.players.forEach(p => { p.hasGuessed = false; p.songGuessed = false; });
  room._roundStartedAt = Date.now();

  const duration = room.settings.guessTime;

  io.to(room.code).emit('round:start', {
    roundNumber: room.currentRound + 1,
    total: room.songs.length,
    youtubeId: song.youtubeId,
    duration,
  });

  room.roundTimer = setTimeout(() => endRound(io, room), duration * 1000);
}

function endRound(io, room) {
  if (room.roundTimer) { clearTimeout(room.roundTimer); room.roundTimer = null; }

  const song = room.songs[room.currentRound];
  const scores = room.players.map(p => ({ nickname: p.nickname, score: p.score }));

  io.to(room.code).emit('round:end', {
    answer: { gameTitle: song.gameTitle, songTitle: song.songTitle, youtubeId: song.youtubeId },
    scores,
  });

  room.currentRound++;

  if (room.currentRound >= room.songs.length) {
    setTimeout(() => endGame(io, room), 5000);
  } else {
    setTimeout(() => startRound(io, room), 5000);
  }
}

function endGame(io, room) {
  room.status = 'finished';
  const leaderboard = [...room.players]
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({ rank: i + 1, nickname: p.nickname, score: p.score }));

  io.to(room.code).emit('game:end', { leaderboard });
}

function handleGameGuess(io, room, socketId, guess) {
  const player = room.players.find(p => p.socketId === socketId);
  if (!player || player.hasGuessed || room.status !== 'playing') return false;

  const song = room.songs[room.currentRound];
  if (!isCorrectGame(guess, song)) return false;

  player.hasGuessed = true;
  const elapsed = (Date.now() - room._roundStartedAt) / 1000;
  const timeRemaining = Math.max(0, room.settings.guessTime - elapsed);
  player.score += calcScore(timeRemaining, room.settings.guessTime);

  io.to(room.code).emit('guess:correct', {
    nickname: player.nickname,
    score: player.score,
    scores: room.players.map(p => ({ nickname: p.nickname, score: p.score })),
  });

  io.to(socketId).emit('guess:game:correct', { gameTitle: song.gameTitle });

  if (room.players.every(p => p.hasGuessed)) {
    endRound(io, room);
  }

  return true;
}

function handleSongGuess(io, room, socketId, guess) {
  const player = room.players.find(p => p.socketId === socketId);
  if (!player || !player.hasGuessed || player.songGuessed || room.status !== 'playing') return false;

  const song = room.songs[room.currentRound];
  if (!isCorrectSong(guess, song)) return false;

  player.songGuessed = true;
  const elapsed = (Date.now() - room._roundStartedAt) / 1000;
  const timeRemaining = Math.max(0, room.settings.guessTime - elapsed);
  const bonus = calcSongBonus(timeRemaining, room.settings.guessTime);
  player.score += bonus;

  io.to(room.code).emit('guess:correct', {
    nickname: player.nickname,
    score: player.score,
    scores: room.players.map(p => ({ nickname: p.nickname, score: p.score })),
  });

  io.to(socketId).emit('guess:song:correct', { songTitle: song.songTitle, bonus });

  return true;
}

module.exports = { fetchRandomSongs, startRound, endRound, endGame, handleGameGuess, handleSongGuess };
