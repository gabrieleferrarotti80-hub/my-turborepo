// File: restoreUsers.js

const admin = require('firebase-admin');

// Assicurati che il percorso al tuo file serviceAccountKey sia corretto
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();
console.log('🔥 Connesso a Firebase come Amministratore.');

// Funzione per ricostruire la collezione 'users'
async function restoreUsersFromAuth() {
    console.log('🔍 Inizio la lettura degli utenti da Firebase Authentication...');

    try {
        const listUsersResult = await auth.listUsers(1000); // Legge fino a 1000 utenti
        const users = listUsersResult.users;

        if (users.length === 0) {
            console.log('ℹ️ Nessun utente trovato in Firebase Authentication.');
            return;
        }

        console.log(`✅ Trovati ${users.length} utenti. Inizio la scrittura su Firestore...`);

        const batch = db.batch();

        users.forEach(userRecord => {
            const uid = userRecord.uid;
            const email = userRecord.email;
            const displayName = userRecord.displayName || '';

            // Separa nome e cognome se possibile, altrimenti lascia vuoto
            const nameParts = displayName.split(' ');
            const nome = nameParts[0] || '';
            const cognome = nameParts.slice(1).join(' ') || '';

            // Riferimento al documento nella collezione 'users' con lo stesso ID dell'UID
            const docRef = db.collection('users').doc(uid);

            // Creiamo un nuovo documento con i dati recuperabili e placeholder per quelli persi
            batch.set(docRef, {
                id: uid,
                email: email,
                nome: nome,
                cognome: cognome,
                // ⚠️ ATTENZIONE: Questi campi andranno compilati a mano!
                ruolo: 'default', // Imposta un ruolo di default
                companyID: null,  // Imposta un valore nullo
            });
        });

        await batch.commit();

        console.log(`🎉 Ripristino completato! ${users.length} documenti sono stati creati/aggiornati nella collezione 'users'.`);
        console.log("🔴 AZIONE RICHIESTA: Ora devi andare sulla console di Firestore e compilare manualmente i campi 'ruolo' e 'companyID' per ogni utente.");

    } catch (error) {
        console.error('❌ Errore durante il ripristino degli utenti:', error);
    }
}

// Esegui lo script
restoreUsersFromAuth();