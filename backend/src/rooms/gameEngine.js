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
  room.players.forEach(p => {
    p.hasGuessed = false;
    p.pendingGuess = null;
    p.guessElapsed = null;
  });
  room._roundStartedAt = Date.now();

  io.to(room.code).emit('round:start', {
    roundNumber: room.currentRound + 1,
    total: room.songs.length,
    youtubeId: song.youtubeId,
    startTime: song.startTime || 0,
    duration: room.settings.guessTime,
  });

  room.roundTimer = setTimeout(() => endRound(io, room), room.settings.guessTime * 1000);
}

function endRound(io, room) {
  if (room.roundTimer) { clearTimeout(room.roundTimer); room.roundTimer = null; }

  const song = room.songs[room.currentRound];
  const duration = room.settings.guessTime;

  const results = room.players.map(player => {
    const guess = player.pendingGuess;
    let gameCorrect = false;
    let songCorrect = false;
    let roundScore = 0;

    if (guess && guess.game) {
      const timeRemaining = Math.max(0, duration - (player.guessElapsed || duration));
      gameCorrect = isCorrectGame(guess.game, song);
      if (gameCorrect) {
        roundScore += calcScore(timeRemaining, duration);
        if (guess.song && isCorrectSong(guess.song, song)) {
          songCorrect = true;
          roundScore += calcSongBonus(timeRemaining, duration);
        }
        player.correctCount = (player.correctCount || 0) + 1;
      }
    }

    player.score += roundScore;

    return {
      nickname: player.nickname,
      score: player.score,
      correctCount: player.correctCount || 0,
      correct: gameCorrect,
      songCorrect,
      roundScore,
      guess: guess ? { game: guess.game || '', song: guess.song || '' } : null,
    };
  });

  const nextSong = room.songs[room.currentRound + 1] || null;

  io.to(room.code).emit('round:end', {
    answer: { gameTitle: song.gameTitle, songTitle: song.songTitle },
    results,
    next: nextSong ? { youtubeId: nextSong.youtubeId, startTime: nextSong.startTime || 0 } : null,
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
    .map((p, i) => ({ rank: i + 1, nickname: p.nickname, score: p.score, correctCount: p.correctCount || 0 }));

  io.to(room.code).emit('game:end', { leaderboard });
}

function handleGuess(io, room, socketId, { game, song }) {
  const player = room.players.find(p => p.socketId === socketId);
  if (!player || room.status !== 'playing') return;

  player.hasGuessed = true;
  player.pendingGuess = { game: game || '', song: song || '' };
  player.guessElapsed = (Date.now() - room._roundStartedAt) / 1000;
}

module.exports = { fetchRandomSongs, startRound, endRound, endGame, handleGuess };
