// --- 1. IMPORT UNIFICATI (FIREBASE FUNCTIONS V2) ---
const { onDocumentUpdated, onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, HttpsError } = require("firebase-functions/v2/https"); // Import per le funzioni chiamate dall'app
const { logger } = require("firebase-functions/v2");
const admin = require("firebase-admin");

// --- 2. INIZIALIZZAZIONE UNIFICATA ---
admin.initializeApp();

// Definiamo 'db' e 'Timestamp' una sola volta per tutte le funzioni
const db = admin.firestore();
const Timestamp = admin.firestore.Timestamp;


// --- 3. FUNZIONI FIRESTORE TRIGGER ---

/**
 * Si attiva quando viene creato un NUOVO documento 'assegnazioniMagazzino'
 */
exports.inviaNotificaNuovaAssegnazione = onDocumentCreated("assegnazioniMagazzino/{assegnazioneId}", async (event) => {
    logger.log("Trigger 'inviaNotificaNuovaAssegnazione' attivato.");
    const datiAssegnazione = event.data.data();

    const dipendenteId = datiAssegnazione.dipendenteId;
    const articoloNome = datiAssegnazione.nomeArticolo || datiAssegnazione.articolo?.nome || 'articolo sconosciuto';

    if (!dipendenteId) {
        logger.log("Dipendente ID mancante, nessuna notifica.");
        return null;
    }

    const userRef = db.collection("users").doc(dipendenteId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
        logger.log(`Dipendente ${dipendenteId} non trovato.`);
        return null;
    }

    const userData = userDoc.data();
    const fcmToken = userData.fcmToken;

    if (!fcmToken) {
        logger.log(`Nessun FCM Token per ${dipendenteId}.`);
        return null;
    }
    
    const payload = {
        notification: {
            title: "Nuova Attrezzatura Assegnata",
            body: `Ti è stato assegnato un nuovo articolo: ${articoloNome}`,
            click_action: "FLUTTER_NOTIFICATION_CLICK"
        },
        data: {
            assegnazioneId: datiAssegnazione.id || event.params.assegnazioneId,
        }
    };

    try {
        const response = await admin.messaging().sendToDevice(fcmToken, payload);
        logger.log("Notifica inviata:", response);
        return response;
    } catch (error) {
        logger.error("Errore invio notifica:", error);
        return error;
    }
});

/**
 * Funzione vecchia, disabilitata.
 */
exports.inviaNotificaAssegnazioneVecchia = onDocumentUpdated("magazzino/{articoloId}", async (event) => {
    logger.log("Trigger vecchio disabilitato.");
    return null;
});

/**
 * Sincronizza lo stato 'in uso' da 'assegnazioniMagazzino' a 'magazzino'
 */
exports.syncMagazzinoStatus = onDocumentUpdated("assegnazioniMagazzino/{assegnazioneId}", async (event) => {
    const afterData = event.data.after.data();
    const beforeData = event.data.before.data();

    if (beforeData.statoAssegnazione === 'da confermare' && afterData.statoAssegnazione === 'in uso') {
        logger.log("Trigger 'syncMagazzinoStatus' attivato.");
        const articoloId = afterData.articoloId;
        
        const magazzinoRef = db.collection('magazzino').doc(articoloId);

        try {
            await db.runTransaction(async (transaction) => {
                const magazzinoDoc = await transaction.get(magazzinoRef);
                if (!magazzinoDoc.exists) {
                    logger.error(`Articolo ${articoloId} non trovato in magazzino.`);
                    return;
                }
                transaction.update(magazzinoRef, { statoAssegnazione: 'in uso' });
                logger.log(`Stato articolo ${articoloId} aggiornato a 'in uso'.`);
            });
        } catch (error) {
            logger.error('Errore transazione syncMagazzinoStatus:', error);
        }
    }
    return null;
});


// --- 4. FUNZIONE SCHEDULATA ---

/**
 * Esegue ogni giorno alle 23:59 (fuso orario italiano) per chiudere
 * le timbrature "lavoro" rimaste aperte (timestampFine === null).
 */
exports.chiusuraAutomaticaPresenze = onSchedule(
  {
    schedule: "59 23 * * *", 
    timeZone: "Europe/Rome", // Fuso orario italiano
  },
  async (event) => {
    logger.log("--- 🚀 Esecuzione Chiusura Automatica Presenze ---");

    try {
      const now = new Date();
      const inizioGiorno = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const fineGiorno = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 0);

      const tsInizioGiorno = Timestamp.fromDate(inizioGiorno);
      const tsFineGiorno = Timestamp.fromDate(fineGiorno);

      logger.log(`Intervallo di ricerca: da ${inizioGiorno.toISOString()} a ${fineGiorno.toISOString()}`);

      const presenzeRef = db.collection("presenze");
      const snapshot = await presenzeRef
        .where("stato", "==",["lavoro", "pioggia"])
        .where("timestampFine", "==", null)
        .where("timestampInizio", ">=", tsInizioGiorno)
        .where("timestampInizio", "<=", tsFineGiorno)
        .get();

      if (snapshot.empty) {
        logger.log("Nessuna timbratura aperta trovata. Lavoro terminato.");
        return null;
      }

      logger.log(`Trovate ${snapshot.size} timbrature da chiudere.`);

      const batch = db.batch();

      snapshot.docs.forEach((doc) => {
        logger.log(`Chiusura documento: ${doc.id} (Utente: ${doc.data().userId})`);
        
        const inizioTimestamp = doc.data().timestampInizio.toDate();
        const fineTimestamp = new Date(inizioTimestamp);
        fineTimestamp.setHours(23, 59, 0, 0);
        
        const docRef = db.collection("presenze").doc(doc.id);
        batch.update(docRef, {
          timestampFine: Timestamp.fromDate(fineTimestamp),
          chiusuraAutomatica: true, 
        });
      });

      await batch.commit();
      logger.log(`--- ✅ Chiusura Automatica Completata. ${snapshot.size} documenti aggiornati. ---`);
      return null;

    } catch (error) {
      logger.error("--- ❌ ERRORE durante la chiusura automatica ---", error);
      return null;
    }
  }
);


// --- 5. GESTIONE CREDENZIALI (AUTH) DAL GESTIONALE ---

/**
 * Crea o aggiorna un utente in Firebase Authentication
 */
exports.manageUserAuth = onCall(async (request) => {
    const data = request.data;
    
    // Sicurezza: solo utenti loggati possono usare questa funzione
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Accesso negato. Devi essere autenticato.');
    }

    try {
        try {
            // 1. Cerca se l'account Firebase Auth esiste già per questa email
            const userRecord = await admin.auth().getUserByEmail(data.email);
            
            // 2. Se esiste e l'amministratore ha digitato una nuova password, la aggiorna
            if (data.password && data.password.length >= 6) {
                await admin.auth().updateUser(userRecord.uid, { password: data.password });
            }
            return { uid: userRecord.uid };
            
        } catch (e) {
            // 3. Se l'utente NON esiste, lo crea da zero
            if (e.code === 'auth/user-not-found') {
                if (!data.password) throw new HttpsError('invalid-argument', 'Password mancante per il nuovo utente.');
                
                const newUser = await admin.auth().createUser({
                    email: data.email,
                    password: data.password,
                    displayName: `${data.nome} ${data.cognome}`
                });
                return { uid: newUser.uid };
            }
            throw e;
        }
    } catch (error) {
        logger.error("Errore manageUserAuth:", error);
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Elimina definitivamente un utente da Firebase Authentication (Licenziamento/Dimissioni)
 * Convertito in sintassi V2: onCall(async (request) => {...})
 */
exports.deleteUserAuth = onCall(async (request) => {
    // Verifica che chi chiama sia loggato
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Devi essere loggato per eliminare un utente.');
    }

    const uidToDelete = request.data.uid;
    if (!uidToDelete) {
        throw new HttpsError('invalid-argument', 'UID utente mancante.');
    }

    try {
        await admin.auth().deleteUser(uidToDelete);
        logger.log(`Utente ${uidToDelete} eliminato con successo da Authentication.`);
        return { success: true, message: "Utente rimosso da Authentication." };
    } catch (error) {
        logger.error("Errore durante l'eliminazione da Auth:", error);
        throw new HttpsError('internal', "Impossibile eliminare l'utente da Firebase Auth.");
    }
});