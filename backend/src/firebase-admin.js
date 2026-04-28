const admin = require('firebase-admin');

let db;

function initFirebase() {
  if (admin.apps.length) return;

  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;

  if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  } else {
    // Dev: usa Application Default Credentials o emulador
    admin.initializeApp({ projectId: FIREBASE_PROJECT_ID || 'vmq-dev' });
  }

  db = admin.firestore();
}

function getDb() {
  if (!db) initFirebase();
  return db;
}

module.exports = { initFirebase, getDb };
