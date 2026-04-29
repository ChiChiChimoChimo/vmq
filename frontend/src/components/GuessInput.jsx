import { useState, useEffect, useRef, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

function normalize(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

function matchesSearch(text, query) {
  return text.toLowerCase().includes(query.toLowerCase());
}

export default function GuessInput({ duration, onGuess }) {
  const [songs, setSongs] = useState([]);
  const [gameInput, setGameInput] = useState('');
  const [songInput, setSongInput] = useState('');
  const [songPhase, setSongPhase] = useState(false);
  const [gameSuggestions, setGameSuggestions] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(duration);
  const gameInputRef = useRef(null);
  const phase = useGameStore(s => s.phase);

  useEffect(() => {
    fetch(`${BACKEND}/api/songs`)
      .then(r => r.json())
      .then(data => setSongs(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setGameInput('');
    setSongInput('');
    setSongPhase(false);
    setGameSuggestions([]);
    setSubmitted(false);
    gameInputRef.current?.focus();

    const startedAt = Date.now();
    let rafId;

    function tick() {
      const remaining = Math.max(0, duration - (Date.now() - startedAt) / 1000);
      setTimeLeft(remaining);
      if (remaining > 0) rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [duration]);

  useEffect(() => {
    if (phase === 'roundEnd') {
      setSubmitted(true);
      setGameSuggestions([]);
    }
  }, [phase]);

  // Canciones del juego seleccionado para el <select>
  const matchedGameSongs = useMemo(() => {
    if (!gameInput.trim()) return [];
    const key = normalize(gameInput);
    return songs.filter(s =>
      normalize(s.gameTitle) === key ||
      (s.aliases || []).some(a => normalize(a) === key)
    );
  }, [songs, gameInput]);

  // Mostrar fase canción solo si hay múltiples canciones del juego
  useEffect(() => {
    setSongPhase(matchedGameSongs.length > 1);
    if (matchedGameSongs.length <= 1) setSongInput('');
  }, [matchedGameSongs.length]);

  function handleGameChange(e) {
    const val = e.target.value;
    setGameInput(val);
    if (!val.trim()) { setGameSuggestions([]); return; }

    const seen = new Set();
    const matches = [];
    for (const song of songs) {
      if (seen.has(song.gameTitle)) continue;
      const targets = [song.gameTitle, ...(song.aliases || [])];
      if (targets.some(t => matchesSearch(t, val))) {
        seen.add(song.gameTitle);
        matches.push(song.gameTitle);
      }
    }
    setGameSuggestions(matches.slice(0, 8));
  }

  function selectGame(gameTitle) {
    setGameInput(gameTitle);
    setGameSuggestions([]);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!gameInput.trim() || submitted || timeLeft <= 0) return;
    setSubmitted(true);
    setGameSuggestions([]);
    onGuess({ game: gameInput.trim(), song: songInput || undefined });
  }

  const pct = (timeLeft / duration) * 100;
  const timerColor = pct > 50 ? '#4ade80' : pct > 25 ? '#facc15' : '#f87171';
  const disabled = submitted || timeLeft <= 0;

  return (
    <div className="guess-input-wrapper">
      <div className="timer-bar" style={{ width: `${pct}%`, background: timerColor }} />
      <span className="timer-label">{Math.ceil(timeLeft)}s</span>

      <form onSubmit={handleSubmit} autoComplete="off">
        <div className="autocomplete-wrapper">
          <input
            ref={gameInputRef}
            value={gameInput}
            onChange={handleGameChange}
            onBlur={() => setTimeout(() => setGameSuggestions([]), 150)}
            placeholder="¿De qué juego es esta canción?"
            disabled={disabled}
            autoComplete="off"
            className={submitted && gameInput ? 'input-submitted' : ''}
          />
          {gameSuggestions.length > 0 && (
            <ul className="autocomplete-dropdown">
              {gameSuggestions.map(g => (
                <li key={g} onMouseDown={() => selectGame(g)}>{g}</li>
              ))}
            </ul>
          )}
        </div>

        {songPhase && (
          <select
            value={songInput}
            onChange={e => setSongInput(e.target.value)}
            disabled={disabled}
            className="song-select"
          >
            <option value="">— ¿Cuál canción? —</option>
            {matchedGameSongs.map(s => (
              <option key={s.id} value={s.songTitle}>{s.songTitle}</option>
            ))}
          </select>
        )}

        <button type="submit" disabled={disabled || !gameInput.trim()}>
          {submitted ? '✓ Enviado' : 'Adivinar'}
        </button>

        {submitted && timeLeft > 0 && (
          <button
            type="button"
            className="btn-undo"
            onClick={() => {
              setSubmitted(false);
              setGameInput('');
              setSongInput('');
              setSongPhase(false);
              setTimeout(() => gameInputRef.current?.focus(), 0);
            }}
          >
            ↩ Cambiar respuesta
          </button>
        )}
      </form>
    </div>
  );
}
