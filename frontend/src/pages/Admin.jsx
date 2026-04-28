import { useState, useEffect } from 'react';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export default function Admin() {
  const [token, setToken] = useState(localStorage.getItem('adminToken') || '');
  const [authenticated, setAuthenticated] = useState(false);
  const [songs, setSongs] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(false);

  async function fetchSongs(t = token) {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/admin/songs?status=${filter}`, {
        headers: { 'x-admin-token': t },
      });
      if (res.status === 403) { setAuthenticated(false); return; }
      const data = await res.json();
      if (!res.ok) { console.error('Admin fetch error:', data); return; }
      setSongs(Array.isArray(data) ? data : []);
      setAuthenticated(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (authenticated) fetchSongs(); }, [filter]);

  async function updateSong(id, status) {
    await fetch(`${BACKEND}/api/admin/songs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': token },
      body: JSON.stringify({ status }),
    });
    fetchSongs();
  }

  async function deleteSong(id) {
    if (!confirm('¿Eliminar canción?')) return;
    await fetch(`${BACKEND}/api/admin/songs/${id}`, {
      method: 'DELETE',
      headers: { 'x-admin-token': token },
    });
    fetchSongs();
  }

  if (!authenticated) {
    return (
      <div className="admin-login card">
        <h2>Panel de admin</h2>
        <input
          type="password"
          placeholder="Token de administrador"
          value={token}
          onChange={e => setToken(e.target.value)}
        />
        <button className="btn-primary" onClick={() => { localStorage.setItem('adminToken', token); fetchSongs(token); }}>
          Entrar
        </button>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <h1>Panel de administración</h1>

      <div className="filter-tabs">
        {['pending', 'approved', 'rejected'].map(s => (
          <button key={s} className={filter === s ? 'active' : ''} onClick={() => setFilter(s)}>{s}</button>
        ))}
      </div>

      {loading && <p>Cargando...</p>}

      <div className="songs-table">
        {songs.map(song => (
          <div key={song.id} className="song-row">
            <div className="song-info">
              <strong>{song.gameTitle}</strong> — {song.songTitle}
              <br />
              <small>YouTube: <a href={`https://youtu.be/${song.youtubeId}`} target="_blank" rel="noreferrer">{song.youtubeId}</a></small>
              <br />
              <small>Por: {song.submittedBy} · Dificultad: {song.difficulty}</small>
              {song.aliases?.length > 0 && <><br /><small>Alias: {song.aliases.join(', ')}</small></>}
            </div>
            <div className="song-actions">
              {filter !== 'approved' && (
                <button className="btn-approve" onClick={() => updateSong(song.id, 'approved')}>✓ Aprobar</button>
              )}
              {filter !== 'rejected' && (
                <button className="btn-reject" onClick={() => updateSong(song.id, 'rejected')}>✕ Rechazar</button>
              )}
              <button className="btn-delete" onClick={() => deleteSong(song.id)}>🗑</button>
            </div>
          </div>
        ))}
        {!loading && songs.length === 0 && <p>No hay canciones con estado "{filter}".</p>}
      </div>
    </div>
  );
}
