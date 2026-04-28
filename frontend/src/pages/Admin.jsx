import { useState, useEffect } from 'react';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const EMPTY_FORM = {
  gameTitle: '', songTitle: '', youtubeId: '', composer: '',
  aliases: '', difficulty: 'medium', startTime: 0,
};

function SongForm({ value, onChange }) {
  const f = (field) => (e) => onChange({ ...value, [field]: e.target.value });
  return (
    <div className="song-form-grid">
      <label>Juego *</label>
      <input value={value.gameTitle} onChange={f('gameTitle')} placeholder="The Legend of Zelda: Ocarina of Time" />
      <label>Canción *</label>
      <input value={value.songTitle} onChange={f('songTitle')} placeholder="Gerudo Valley" />
      <label>YouTube ID *</label>
      <input value={value.youtubeId} onChange={f('youtubeId')} placeholder="dT3tVFn4kQQ" />
      <label>Inicio (segundos)</label>
      <input type="number" min="0" value={value.startTime} onChange={f('startTime')} />
      <label>Alias (coma)</label>
      <input value={value.aliases} onChange={f('aliases')} placeholder="Zelda OoT, OoT" />
      <label>Dificultad</label>
      <select value={value.difficulty} onChange={f('difficulty')}>
        <option value="easy">Fácil</option>
        <option value="medium">Media</option>
        <option value="hard">Difícil</option>
      </select>
      <label>Compositor</label>
      <input value={value.composer} onChange={f('composer')} placeholder="Koji Kondo" />
    </div>
  );
}

function formToBody(form) {
  return {
    ...form,
    aliases: form.aliases.split(',').map(a => a.trim()).filter(Boolean),
    startTime: Number(form.startTime) || 0,
  };
}

function songToForm(song) {
  return {
    gameTitle: song.gameTitle || '',
    songTitle: song.songTitle || '',
    youtubeId: song.youtubeId || '',
    composer: song.composer || '',
    aliases: (song.aliases || []).join(', '),
    difficulty: song.difficulty || 'medium',
    startTime: song.startTime ?? 0,
  };
}

export default function Admin() {
  const [token, setToken] = useState(localStorage.getItem('adminToken') || '');
  const [authenticated, setAuthenticated] = useState(false);
  const [songs, setSongs] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const headers = { 'x-admin-token': token };
  const jsonHeaders = { ...headers, 'Content-Type': 'application/json' };

  async function fetchSongs(t = token) {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/admin/songs?status=${filter}`, { headers: { 'x-admin-token': t } });
      if (res.status === 403) { setAuthenticated(false); return; }
      const data = await res.json();
      if (!res.ok) return;
      setSongs(Array.isArray(data) ? data : []);
      setAuthenticated(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (authenticated) fetchSongs(); }, [filter]);

  async function patchStatus(id, status) {
    await fetch(`${BACKEND}/api/admin/songs/${id}`, {
      method: 'PATCH', headers: jsonHeaders, body: JSON.stringify({ status }),
    });
    fetchSongs();
  }

  async function deleteSong(id) {
    if (!confirm('¿Eliminar canción?')) return;
    await fetch(`${BACKEND}/api/admin/songs/${id}`, { method: 'DELETE', headers });
    fetchSongs();
  }

  async function saveEdit(id) {
    setSaving(true);
    await fetch(`${BACKEND}/api/admin/songs/${id}`, {
      method: 'PUT', headers: jsonHeaders, body: JSON.stringify(formToBody(editForm)),
    });
    setSaving(false);
    setEditingId(null);
    fetchSongs();
  }

  async function createSong() {
    if (!createForm.gameTitle || !createForm.songTitle || !createForm.youtubeId) return;
    setSaving(true);
    await fetch(`${BACKEND}/api/admin/songs`, {
      method: 'POST', headers: jsonHeaders,
      body: JSON.stringify({ ...formToBody(createForm), status: 'approved' }),
    });
    setSaving(false);
    setCreating(false);
    setCreateForm(EMPTY_FORM);
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
          onKeyDown={e => e.key === 'Enter' && (localStorage.setItem('adminToken', token), fetchSongs(token))}
        />
        <button className="btn-primary" onClick={() => { localStorage.setItem('adminToken', token); fetchSongs(token); }}>
          Entrar
        </button>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-top">
        <h1>Panel de administración</h1>
        <button className="btn-primary" onClick={() => { setCreating(c => !c); setCreateForm(EMPTY_FORM); }}>
          {creating ? 'Cancelar' : '+ Nueva canción'}
        </button>
      </div>

      {creating && (
        <div className="admin-create card">
          <h3>Nueva canción</h3>
          <SongForm value={createForm} onChange={setCreateForm} />
          <div className="edit-actions">
            <button className="btn-primary" onClick={createSong} disabled={saving}>
              {saving ? 'Guardando...' : 'Crear (aprobada)'}
            </button>
            <button className="btn-secondary" onClick={() => setCreating(false)}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="filter-tabs">
        {['pending', 'approved', 'rejected'].map(s => (
          <button key={s} className={filter === s ? 'active' : ''} onClick={() => setFilter(s)}>{s}</button>
        ))}
      </div>

      {loading && <p>Cargando...</p>}

      <div className="songs-table">
        {songs.map(song => (
          <div key={song.id} className="song-row">
            {editingId === song.id ? (
              <div className="song-edit-expanded">
                <SongForm value={editForm} onChange={setEditForm} />
                <div className="edit-actions">
                  <button className="btn-primary" onClick={() => saveEdit(song.id)} disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button className="btn-secondary" onClick={() => setEditingId(null)}>Cancelar</button>
                </div>
              </div>
            ) : (
              <>
                <div className="song-info">
                  <strong>{song.gameTitle}</strong> — {song.songTitle}
                  <br />
                  <small>
                    <a href={`https://youtu.be/${song.youtubeId}?t=${song.startTime || 0}`} target="_blank" rel="noreferrer">
                      ▶ {song.youtubeId}
                    </a>
                    {song.startTime > 0 && ` · inicio: ${song.startTime}s`}
                  </small>
                  <br />
                  <small>Por: {song.submittedBy} · Dificultad: {song.difficulty}</small>
                  {song.aliases?.length > 0 && <><br /><small>Alias: {song.aliases.join(', ')}</small></>}
                </div>
                <div className="song-actions">
                  <button className="btn-secondary" onClick={() => { setEditingId(song.id); setEditForm(songToForm(song)); }}>
                    Editar
                  </button>
                  {filter !== 'approved' && (
                    <button className="btn-approve" onClick={() => patchStatus(song.id, 'approved')}>✓</button>
                  )}
                  {filter !== 'rejected' && (
                    <button className="btn-reject" onClick={() => patchStatus(song.id, 'rejected')}>✕</button>
                  )}
                  <button className="btn-delete" onClick={() => deleteSong(song.id)}>🗑</button>
                </div>
              </>
            )}
          </div>
        ))}
        {!loading && songs.length === 0 && <p>No hay canciones con estado "{filter}".</p>}
      </div>
    </div>
  );
}
