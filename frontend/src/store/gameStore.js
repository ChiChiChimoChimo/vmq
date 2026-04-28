import { create } from 'zustand';

export const useGameStore = create((set) => ({
  nickname: '',
  roomCode: null,
  room: null,
  round: null,        // { roundNumber, total, youtubeId, startTime, duration }
  roundResult: null,  // { answer, scores, next }
  nextSong: null,     // { youtubeId, startTime } — para precargar entre rondas
  leaderboard: null,
  mySocketId: null,
  phase: 'home',      // home | lobby | playing | roundEnd | gameEnd

  setNickname: (nickname) => set({ nickname }),
  setMySocketId: (id) => set({ mySocketId: id }),

  joinRoom: (code, room) => set({ roomCode: code, room, phase: 'lobby' }),
  updateRoom: (room) => set({ room }),

  startRound: (round) => set({ round, roundResult: null, nextSong: null, phase: 'playing' }),
  endRound: (result) => set({ roundResult: result, nextSong: result.next || null, phase: 'roundEnd' }),
  endGame: (leaderboard) => set({ leaderboard, phase: 'gameEnd' }),

  reset: () => set({
    roomCode: null, room: null, round: null,
    roundResult: null, nextSong: null, leaderboard: null, phase: 'home',
  }),
}));
