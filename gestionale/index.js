// Importa le funzioni di Firebase (sintassi V2)
const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { setGlobalOptions } = require("firebase-functions/v2");

// Import standard (convertiti da ES Modules a CommonJS)
const path = require('path');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const admin = require('firebase-admin');
const { ImageAnnotatorClient } = require('@google-cloud/vision');

// --- CONFIGURAZIONE ---

// Carica le chiavi dalla directory locale della funzione
const firebaseServiceAccount = require('./serviceAccountKey.json');
const visionKey = require('./google-vision-key.json');

// Inizializzazione di Firebase
admin.initializeApp({
  credential: admin.credential.cert(firebaseServiceAccount)
});

// Inizializzazione Google Vision
const visionClient = new ImageAnnotatorClient({
  credentials: {
    client_email: visionKey.client_email,
    private_key: visionKey.private_key,
  }
});

// Inizializzazione servizi Firebase Admin
const db = admin.firestore();
const auth = admin.auth();

// Inizializzazione App Express
const app = express();

// Middleware
app.use(cors({ origin: true })); // 'origin: true' è fondamentale per Cloud Functions
app.use(express.json({ limit: '50mb' }));

// ======================================================
//  ENDPOINT API (Dal tuo server.js)
// ======================================================

// --- ENDPOINT PER LA CREAZIONE DI AZIENDA E UTENTE (FIREBASE) ---
app.post('/createUserAndCompany', async (req, res) => {
    const { companyData, userData } = req.body;
    console.log('🚀 /createUserAndCompany: Dati ricevuti', { companyData, userData });

    try {
        const userRecord = await auth.createUser({
            email: userData.email,
            password: userData.password,
            displayName: `${userData.nome} ${userData.cognome}`,
        });
        
        const companyDocRef = await db.collection('companies').add({
            ...companyData,
            ownerId: userRecord.uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            enabledFeatures: {}
        });

        const companyID = companyDocRef.id;
        await companyDocRef.update({ companyID });

        await db.collection('users').doc(userRecord.uid).set({
            nome: userData.nome,
            cognome: userData.cognome,
            email: userData.email,
            ruolo: 'titolare-azienda',
            companyID: companyID,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.status(201).json({ success: true, message: 'Azienda e titolare creati con successo!' });

    } catch (error) {
        console.error("--- [ERROR] /createUserAndCompany ---", error);
        const userMessage = error.code === 'auth/email-already-exists' 
            ? 'Questa email è già stata registrata.' 
            : 'Si è verificato un errore sul server.';
        res.status(400).json({ success: false, message: userMessage });
    }
});

// --- ENDPOINT PER LA CREAZIONE DI UN NUOVO DIPENDENTE ---
app.post('/createEmployee', async (req, res) => {
    const { employeeData, companyID } = req.body;
    console.log('🚀 /createEmployee: Dati ricevuti', { employeeData, companyID });

    if (!employeeData || !companyID) {
        return res.status(400).json({ success: false, message: 'Dati mancanti per la creazione del dipendente.' });
    }

    try {
        const userRecord = await auth.createUser({
            email: employeeData.email,
            password: employeeData.password,
            displayName: `${employeeData.nome} ${employeeData.cognome}`,
        });
        
        await db.collection('users').doc(userRecord.uid).set({
            nome: employeeData.nome,
            cognome: employeeData.cognome,
            email: employeeData.email,
            ruolo: employeeData.ruolo || 'dipendente',
            companyID: companyID,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        console.log(`✅ Dipendente creato con successo con UID: ${userRecord.uid}`);
        res.status(201).json({ success: true, message: 'Dipendente creato con successo!' });

    } catch (error) {
        console.error("--- [ERROR] /createEmployee ---", error);
        const userMessage = error.code === 'auth/email-already-exists' 
            ? 'Questa email è già in uso.' 
            : 'Si è verificato un errore sul server.';
        res.status(400).json({ success: false, message: userMessage });
    }
});

// --- ENDPOINT PER L'IMPORTAZIONE MASSIVA DI DIPENDENTI ---
app.post('/importEmployeesBatch', async (req, res) => {
    const { personnelData } = req.body;
    console.log(`🚀 /importEmployeesBatch: Ricevuti ${personnelData.length} record da importare.`);

    if (!personnelData || personnelData.length === 0) {
        return res.status(400).json({ success: false, message: "Nessun dato da importare." });
    }

    let successfulImports = 0;
    let failedImports = 0;
    const errors = [];

    const importPromises = personnelData.map(async (person) => {
        try {
            if (!person.email || !person.password || !person.companyID) {
                throw new Error(`Dati incompleti per ${person.email || 'utente sconosciuto'}.`);
            }

            const userRecord = await auth.createUser({
                email: person.email,
                password: person.password,
                displayName: `${person.nome || ''} ${person.cognome || ''}`,
            });

            const { password, ...dataToSave } = person;
            await db.collection('users').doc(userRecord.uid).set({
                id: userRecord.uid,
                ...dataToSave,
                ruolo: person.ruolo || 'operaio',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            successfulImports++;
        } catch (error) {
            errors.push(`${person.email || 'Riga Incompleta'}: ${error.message}`);
            failedImports++;
        }
    });

    await Promise.all(importPromises);

    if (failedImports > 0) {
        const finalMessage = `Importazione completata con ${successfulImports} successi e ${failedImports} fallimenti.`;
        return res.status(207).json({ success: false, message: finalMessage, errors });
    }

    res.status(201).json({ success: true, message: `Importati con successo ${successfulImports} dipendenti.` });
});


// --- ENDPOINT PER L'OCR DI PDF (GOOGLE VISION) ---
app.post('/api/ocr', async (req, res) => {
  try {
    const { pdfBytes } = req.body;
    console.log('🚀 /api/ocr: Ricevuta richiesta di elaborazione PDF.');
    
    if (!pdfBytes || !Array.isArray(pdfBytes)) {
      return res.status(400).json({ error: 'Dati PDF non validi.' });
    }

    const request = {
      requests: [{
        features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
        inputConfig: {
          mimeType: 'application/pdf',
          content: Buffer.from(pdfBytes),
        },
      }],
    };

    const [result] = await visionClient.batchAnnotateFiles(request);
    const ocrResponse = result.responses[0];
    res.json(ocrResponse);

  } catch (error) {
    console.error('--- [ERROR] /api/ocr ---', error);
    res.status(500).json({ error: 'Errore durante l\'elaborazione del PDF' });
  }
});


// ======================================================
//  NUOVA FUNZIONE SCHEDULATA (CRON JOB)
// ======================================================

/**
 * Esegue ogni notte alle 2:00 (fuso orario UTC).
 * Cerca tutte le timbrature rimaste 'in lavoro' dal giorno prima
 * e le chiude automaticamente dopo 8 ore.
 */
exports.timbraturaAutomatica = onSchedule("every day 02:00", async (event) => {
    console.log("🚀 Esecuzione Cron Job: Chiusura timbrature dimenticate.");
    
    // 1. Definisci un limite di tempo (es. 12 ore fa)
    const now = new Date();
    // Cerca timbrature iniziate più di 12 ore fa
    const cutoff = new Date(now.getTime() - (12 * 60 * 60 * 1000)); 
    const cutoffTimestamp = admin.firestore.Timestamp.fromDate(cutoff);

    // 2. Trova tutte le presenze in stato 'lavoro'
    const presenzeRef = db.collection('presenze');
    const q = presenzeRef
        .where('stato', '==', 'lavoro') 
        .where('timestampInizio', '<=', cutoffTimestamp);
        
    const snapshot = await q.get();

    if (snapshot.empty) {
        console.log("✅ Nessuna timbratura dimenticata trovata.");
        return null;
    }

    console.log(`🔥 Trovate ${snapshot.size} timbrature da chiudere...`);
    const batch = db.batch();

    snapshot.forEach(doc => {
        const timbratura = doc.data();
        
        // Calcola una data di fine "sicura" (es. 8 ore dopo l'inizio)
        const inizio = timbratura.timestampInizio.toDate();
        const fineStimata = new Date(inizio.getTime() + (8 * 60 * 60 * 1000)); // 8 ore
        
        const timbraturaRef = doc.ref;
        batch.update(timbraturaRef, {
            stato: 'pausa', // O 'completato', a seconda della tua logica
            timestampFine: admin.firestore.Timestamp.fromDate(fineStimata),
            note: 'Chiusura automatica per timbratura dimenticata.'
        });
    });

    // 3. Esegui il batch
    await batch.commit();
    console.log(`✅ ${snapshot.size} timbrature chiuse automaticamente.`);
    return null;
});


// ======================================================
//  ESPORTAZIONE FINALE
// ======================================================

// Imposta la regione per tutte le funzioni in questo file
setGlobalOptions({ region: "europe-west1" });

// Esporta l'app Express (che contiene /createUser, /api/ocr, ecc.)
exports.api = onRequest(app);

// 'timbraturaAutomatica' è già esportata con il suo nome