import { useState, useEffect, useRef } from 'react';
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
  const [songSuggestions, setSongSuggestions] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(duration);
  const gameInputRef = useRef(null);
  const songInputRef = useRef(null);
  const phase = useGameStore(s => s.phase);

  useEffect(() => {
    fetch(`${BACKEND}/api/songs`)
      .then(r => r.json())
      .then(data => setSongs(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Reset on new round — timer usa Date.now() para evitar drift de setInterval
  useEffect(() => {
    setGameInput('');
    setSongInput('');
    setSongPhase(false);
    setGameSuggestions([]);
    setSongSuggestions([]);
    setSubmitted(false);
    gameInputRef.current?.focus();

    const startedAt = Date.now();
    let rafId;

    function tick() {
      const remaining = Math.max(0, duration - (Date.now() - startedAt) / 1000);
      setTimeLeft(remaining);
      if (remaining > 0) {
        rafId = requestAnimationFrame(tick);
      }
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [duration]);

  useEffect(() => {
    if (phase === 'roundEnd') {
      setSubmitted(true);
      setGameSuggestions([]);
      setSongSuggestions([]);
    }
  }, [phase]);

  // Show song input when game input exactly matches a game with multiple songs
  useEffect(() => {
    if (!gameInput.trim()) { setSongPhase(false); return; }
    const key = normalize(gameInput);
    const matches = songs.filter(s =>
      normalize(s.gameTitle) === key ||
      (s.aliases || []).some(a => normalize(a) === key)
    );
    setSongPhase(matches.length > 1);
  }, [gameInput, songs]);

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
    // Check multi-song immediately so song input can appear before submit
    const key = normalize(gameTitle);
    const matches = songs.filter(s =>
      normalize(s.gameTitle) === key ||
      (s.aliases || []).some(a => normalize(a) === key)
    );
    const needsSong = matches.length > 1;
    setSongPhase(needsSong);
    if (needsSong) {
      setTimeout(() => songInputRef.current?.focus(), 50);
    }
  }

  function handleSongChange(e) {
    const val = e.target.value;
    setSongInput(val);
    if (!val.trim()) { setSongSuggestions([]); return; }

    const key = normalize(gameInput);
    const gameSongs = songs.filter(s =>
      normalize(s.gameTitle) === key ||
      (s.aliases || []).some(a => normalize(a) === key)
    );
    const matches = gameSongs
      .filter(s => matchesSearch(s.songTitle, val))
      .map(s => s.songTitle);
    setSongSuggestions(matches.slice(0, 8));
  }

  function selectSong(songTitle) {
    setSongInput(songTitle);
    setSongSuggestions([]);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!gameInput.trim() || submitted || timeLeft === 0) return;
    setSubmitted(true);
    setGameSuggestions([]);
    setSongSuggestions([]);
    onGuess({ game: gameInput.trim(), song: songInput.trim() || undefined });
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
          <div className="autocomplete-wrapper song-input">
            <input
              ref={songInputRef}
              value={songInput}
              onChange={handleSongChange}
              onBlur={() => setTimeout(() => setSongSuggestions([]), 150)}
              placeholder="¿Cómo se llama la canción?"
              disabled={disabled}
              autoComplete="off"
            />
            {songSuggestions.length > 0 && (
              <ul className="autocomplete-dropdown">
                {songSuggestions.map(s => (
                  <li key={s} onMouseDown={() => selectSong(s)}>{s}</li>
                ))}
              </ul>
            )}
          </div>
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
