const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

async function deleteQueryBatch(db, query, resolve) {
    const snapshot = await query.get();

    const batchSize = snapshot.size;
    if (batchSize === 0) {
        resolve();
        return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    process.nextTick(() => {
        deleteQueryBatch(db, query, resolve);
    });
}

exports.deleteWarnings = functions.https.onRequest(async (request, response) => {
    functions.logger.info("Delete warnings executing...", {structuredData: true});

    const db = admin.firestore();
    const warningRef = db.collection("warnings");
    const query = warningRef.limit(50);

    try {
        await new Promise((resolve, reject) => {
            deleteQueryBatch(db, query, resolve).catch(reject);
        });
    } catch(e) {
        functions.logger.error("There was an error during batch deletion.");
        response.send({
            message: "There was an error during batch deletion",
        });
        return;
    }

    functions.logger.info("Delete warnings executed!", {structuredData: true});
    response.send({
        message: "All warnings were successfully deleted.",
    });
});