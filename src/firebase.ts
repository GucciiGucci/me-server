const getFirebaseCredentials = require('../config/firebase-config');
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert(getFirebaseCredentials()),
  // other config
});

const db = admin.firestore();

export { db };
