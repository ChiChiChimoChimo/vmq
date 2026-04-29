import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { useSocket } from '../hooks/useSocket';
import PlayerList from '../components/PlayerList';

export default function Lobby() {
  const { code } = useParams();
  const socket = useSocket();
  const { room, mySocketId, nickname, phase } = useGameStore();
  const navigate = useNavigate();
  const [rounds, setRounds] = useState(10);
  const [guessTime, setGuessTime] = useState(30);
  const [starting, setStarting] = useState(false);
  const [maxRounds, setMaxRounds] = useState(20);

  const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

  useEffect(() => {
    fetch(`${BACKEND}/api/songs/count`)
      .then(r => r.json())
      .then(d => {
        if (d.count) {
          setMaxRounds(d.count);
          setRounds(r => Math.min(r, d.count));
        }
      })
      .catch(() => {});
  }, []);

  const isHost = room?.hostSocketId === mySocketId;

  useEffect(() => {
    if (phase === 'playing') navigate(`/game/${code}`);
    if (phase === 'gameEnd') navigate(`/results/${code}`);
  }, [phase]);

  useEffect(() => {
    const onStarting = () => { setStarting(true); navigate(`/game/${code}`); };
    socket.on('game:starting', onStarting);
    return () => socket.off('game:starting', onStarting);
  }, []);

  function handleStart() {
    socket.emit('game:start', { code });
  }

  function handleSettings() {
    socket.emit('room:settings', { code, settings: { rounds, guessTime } });
  }

  if (!room) return <div className="loading">Conectando...</div>;

  return (
    <div className="lobby-page">
      <div className="lobby-header">
        <h2>Sala de espera</h2>
        <div className="room-code">
          Código: <strong>{code}</strong>
          <button className="btn-copy" onClick={() => navigator.clipboard.writeText(code)} title="Copiar">📋</button>
        </div>
      </div>

      <PlayerList players={room.players} hostSocketId={room.hostSocketId} mySocketId={mySocketId} />

      {isHost && (
        <div className="settings-panel">
          <h3>Configuración</h3>
          <label>Rondas: {rounds} <span style={{color:'var(--text-muted)',fontSize:'.8rem'}}>/ {maxRounds} disponibles</span></label>
          <input type="range" min={3} max={maxRounds} value={rounds} onChange={e => setRounds(+e.target.value)} />
          <label>Tiempo por ronda: {guessTime}s</label>
          <input type="range" min={15} max={60} value={guessTime} onChange={e => setGuessTime(+e.target.value)} />
          <button className="btn-secondary" onClick={handleSettings}>Guardar ajustes</button>
        </div>
      )}

      {isHost && (
        <button
          className="btn-start"
          onClick={handleStart}
          disabled={starting}
        >
          {starting ? 'Iniciando...' : '¡Comenzar juego!'}
        </button>
      )}

      {!isHost && <p className="waiting-msg">Esperando a que el host inicie la partida...</p>}
    </div>
  );
}
