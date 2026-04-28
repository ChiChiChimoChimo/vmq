const { Router } = require('express');
const { getDb } = require('../firebase-admin');

const router = Router();

function isAdmin(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token || token !== process.env.ADMIN_TOKEN) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  next();
}

router.get('/songs', isAdmin, async (req, res) => {
  try {
    const db = getDb();
    const status = req.query.status || 'pending';
    const snap = await db.collection('songs').where('status', '==', status).get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/songs', isAdmin, async (req, res) => {
  try {
    const { gameTitle, songTitle, youtubeId, composer, aliases, difficulty, startTime, status } = req.body;
    if (!gameTitle || !songTitle || !youtubeId) {
      return res.status(400).json({ error: 'gameTitle, songTitle y youtubeId son requeridos' });
    }
    const db = getDb();
    const doc = await db.collection('songs').add({
      gameTitle: gameTitle.trim(),
      songTitle: songTitle.trim(),
      youtubeId: youtubeId.trim(),
      composer: composer?.trim() || '',
      aliases: Array.isArray(aliases) ? aliases.map(a => a.trim()).filter(Boolean) : [],
      difficulty: ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium',
      startTime: Number(startTime) || 0,
      status: ['approved', 'pending', 'rejected'].includes(status) ? status : 'approved',
      submittedBy: 'admin',
      submittedAt: new Date(),
    });
    res.status(201).json({ id: doc.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/songs/:id', isAdmin, async (req, res) => {
  try {
    const { gameTitle, songTitle, youtubeId, composer, aliases, difficulty, startTime, status } = req.body;
    if (!gameTitle || !songTitle || !youtubeId) {
      return res.status(400).json({ error: 'gameTitle, songTitle y youtubeId son requeridos' });
    }
    const db = getDb();
    const update = {
      gameTitle: gameTitle.trim(),
      songTitle: songTitle.trim(),
      youtubeId: youtubeId.trim(),
      composer: composer?.trim() || '',
      aliases: Array.isArray(aliases) ? aliases.map(a => a.trim()).filter(Boolean) : [],
      difficulty: ['easy', 'medium', 'hard'].includes(difficulty) ? difficulty : 'medium',
      startTime: Number(startTime) || 0,
      updatedAt: new Date(),
    };
    if (status) update.status = status;
    await db.collection('songs').doc(req.params.id).update(update);
    res.json({ message: 'Canción actualizada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/songs/:id', isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'status debe ser approved o rejected' });
    }
    const db = getDb();
    await db.collection('songs').doc(req.params.id).update({ status, reviewedAt: new Date() });
    res.json({ message: `Canción ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/songs/:id', isAdmin, async (req, res) => {
  try {
    const db = getDb();
    await db.collection('songs').doc(req.params.id).delete();
    res.json({ message: 'Canción eliminada' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
