// File: scripts/migrateAssegnazioni.js

const admin = require('firebase-admin');

// --- CONFIGURAZIONE ---
// Carica il file JSON con le credenziali che hai scaricato
const serviceAccount = require('./serviceAccountKey.json');

// Inizializza l'app Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Ottieni un riferimento al database Firestore
const db = admin.firestore();

// --- FUNZIONE PRINCIPALE DI MIGRAZIONE ---
async function migrateData() {
  console.log('🚀 Inizio della migrazione dei documenti in "assegnazioniCantieri"...');

  // Riferimento alla collezione da migrare
  const assegnazioniRef = db.collection('assegnazioniCantieri');
  // Riferimento alla collezione degli utenti per recuperare i loro dati
  const usersRef = db.collection('users');
  
  // Ottieni tutti i documenti dalla collezione
  const snapshot = await assegnazioniRef.get();

  if (snapshot.empty) {
    console.log('✅ Nessun documento da migrare. Terminato.');
    return;
  }

  // Firestore permette di eseguire fino a 500 operazioni in un singolo "batch".
  // Usiamo un batch per rendere l'operazione molto più veloce ed efficiente.
  let batch = db.batch();
  let operationsCount = 0;
  let updatedDocsCount = 0;

  console.log(`🔎 Trovati ${snapshot.size} documenti da analizzare...`);

  // Itera su ogni documento trovato
  for (const doc of snapshot.docs) {
    const data = doc.data();

    // Controlla se il documento è nel vecchio formato (e non è già stato migrato)
    if (data.prepostoId && !data.teamMemberIds) {
      console.log(`- Trovato documento da migrare: ${doc.id}`);
      updatedDocsCount++;

      // 1. CREA IL NUOVO ARRAY 'teamMemberIds'
      const teamMemberIds = [
        data.prepostoId, // Aggiungi l'ID del preposto
        ...(data.operaiIds || []) // Aggiungi tutti gli ID degli operai (se esistono)
      ];
      // Rimuovi eventuali duplicati
      const uniqueTeamMemberIds = [...new Set(teamMemberIds)];

      // 2. CREA IL NUOVO ARRAY 'team' (con i dettagli)
      const team = [];
      for (const userId of uniqueTeamMemberIds) {
        try {
          const userDoc = await usersRef.doc(userId).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            team.push({
              userId: userId,
              nome: `${userData.nome} ${userData.cognome}`,
              ruolo: userData.ruolo || 'sconosciuto'
            });
          }
        } catch (e) {
            console.warn(`⚠️ Impossibile trovare i dettagli per l'utente ${userId}`);
        }
      }

      // 3. AGGIUNGI L'OPERAZIONE DI AGGIORNAMENTO AL BATCH
      batch.update(doc.ref, {
        teamMemberIds: uniqueTeamMemberIds,
        team: team
      });

      operationsCount++;

      // Se raggiungiamo il limite di 500 operazioni, eseguiamo il batch e ne creiamo uno nuovo.
      if (operationsCount >= 499) {
        console.log('📦 Esecuzione di un batch intermedio (500 operazioni)...');
        await batch.commit();
        batch = db.batch(); // Resetta il batch
        operationsCount = 0;
      }
    }
  }

  // Esegui le operazioni rimaste nell'ultimo batch
  if (operationsCount > 0) {
    console.log(`📦 Esecuzione del batch finale (${operationsCount} operazioni)...`);
    await batch.commit();
  }

  console.log(`\n✅ Migrazione completata con successo!`);
  console.log(`📄 Documenti aggiornati: ${updatedDocsCount}`);
}

// Esegui la funzione e gestisci eventuali errori
migrateData().catch(error => {
  console.error('❌ Si è verificato un errore durante la migrazione:', error);
});