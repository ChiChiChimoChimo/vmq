const { Router } = require('express');
const { getDb } = require('../firebase-admin');

const router = Router();

router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const status = req.query.status || 'approved';
    const snap = await db.collection('songs').where('status', '==', status).get();
    const songs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(songs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/submit', async (req, res) => {
  try {
    const { youtubeUrl, songTitle, gameTitle, composer, aliases, difficulty } = req.body;
    if (!youtubeUrl || !songTitle || !gameTitle) {
      return res.status(400).json({ error: 'youtubeUrl, songTitle y gameTitle son requeridos' });
    }

    const youtubeId = extractYoutubeId(youtubeUrl);
    if (!youtubeId) return res.status(400).json({ error: 'URL de YouTube inválida' });

    const db = getDb();
    const doc = await db.collection('songs').add({
      youtubeId,
      songTitle: songTitle.trim(),
      gameTitle: gameTitle.trim(),
      composer: composer?.trim() || '',
      aliases: Array.isArray(aliases) ? aliases.map(a => a.trim()) : [],
      difficulty: ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium',
      status: 'pending',
      submittedBy: req.body.nickname || 'anónimo',
      submittedAt: new Date(),
    });

    res.status(201).json({ id: doc.id, message: 'Canción enviada para revisión' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function extractYoutubeId(url) {
  try {
    const u = new URL(url);
    if (u.hostname === 'youtu.be') return u.pathname.slice(1).split('?')[0];
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
  } catch {}
  return null;
}

module.exports = router;
