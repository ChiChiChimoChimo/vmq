import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';

export default function Results() {
  const { leaderboard, nickname, reset } = useGameStore();
  const navigate = useNavigate();

  function handlePlayAgain() {
    reset();
    navigate('/');
  }

  if (!leaderboard) {
    return <div className="loading">Cargando resultados...</div>;
  }

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="results-page">
      <h1>Resultados finales</h1>

      <div className="leaderboard">
        {leaderboard.map((entry, i) => (
          <div
            key={entry.nickname}
            className={`leaderboard-row ${entry.nickname === nickname ? 'my-row' : ''}`}
          >
            <span className="rank">{medals[i] ?? `#${entry.rank}`}</span>
            <span className="player-name">{entry.nickname}</span>
            <span className="player-score">{entry.score} pts</span>
          </div>
        ))}
      </div>

      <button className="btn-primary" onClick={handlePlayAgain}>Volver al inicio</button>
    </div>
  );
}
