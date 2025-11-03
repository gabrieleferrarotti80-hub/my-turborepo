// comando per avviare: node copyCollection.js

// 1. Inizializzazione
const admin = require('firebase-admin');

// Assicurati di avere il file con la chiave privata scaricato dalla console Firebase
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
console.log('🔥 Connesso a Firebase come Amministratore.');

// ---------------------------------------------------------------- //
// 2. ⚠️ CONFIGURAZIONE: Modifica questi valori
// ---------------------------------------------------------------- //

// Inserisci il nome esatto della collezione da cui vuoi copiare i documenti
const SOURCE_COLLECTION_NAME = 'clienti';

// Inserisci il nome esatto della collezione in cui vuoi incollare i documenti
// Se non esiste, verrà creata automaticamente.
const DESTINATION_COLLECTION_NAME = 'clients';

// ---------------------------------------------------------------- //


// 3. Logica di Copia
async function copyCollection(sourceName, destinationName) {
    console.log(`🚀 Inizio la copia dalla collezione "${sourceName}" alla collezione "${destinationName}"...`);

    const sourceRef = db.collection(sourceName);
    const destinationRef = db.collection(destinationName);
    const snapshot = await sourceRef.get();

    if (snapshot.empty) {
        console.log(`ℹ️ La collezione di origine "${sourceName}" è vuota. Nessun documento da copiare.`);
        return;
    }

    // Usiamo un WriteBatch per scrivere i documenti in modo efficiente,
    // fino a 500 operazioni alla volta.
    let batch = db.batch();
    let count = 0;

    for (const doc of snapshot.docs) {
        const docData = doc.data();
        // Creiamo un nuovo documento nella destinazione con lo STESSO ID dell'originale
        const newDocRef = destinationRef.doc(doc.id);
        batch.set(newDocRef, docData);
        count++;

        // Quando il batch raggiunge il limite, lo eseguiamo e ne creiamo uno nuovo
        if (count % 499 === 0) {
            console.log(`✍️ Scrivo un blocco di ${count} documenti...`);
            await batch.commit();
            batch = db.batch();
        }
    }

    // Eseguiamo il commit degli ultimi documenti rimasti nel batch
    if (count % 499 !== 0) {
        await batch.commit();
    }

    console.log(`✅ Copia completata! ${snapshot.size} documenti sono stati copiati da "${sourceName}" a "${destinationName}".`);
}

// 4. Esecuzione
if (!SOURCE_COLLECTION_NAME || !DESTINATION_COLLECTION_NAME) {
    console.error("❌ Per favore, imposta i nomi delle collezioni di origine e destinazione nello script.");
} else {
    copyCollection(SOURCE_COLLECTION_NAME, DESTINATION_COLLECTION_NAME).catch(console.error);
}