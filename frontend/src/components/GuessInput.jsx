import { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { getSocket } from '../hooks/useSocket';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

function matchesSearch(text, query) {
  return text.toLowerCase().includes(query.toLowerCase());
}

export default function GuessInput({ duration, onGuess, onSongGuess }) {
  const [songs, setSongs] = useState([]);
  const [gameInput, setGameInput] = useState('');
  const [songInput, setSongInput] = useState('');
  const [gameLocked, setGameLocked] = useState(false);
  const [songDone, setSongDone] = useState(false);
  const [songPhase, setSongPhase] = useState(false);
  const [lockedGameTitle, setLockedGameTitle] = useState('');
  const [gameSuggestions, setGameSuggestions] = useState([]);
  const [songSuggestions, setSongSuggestions] = useState([]);
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

  useEffect(() => {
    setTimeLeft(duration);
    setGameInput('');
    setSongInput('');
    setGameLocked(false);
    setSongDone(false);
    setSongPhase(false);
    setLockedGameTitle('');
    setGameSuggestions([]);
    setSongSuggestions([]);
    gameInputRef.current?.focus();

    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(interval); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [duration]);

  useEffect(() => {
    if (phase === 'roundEnd') {
      setGameLocked(true);
      setSongDone(true);
      setGameSuggestions([]);
      setSongSuggestions([]);
    }
  }, [phase]);

  useEffect(() => {
    const socket = getSocket();

    function onGameCorrect({ gameTitle }) {
      setGameLocked(true);
      setLockedGameTitle(gameTitle);
      setGameSuggestions([]);

      const gameSongs = songs.filter(s => s.gameTitle === gameTitle);
      if (gameSongs.length > 1) {
        setSongPhase(true);
        setTimeout(() => songInputRef.current?.focus(), 50);
      } else {
        setSongDone(true);
      }
    }

    function onSongCorrect() {
      setSongDone(true);
      setSongSuggestions([]);
    }

    socket.on('guess:game:correct', onGameCorrect);
    socket.on('guess:song:correct', onSongCorrect);
    return () => {
      socket.off('guess:game:correct', onGameCorrect);
      socket.off('guess:song:correct', onSongCorrect);
    };
  }, [songs]);

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
    if (timeLeft > 0 && !gameLocked) {
      onGuess(gameTitle);
    }
  }

  function handleGameSubmit(e) {
    e.preventDefault();
    if (!gameInput.trim() || timeLeft === 0 || gameLocked) return;
    setGameSuggestions([]);
    onGuess(gameInput.trim());
  }

  function handleSongChange(e) {
    const val = e.target.value;
    setSongInput(val);
    if (!val.trim()) { setSongSuggestions([]); return; }

    const gameSongs = songs.filter(s => s.gameTitle === lockedGameTitle);
    const matches = gameSongs
      .filter(s => matchesSearch(s.songTitle, val))
      .map(s => s.songTitle);
    setSongSuggestions(matches.slice(0, 8));
  }

  function selectSong(songTitle) {
    setSongInput(songTitle);
    setSongSuggestions([]);
    if (timeLeft > 0 && !songDone) {
      onSongGuess(songTitle);
    }
  }

  function handleSongSubmit(e) {
    e.preventDefault();
    if (!songInput.trim() || timeLeft === 0 || songDone) return;
    setSongSuggestions([]);
    onSongGuess(songInput.trim());
  }

  const pct = (timeLeft / duration) * 100;
  const timerColor = pct > 50 ? '#4ade80' : pct > 25 ? '#facc15' : '#f87171';

  return (
    <div className="guess-input-wrapper">
      <div className="timer-bar" style={{ width: `${pct}%`, background: timerColor }} />
      <span className="timer-label">{timeLeft}s</span>

      <form onSubmit={handleGameSubmit} className="guess-form" autoComplete="off">
        <div className="autocomplete-wrapper">
          <input
            ref={gameInputRef}
            value={gameInput}
            onChange={handleGameChange}
            onBlur={() => setTimeout(() => setGameSuggestions([]), 150)}
            placeholder="¿De qué juego es esta canción?"
            disabled={gameLocked || timeLeft === 0}
            autoComplete="off"
            className={gameLocked ? 'input-correct' : ''}
          />
          {gameSuggestions.length > 0 && (
            <ul className="autocomplete-dropdown">
              {gameSuggestions.map(g => (
                <li key={g} onMouseDown={() => selectGame(g)}>{g}</li>
              ))}
            </ul>
          )}
        </div>
        <button type="submit" disabled={gameLocked || timeLeft === 0 || !gameInput.trim()}>
          {gameLocked ? '✓ Juego' : 'Adivinar'}
        </button>
      </form>

      {songPhase && (
        <form onSubmit={handleSongSubmit} className="guess-form" autoComplete="off">
          <div className="autocomplete-wrapper">
            <input
              ref={songInputRef}
              value={songInput}
              onChange={handleSongChange}
              onBlur={() => setTimeout(() => setSongSuggestions([]), 150)}
              placeholder="¿Cómo se llama la canción?"
              disabled={songDone || timeLeft === 0}
              autoComplete="off"
              className={songDone ? 'input-correct' : ''}
            />
            {songSuggestions.length > 0 && (
              <ul className="autocomplete-dropdown">
                {songSuggestions.map(s => (
                  <li key={s} onMouseDown={() => selectSong(s)}>{s}</li>
                ))}
              </ul>
            )}
          </div>
          <button type="submit" disabled={songDone || timeLeft === 0 || !songInput.trim()}>
            {songDone ? '✓ Canción' : 'Adivinar canción'}
          </button>
        </form>
      )}
    </div>
  );
}
