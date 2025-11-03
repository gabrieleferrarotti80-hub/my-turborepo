// --- 1. IMPORT UNIFICATI ---
const { onDocumentUpdated, onDocumentCreated } = require("firebase-functions/v2/firestore");
const { logger } = require("firebase-functions/v2");
const admin = require("firebase-admin");
// Import AGGIUNTO per la nuova funzione schedulata
const { onSchedule } = require("firebase-functions/v2/scheduler");

// --- 2. INIZIALIZZAZIONE UNIFICATA ---
admin.initializeApp();

// Definiamo 'db' e 'Timestamp' una sola volta per tutte le funzioni
const db = admin.firestore();
const Timestamp = admin.firestore.Timestamp;

// --- 3. LE TUE FUNZIONI ESISTENTI (leggermente modificate per usare 'db') ---

/**
 * (Funzione Esistente 1)
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

    // Modifica: usa la variabile 'db' definita sopra
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
 * (Funzione Esistente 2)
 * Funzione vecchia, disabilitata.
 */
exports.inviaNotificaAssegnazioneVecchia = onDocumentUpdated("magazzino/{articoloId}", async (event) => {
    logger.log("Trigger vecchio disabilitato.");
    return null;
});

/**
 * (Funzione Esistente 3)
 * Sincronizza lo stato 'in uso' da 'assegnazioniMagazzino' a 'magazzino'
 */
exports.syncMagazzinoStatus = onDocumentUpdated("assegnazioniMagazzino/{assegnazioneId}", async (event) => {
    const afterData = event.data.after.data();
    const beforeData = event.data.before.data();

    if (beforeData.statoAssegnazione === 'da confermare' && afterData.statoAssegnazione === 'in uso') {
        logger.log("Trigger 'syncMagazzinoStatus' attivato.");
        const articoloId = afterData.articoloId;
        
        // Modifica: usa la variabile 'db' definita sopra
        const magazzinoRef = db.collection('magazzino').doc(articoloId);

        try {
            // Modifica: usa la variabile 'db' definita sopra
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


// --- 4. NUOVA FUNZIONE SCHEDULATA (Aggiunta) ---

/**
 * (Funzione Nuova)
 * Esegue ogni giorno alle 23:59 (fuso orario italiano) per chiudere
 * le timbrature "lavoro" rimaste aperte (timestampFine === null).
 */
exports.chiusuraAutomaticaPresenze = onSchedule(
  // Cron Tab: "alle 23:59, ogni giorno, ogni mese, ogni giorno della settimana"
  {
    schedule: "59 23 * * *", 
    timeZone: "Europe/Rome", // Fuso orario italiano
  },
  async (event) => {
    logger.log("--- 🚀 Esecuzione Chiusura Automatica Presenze ---");

    try {
      // 1. Definisci l'intervallo di oggi (da 00:00 a 23:59)
      const now = new Date();
      const inizioGiorno = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const fineGiorno = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 0);

      const tsInizioGiorno = Timestamp.fromDate(inizioGiorno);
      const tsFineGiorno = Timestamp.fromDate(fineGiorno);

      logger.log(`Intervallo di ricerca: da ${inizioGiorno.toISOString()} a ${fineGiorno.toISOString()}`);

      // 2. Query: Trova le timbrature "lavoro" aperte di oggi
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

      // 3. Aggiornamento: Usa un Batch
      const batch = db.batch();

      snapshot.docs.forEach((doc) => {
        logger.log(`Chiusura documento: ${doc.id} (Utente: ${doc.data().userId})`);
        
        // Calcola il timestampFine (ore 23:59 del giorno di inizio)
        const inizioTimestamp = doc.data().timestampInizio.toDate();
        const fineTimestamp = new Date(inizioTimestamp);
        fineTimestamp.setHours(23, 59, 0, 0);
        
        const docRef = db.collection("presenze").doc(doc.id);
        batch.update(docRef, {
          timestampFine: Timestamp.fromDate(fineTimestamp),
          chiusuraAutomatica: true, // Flag per il colore verde!
        });
      });

      // 4. Esegui l'aggiornamento
      await batch.commit();

      logger.log(`--- ✅ Chiusura Automatica Completata. ${snapshot.size} documenti aggiornati. ---`);
      return null;

    } catch (error) {
      logger.error("--- ❌ ERRORE durante la chiusura automatica ---", error);
      return null;
    }
  }
);