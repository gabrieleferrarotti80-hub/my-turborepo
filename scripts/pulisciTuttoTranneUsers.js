// comando per avviare: node pulisciTuttoTranneUsers.js

// 1. Inizializzazione
const admin = require('firebase-admin');

// Assicurati di avere il file con la chiave privata scaricato dalla console Firebase
try {
    const serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (error) {
    console.error("❌ ERRORE: File 'serviceAccountKey.json' non trovato o non valido. Assicurati che sia nella stessa cartella dello script.");
    process.exit(1); // Esce dallo script se le credenziali non sono valide
}

const db = admin.firestore();
console.log('🔥 Connesso a Firebase come Amministratore.');

// ---------------------------------------------------------------- //
// 2. ⚠️ CONFIGURAZIONE: Modifica questo valore se necessario
// ---------------------------------------------------------------- //

// Inserisci il nome esatto della collezione che vuoi CONSERVARE.
// Tutte le altre verranno svuotate.
const COLLECTION_TO_KEEP = 'users';

// ---------------------------------------------------------------- //


// 3. Logica di Eliminazione
async function deleteCollection(collectionRef, batchSize = 500) {
    const query = collectionRef.limit(batchSize);
    let deleted = 0;

    // Ciclo che continua finché ci sono documenti da eliminare
    while (true) {
        const snapshot = await query.get();
        if (snapshot.size === 0) {
            break; // Abbiamo finito
        }

        // Elimina i documenti in un batch
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        deleted += snapshot.size;
        console.log(`  ✍️  Eliminati ${deleted} documenti...`);
    }

    if (deleted > 0) {
        console.log(`✅ Completato: eliminati un totale di ${deleted} documenti dalla collezione '${collectionRef.id}'.`);
    } else {
        console.log(`ℹ️  La collezione '${collectionRef.id}' era già vuota.`);
    }
}

async function cleanupFirestore() {
    console.log(`🚀 Inizio la pulizia del database. Verrà conservata solo la collezione: '${COLLECTION_TO_KEEP}'.\n`);

    const collections = await db.listCollections();

    for (const collection of collections) {
        const collectionId = collection.id;
        console.log(`Analizzo la collezione: '${collectionId}'`);

        if (collectionId === COLLECTION_TO_KEEP) {
            console.log(`🟡 Saltata. '${collectionId}' è nella lista di quelle da conservare.\n`);
            continue;
        }

        console.log(`🔴 Inizio eliminazione per la collezione '${collectionId}'...`);
        await deleteCollection(collection);
        console.log(''); // Aggiunge una riga vuota per leggibilità
    }

    console.log(`🎉 Processo di pulizia completato!`);
}

// 4. Esecuzione
if (!COLLECTION_TO_KEEP) {
    console.error("❌ Per favore, imposta il nome della collezione da conservare nella costante 'COLLECTION_TO_KEEP'.");
} else {
    cleanupFirestore().catch(console.error);
}