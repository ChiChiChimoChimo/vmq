import { useGameStore } from '../store/gameStore';

export default function Scoreboard({ players }) {
  const myNickname = useGameStore(s => s.nickname);
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="scoreboard">
      {sorted.map(p => (
        <div key={p.socketId} className={`score-row ${p.nickname === myNickname ? 'me' : ''}`}>
          <span className="score-name">{p.nickname}</span>
          <span className="score-correct-count">{p.correctCount ?? 0}✓</span>
          <span className="score-pts">{p.score}</span>
          {p.hasGuessed && <span className="score-check">●</span>}
        </div>
      ))}
    </div>
  );
}
