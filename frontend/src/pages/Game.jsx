import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { useSocket } from '../hooks/useSocket';
import YoutubePlayer from '../components/YoutubePlayer';
import GuessInput from '../components/GuessInput';
import Scoreboard from '../components/Scoreboard';

export default function Game() {
  const { code } = useParams();
  const socket = useSocket();
  const { round, roundResult, room, phase } = useGameStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (phase === 'gameEnd') navigate(`/results/${code}`);
  }, [phase]);

  function handleGuess(guess) {
    socket.emit('guess:submit', { guess });
  }

  function handleSongGuess(guess) {
    socket.emit('guess:song', { guess });
  }

  if (!round && !roundResult) {
    return (
      <div className="loading">
        <p>¡Prepárate! El juego comienza en breve...</p>
      </div>
    );
  }

  return (
    <div className="game-page">
      <div className="game-header">
        <span className="round-label">
          Ronda {round?.roundNumber ?? roundResult?.roundNumber} / {round?.total ?? room?.totalRounds}
        </span>
        <Scoreboard players={room?.players ?? []} />
      </div>

      <div className="game-center">
        {round && phase === 'playing' && (
          <>
            <YoutubePlayer youtubeId={round.youtubeId} autoPlay />
            <GuessInput duration={round.duration} onGuess={handleGuess} onSongGuess={handleSongGuess} />
          </>
        )}

        {phase === 'roundEnd' && roundResult && (
          <div className="round-result">
            <h2>Respuesta:</h2>
            <p className="answer-title">{roundResult.answer.gameTitle}</p>
            <p className="answer-song">"{roundResult.answer.songTitle}"</p>
            <p className="next-round-msg">Siguiente ronda en 5 segundos...</p>
          </div>
        )}
      </div>
    </div>
  );
}
