// File: seedData.js

const admin = require('firebase-admin');
const { faker } = require('@faker-js/faker/locale/it'); // Usiamo dati italiani

const {
    parseUser, parseCompany, parseClient, parseAttrezzatura, parseAssegnazione,
    parseArchivioAttrezzatura, parseCantiere, parseAssegnazioneCantiere, parseReport,
    parseReportTecnico, parseFormAzienda, parseForm, parseDocumento, parseEvento,
    parseNotifica, parseRapportinoTemplate
} = require('../packages/shared-core/data/dataParsers'); // Assicurati che il percorso sia corretto
// --- CONFIGURAZIONE ---
const NUM_CANTIERI = 5;
const NUM_PREPOSTI = 3;
const NUM_OPERAI = 10;
const NUM_TECNICI = 2;
const REPORTS_PER_CANTIERE = 15;
const ISPEZIONI_PER_CANTIERE = 3;
// --------------------

// Inizializzazione Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Funzione per cancellare una collezione (per pulizia)
async function deleteCollection(collectionPath) {
    const collectionRef = db.collection(collectionPath);
    const snapshot = await collectionRef.limit(500).get();
    if (snapshot.size === 0) return;

    const batch = db.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    // Ricorsione per cancellare il resto
    await deleteCollection(collectionPath);
}

// Funzione principale per generare i dati
async function generateTestData() {
    console.log('🔥 Inizio generazione dati di test...');

    // --- 1. Pulizia delle collezioni esistenti ---
    console.log('🧹 Pulizia collezioni esistenti...');
    await Promise.all([
        deleteCollection('users'),
        deleteCollection('cantieri'),
        deleteCollection('assegnazioniCantieri'),
        deleteCollection('reports'),
        deleteCollection('reportTecnico'),
    ]);
    console.log('✅ Collezioni pulite.');

    // --- 2. Creazione Utenti ---
    console.log('👤 Creazione utenti...');
    const users = [];
    const createUsers = async (count, ruolo) => {
        for (let i = 0; i < count; i++) {
            const nome = faker.person.firstName();
            const cognome = faker.person.lastName();
            const userRef = db.collection('users').doc();
            const userData = { id: userRef.id, nome, cognome, ruolo };
            await userRef.set(userData);
            users.push(userData);
        }
    };
    await createUsers(NUM_PREPOSTI, 'preposto');
    await createUsers(NUM_OPERAI, 'operaio');
    await createUsers(NUM_TECNICI, 'tecnico');
    console.log(`✅ Creati ${users.length} utenti.`);

    // --- 3. Creazione Cantieri ---
    console.log('🏗️  Creazione cantieri...');
    const cantieri = [];
    for (let i = 0; i < NUM_CANTIERI; i++) {
        const cantiereRef = db.collection('cantieri').doc();
        const cantiereData = {
            id: cantiereRef.id,
            nomeCantiere: `Cantiere ${faker.location.city()}`,
            stato: 'attivo',
            companyID: 'AZIENDA_TEST_ID' // Usa un ID azienda fittizio o reale
        };
        await cantiereRef.set(cantiereData);
        cantieri.push(cantiereData);
    }
    console.log(`✅ Creati ${cantieri.length} cantieri.`);

    // --- 4. Creazione Assegnazioni Cantieri ---
    console.log('👷‍♂️ Creazione assegnazioni cantieri...');
    const preposti = users.filter(u => u.ruolo === 'preposto');
    const operai = users.filter(u => u.ruolo === 'operaio');
    for (const cantiere of cantieri) {
        const prepostoCasuale = faker.helpers.arrayElement(preposti);
        const teamOperai = faker.helpers.arrayElements(operai, faker.number.int({ min: 2, max: 4 }));
        
        const assegnazioneRef = db.collection('assegnazioniCantieri').doc();
        await assegnazioneRef.set({
            id: assegnazioneRef.id,
            cantiereId: cantiere.id,
            prepostoId: prepostoCasuale.id,
            operaiIds: teamOperai.map(o => o.id),
            teamMemberIds: [prepostoCasuale.id, ...teamOperai.map(o => o.id)],
            companyID: 'AZIENDA_TEST_ID'
        });
    }
    console.log(`✅ Create assegnazioni per tutti i cantieri.`);

    // --- 5. Creazione Reports e Ispezioni ---
    console.log('📝 Creazione reports e ispezioni...');
    const tecnici = users.filter(u => u.ruolo === 'tecnico');
    for (const cantiere of cantieri) {
        // Report di Inizio Lavoro
        const dataInizio = faker.date.recent({ days: 30 });
        await db.collection('reports').add({
            cantiereId: cantiere.id,
            tipologia: 'Inizio Lavoro',
            createdAt: dataInizio,
            userId: faker.helpers.arrayElement(users).id,
            companyID: 'AZIENDA_TEST_ID'
        });

        // Report intermedi
        for (let i = 0; i < REPORTS_PER_CANTIERE; i++) {
            await db.collection('reports').add({
                cantiereId: cantiere.id,
                tipologia: 'Lavoro',
                createdAt: faker.date.between({ from: dataInizio, to: new Date() }),
                userId: faker.helpers.arrayElement(users).id,
                companyID: 'AZIENDA_TEST_ID'
            });
        }
        
        // Report di Fine Lavoro (per alcuni cantieri)
        if (faker.datatype.boolean()) {
            await db.collection('reports').add({
                cantiereId: cantiere.id,
                tipologia: 'Fine Lavoro',
                chiusuraLavori: true,
                createdAt: new Date(),
                userId: faker.helpers.arrayElement(users).id,
                companyID: 'AZIENDA_TEST_ID'
            });
        }

        // Ispezioni dei tecnici
        for (let i = 0; i < ISPEZIONI_PER_CANTIERE; i++) {
            await db.collection('reportTecnico').add({
                cantiereId: cantiere.id,
                tipologia: 'Ispezione Periodica',
                note: faker.lorem.sentence(),
                createdAt: faker.date.between({ from: dataInizio, to: new Date() }),
                userId: faker.helpers.arrayElement(tecnici).id,
                companyID: 'AZIENDA_TEST_ID'
            });
        }
    }
    console.log(`✅ Creati report e ispezioni.`);
    console.log('🎉 Dati di test generati con successo!');
}

// Esecuzione dello script
generateTestData().catch(console.error);