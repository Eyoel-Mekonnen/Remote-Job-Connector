// firebaseConfig.js
const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.resolve(__dirname, './gethired-2cb65-firebase-adminsdk-escga-a02084f6a9.json'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'gethired-2cb65.appspot.com',
  });
  console.log('Firebase Admin Initialized');
}

const bucket = admin.storage().bucket();

module.exports = { admin, bucket };
