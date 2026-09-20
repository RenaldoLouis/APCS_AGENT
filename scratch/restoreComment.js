const admin = require('firebase-admin');
const serviceAccount = require('../apcs_service/src/configs/serviceAccountKey.json');

// Initialize the default app
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// 1. The default (current) database
const defaultDb = admin.firestore();

// 2. The restored backup database
// IMPORTANT: Replace 'YOUR-RESTORED-DATABASE-ID' with the actual ID you typed when restoring!
const restoredDb = admin.firestore(admin.app(), 'YOUR-RESTORED-DATABASE-ID');

async function restoreJuryComment() {
    try {
        console.log("Searching for the deleted comment in the backup...");
        
        // Fetch all jury scores from the backup that have a score of 92
        const restoredScoresSnapshot = await restoredDb.collection('JuryScores2025')
            .where('score', '==', 92)
            .get();
        
        if (restoredScoresSnapshot.empty) {
            console.log("Could not find any document with score 92 in the backup. Are you sure you restored from the correct date?");
            return;
        }

        // Filter the results in javascript to find the one by "jin yun" (case-insensitive) for Ethan
        let targetDoc = null;
        let targetData = null;

        for (const doc of restoredScoresSnapshot.docs) {
            const data = doc.data();
            const juryName = data.juryName || '';
            
            if (juryName.toLowerCase().includes('jin yun')) {
                // Check if this belongs to Ethan Limandibrata
                const registrantId = data.registrantId;
                if (registrantId) {
                    const regDoc = await defaultDb.collection('Registrants2025').doc(registrantId).get();
                    if (regDoc.exists) {
                        const regData = regDoc.data();
                        const p = regData.performers?.[0];
                        const fullName = p ? (p.fullName || `${p.firstName || ''} ${p.lastName || ''}`).trim() : '';
                        
                        if (fullName.toLowerCase().includes('ethan limandibrata')) {
                            targetDoc = doc;
                            targetData = data;
                            break;
                        }
                    }
                }
            }
        }

        if (!targetDoc) {
            console.log("Found some scores of 92 by Jin Yun, but none belonged to Ethan Limandibrata.");
            return;
        }
        
        console.log("Found the target document in backup!");
        console.log("Jury Name:", targetData.juryName);
        console.log("Score:", targetData.score);
        console.log("Comment:", targetData.comment);

        const targetDocRef = defaultDb.collection('JuryScores2025').doc(targetDoc.id);
        const existingDoc = await targetDocRef.get();
        
        if (!existingDoc.exists) {
             console.log("The entire document was deleted in the current DB. Restoring it completely...");
             await targetDocRef.set(targetData);
        } else {
             console.log("Document exists in current DB. Restoring just the comment fields...");
             await targetDocRef.update({
                 comment: targetData.comment || '',
                 panelComment: targetData.panelComment || '',
             });
        }
        
        console.log("Successfully restored data!");
    } catch (error) {
        console.error("Error restoring data:", error);
    }
}

restoreJuryComment();
