import { create } from 'zustand';

export const useGameStore = create((set) => ({
  nickname: '',
  roomCode: null,
  room: null,
  round: null,
  roundResult: null,
  nextSong: null,
  leaderboard: null,
  mySocketId: null,
  phase: 'home',

  setNickname: (nickname) => set({ nickname }),
  setMySocketId: (id) => set({ mySocketId: id }),

  joinRoom: (code, room) => set({ roomCode: code, room, phase: 'lobby' }),
  updateRoom: (room) => set({ room }),

  startRound: (round) => set({ round, roundResult: null, nextSong: null, phase: 'playing' }),

  endRound: (result) => set(s => ({
    roundResult: result,
    nextSong: result.next || null,
    phase: 'roundEnd',
    // Actualizar scores y correctCount en room.players desde los results
    room: s.room ? {
      ...s.room,
      players: s.room.players.map(p => {
        const r = result.results?.find(r => r.nickname === p.nickname);
        return r ? { ...p, score: r.score, correctCount: r.correctCount } : p;
      }),
    } : s.room,
  })),

  endGame: (leaderboard) => set({ leaderboard, phase: 'gameEnd' }),

  reset: () => set({
    roomCode: null, room: null, round: null,
    roundResult: null, nextSong: null, leaderboard: null, phase: 'home',
  }),
}));
