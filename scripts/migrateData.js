// comando per avviare: node migrateData.js

// 1. Inizializzazione
const admin = require('firebase-admin');
// Importiamo le nostre funzioni parser esistenti! Riutilizziamo la logica.
const {
    parseUser, parseCompany, parseClient, parseAttrezzatura, parseAssegnazione,
    parseArchivioAttrezzatura, parseCantiere, parseAssegnazioneCantiere, parseReport,
    parseReportTecnico, parseFormAzienda, parseForm, parseDocumento, parseEvento,
    parseNotifica, parseRapportinoTemplate
} = require('../packages/shared-core/data/dataParsers'); // Assicurati che il percorso sia corretto

// Carica le credenziali che hai scaricato
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
console.log('🔥 Connesso a Firebase come Amministratore.');

// 2. Configurazione
// Dizionario che mappa il nome della collezione alla sua funzione parser.
const parsers = {
    'users': parseUser,
    'companies': parseCompany,
    'clients': parseClient,
    'attrezzature': parseAttrezzatura,
    'assegnazioniMagazzino': parseAssegnazione,
    'archivioAttrezzatura': parseArchivioAttrezzatura,
    'cantieri': parseCantiere,
    'assegnazioniCantieri': parseAssegnazioneCantiere,
    'reports': parseReport,
    'reportTecnico': parseReportTecnico,
    'aziendeForm': parseFormAzienda,
    'forms': parseForm,
    'documenti': parseDocumento,
    'eventi': parseEvento,
    'notifiche': parseNotifica,
    'rapportinoTemplates': parseRapportinoTemplate
    // Aggiungi qui altre collezioni se necessario
};

// ⚠️ MODIFICA QUI: Specifica quale collezione vuoi migrare. UNA ALLA VOLTA!
const collectionNameToMigrate = 'clients'; 


// 3. Logica di Migrazione
async function migrateCollection(collectionName) {
    const parser = parsers[collectionName];
    if (!parser) {
        console.error(`❌ Nessun parser definito per la collezione "${collectionName}".`);
        return;
    }

    console.log(`🚀 Inizio migrazione per la collezione: "${collectionName}"...`);
    const collectionRef = db.collection(collectionName);
    const snapshot = await collectionRef.get();

    if (snapshot.empty) {
        console.log('ℹ️ La collezione è vuota. Nessuna migrazione necessaria.');
        return;
    }

    // Usiamo un WriteBatch per efficienza. Aggiorna fino a 500 documenti alla volta.
    let batch = db.batch();
    let count = 0;

    for (const doc of snapshot.docs) {
        const originalData = doc.data();
        // Applichiamo la stessa logica di parsing che usa la tua app!
        const cleanedData = parser({ id: doc.id, ...originalData });

        // Sovrascriviamo il documento con i dati puliti
        batch.set(doc.ref, cleanedData);
        count++;

        if (count % 499 === 0) {
            console.log(`✍️ Eseguo batch di ${count} documenti...`);
            await batch.commit();
            batch = db.batch(); // Inizia un nuovo batch
        }
    }

    // Esegui il commit degli ultimi documenti rimasti nel batch
    if (count % 499 !== 0) {
        await batch.commit();
    }

    console.log(`✅ Migrazione completata per "${collectionName}". ${snapshot.size} documenti aggiornati.`);
}

// 4. Esecuzione
migrateCollection(collectionNameToMigrate).catch(console.error);