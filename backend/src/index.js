require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { initFirebase } = require('./firebase-admin');
const registerHandlers = require('./sockets/gameHandlers');
const songsRouter = require('./routes/songs');
const adminRouter = require('./routes/admin');

initFirebase();

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/songs', songsRouter);
app.use('/api/admin', adminRouter);
app.get('/health', (_, res) => res.json({ ok: true }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CORS_ORIGIN || 'http://localhost:5173' },
});

io.on('connection', socket => {
  console.log('socket connected:', socket.id);
  registerHandlers(io, socket);
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => console.log(`VMQ backend running on port ${PORT}`));
