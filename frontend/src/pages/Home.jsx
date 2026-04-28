import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { useSocket } from '../hooks/useSocket';

export default function Home() {
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState(null); // 'create' | 'join'
  const [error, setError] = useState('');
  const socket = useSocket();
  const setStoredNickname = useGameStore(s => s.setNickname);
  const roomCode = useGameStore(s => s.roomCode);
  const navigate = useNavigate();

  // Navegar al lobby cuando se une/crea sala
  if (roomCode) navigate(`/lobby/${roomCode}`);

  function handleCreate() {
    if (!nickname.trim()) return setError('Escribe un nickname');
    setStoredNickname(nickname.trim());
    socket.emit('room:create', { nickname: nickname.trim() });
  }

  function handleJoin() {
    if (!nickname.trim()) return setError('Escribe un nickname');
    if (!code.trim()) return setError('Escribe el código de sala');
    setStoredNickname(nickname.trim());
    socket.emit('room:join', { nickname: nickname.trim(), code: code.trim().toUpperCase() });
  }

  socket.on('error', ({ message }) => setError(message));

  return (
    <div className="home-page">
      <div className="logo">
        <h1>VMQ</h1>
        <p>Videogame Music Quiz</p>
      </div>

      <div className="card">
        <label>Tu nickname</label>
        <input
          value={nickname}
          onChange={e => { setNickname(e.target.value); setError(''); }}
          placeholder="Ej: MarioBros64"
          maxLength={20}
          onKeyDown={e => e.key === 'Enter' && mode === 'join' && handleJoin()}
        />

        {!mode && (
          <div className="btn-group">
            <button className="btn-primary" onClick={() => setMode('create')}>Crear sala</button>
            <button className="btn-secondary" onClick={() => setMode('join')}>Unirse a sala</button>
          </div>
        )}

        {mode === 'create' && (
          <>
            <button className="btn-primary" onClick={handleCreate}>Crear sala</button>
            <button className="btn-ghost" onClick={() => setMode(null)}>Volver</button>
          </>
        )}

        {mode === 'join' && (
          <>
            <label>Código de sala</label>
            <input
              value={code}
              onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }}
              placeholder="Ej: KRMZ"
              maxLength={4}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
            />
            <button className="btn-primary" onClick={handleJoin}>Unirse</button>
            <button className="btn-ghost" onClick={() => setMode(null)}>Volver</button>
          </>
        )}

        {error && <p className="error">{error}</p>}
      </div>

      <a href="/contribute" className="contribute-link">¿Quieres agregar canciones? Contribuye aquí</a>
    </div>
  );
}
