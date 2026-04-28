import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useGameStore } from '../store/gameStore';

let socketInstance = null;

export function getSocket() {
  if (!socketInstance) {
    socketInstance = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001', {
      autoConnect: false,
    });
  }
  return socketInstance;
}

export function useSocket() {
  const { setMySocketId, joinRoom, updateRoom, startRound, endRound, endGame } = useGameStore();
  const registered = useRef(false);

  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) socket.connect();

    if (registered.current) return;
    registered.current = true;

    socket.on('connect', () => setMySocketId(socket.id));

    socket.on('room:created', ({ code, room }) => joinRoom(code, room));
    socket.on('room:joined', ({ code, room }) => joinRoom(code, room));
    socket.on('room:updated', (room) => updateRoom(room));

    socket.on('round:start', (data) => startRound(data));
    socket.on('round:end', (data) => endRound(data));
    socket.on('game:end', ({ leaderboard }) => endGame(leaderboard));

    socket.on('guess:correct', ({ scores }) => {
      useGameStore.setState(s => ({
        room: s.room ? { ...s.room, players: s.room.players.map(p => {
          const updated = scores.find(sc => sc.nickname === p.nickname);
          return updated ? { ...p, score: updated.score } : p;
        })} : s.room,
      }));
    });

    return () => {};
  }, []);

  return getSocket();
}
