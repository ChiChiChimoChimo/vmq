export default function PlayerList({ players, hostSocketId, mySocketId }) {
  return (
    <div className="player-list">
      <h3>Jugadores ({players.length})</h3>
      {players.map(p => (
        <div key={p.socketId} className={`player-item ${p.socketId === mySocketId ? 'me' : ''}`}>
          <span className="player-nick">{p.nickname}</span>
          {p.socketId === hostSocketId && <span className="host-badge">HOST</span>}
          {p.socketId === mySocketId && <span className="you-badge">Tú</span>}
        </div>
      ))}
    </div>
  );
}
