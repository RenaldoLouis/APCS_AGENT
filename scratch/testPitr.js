const admin = require('firebase-admin');
const serviceAccount = require('../apcs_service/src/configs/serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function run() {
    try {
        console.log(typeof db.collection('JuryScores2025').doc('test').withReadTime);
        console.log(typeof db.collection('JuryScores2025').where('a','==','b').withReadTime);
        console.log(typeof db.getAll);
    } catch (err) {
        console.error(err);
    }
}
run();
