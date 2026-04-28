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
  const { round, roundResult, room, phase, nextSong } = useGameStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (phase === 'gameEnd') navigate(`/results/${code}`);
  }, [phase]);

  function handleGuess({ game, song }) {
    socket.emit('guess:submit', { game, song });
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
        {/* Player siempre montado para poder precargar la siguiente canción */}
        <YoutubePlayer
          youtubeId={phase === 'playing' ? round?.youtubeId : undefined}
          startTime={round?.startTime || 0}
          nextYoutubeId={phase === 'roundEnd' ? nextSong?.youtubeId : undefined}
          nextStartTime={nextSong?.startTime || 0}
        />

        {phase === 'playing' && round && (
          <GuessInput duration={round.duration} onGuess={handleGuess} />
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
