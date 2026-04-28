import { useState } from 'react';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export default function Contribute() {
  const [form, setForm] = useState({
    youtubeUrl: '', songTitle: '', gameTitle: '',
    composer: '', aliases: '', difficulty: 'medium', nickname: '',
  });
  const [status, setStatus] = useState(null); // null | 'loading' | 'ok' | 'error'
  const [message, setMessage] = useState('');

  function set(key, val) { setForm(f => ({ ...f, [key]: val })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch(`${BACKEND}/api/songs/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          aliases: form.aliases.split(',').map(a => a.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatus('ok');
      setMessage(data.message);
      setForm({ youtubeUrl: '', songTitle: '', gameTitle: '', composer: '', aliases: '', difficulty: 'medium', nickname: '' });
    } catch (err) {
      setStatus('error');
      setMessage(err.message);
    }
  }

  return (
    <div className="contribute-page">
      <a href="/" className="back-link">← Volver</a>
      <h1>Proponer canción</h1>
      <p>Sugiere una canción para el quiz. Un admin la revisará antes de publicarla.</p>

      <form onSubmit={handleSubmit} className="card">
        <label>URL de YouTube *</label>
        <input value={form.youtubeUrl} onChange={e => set('youtubeUrl', e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..." required />

        <label>Nombre de la canción *</label>
        <input value={form.songTitle} onChange={e => set('songTitle', e.target.value)}
          placeholder="Ej: One-Winged Angel" required />

        <label>Videojuego *</label>
        <input value={form.gameTitle} onChange={e => set('gameTitle', e.target.value)}
          placeholder="Ej: Final Fantasy VII" required />

        <label>Compositor (opcional)</label>
        <input value={form.composer} onChange={e => set('composer', e.target.value)}
          placeholder="Ej: Nobuo Uematsu" />

        <label>Alias aceptados (separados por coma, opcional)</label>
        <input value={form.aliases} onChange={e => set('aliases', e.target.value)}
          placeholder="Ej: ff7, final fantasy 7" />

        <label>Dificultad</label>
        <select value={form.difficulty} onChange={e => set('difficulty', e.target.value)}>
          <option value="easy">Fácil</option>
          <option value="medium">Media</option>
          <option value="hard">Difícil</option>
        </select>

        <label>Tu nickname (opcional)</label>
        <input value={form.nickname} onChange={e => set('nickname', e.target.value)}
          placeholder="Para que te acrediten" />

        <button type="submit" className="btn-primary" disabled={status === 'loading'}>
          {status === 'loading' ? 'Enviando...' : 'Enviar propuesta'}
        </button>

        {status === 'ok' && <p className="success">{message}</p>}
        {status === 'error' && <p className="error">{message}</p>}
      </form>
    </div>
  );
}
