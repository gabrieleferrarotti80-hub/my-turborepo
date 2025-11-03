// Percorso: apps/gestionale/src/backend/server.js
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { readFileSync } from 'fs';

// Import per Firebase Admin
import admin from 'firebase-admin';
// Import per Google Cloud Vision
import { ImageAnnotatorClient } from '@google-cloud/vision';

// --- CONFIGURAZIONE ---

// Chiave per Firebase Admin SDK
import firebaseServiceAccount from '../../../../firebase-serviceAccountKey.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const visionKeyPath = path.join(__dirname, 'google-vision-key.json');
const visionKey = JSON.parse(readFileSync(visionKeyPath));

// Inizializzazione di Firebase
admin.initializeApp({
  credential: admin.credential.cert(firebaseServiceAccount)
});

const visionClient = new ImageAnnotatorClient({
  credentials: {
    client_email: visionKey.client_email,
    private_key: visionKey.private_key,
  }
});

const db = admin.firestore();
const auth = admin.auth();
const app = express();
const PORT = 3002;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ======================================================
//  ENDPOINT
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
        
        // ✅ SOLUZIONE: Inizializziamo il campo 'enabledFeatures' come mappa vuota
        // al momento della creazione dell'azienda.
        const companyDocRef = await db.collection('companies').add({
            ...companyData,
            ownerId: userRecord.uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            enabledFeatures: {} // <-- QUESTA È LA RIGA CHE RISOLVE TUTTO
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

// --- AVVIO DEL SERVER ---
app.listen(PORT, () => {
  console.log(`🔥 Server unificato in ascolto su http://localhost:${PORT}`);
});