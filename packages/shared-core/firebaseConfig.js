import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// ✅ 1. AGGIUNGI QUESTI IMPORT SPECIFICI PER FIRESTORE
import { initializeFirestore, memoryLocalCache } from "firebase/firestore";
import { getStorage } from "firebase/storage";

console.log("🔥 MODULO firebaseConfig.jsx INIZIALIZZATO");

// La tua configurazione Firebase (invariata)
const firebaseConfig = {
    apiKey: "AIzaSyB7a9XJGE8P4k4ZRdoqFtfin6ktHUmeKGo",
    authDomain: "gestione-cantieri-cloud.firebaseapp.com",
    projectId: "gestione-cantieri-cloud",
    storageBucket: "gestione-cantieri-cloud.firebasestorage.app", 
    messagingSenderId: "718930172906",
    appId: "1:718930172906:web:79eb8d3ec92c3cb5493093",
    measurementId: "G-RRLJPR9W6G"
};

// Inizializza Firebase (invariato)
const app = initializeApp(firebaseConfig);

// Inizializza gli altri servizi (invariato)
const auth = getAuth(app);
const storage = getStorage(app);

// ✅ 2. MODIFICA: Inizializza Firestore con la cache in memoria per il debug
// Questo disabilita il salvataggio offline e forza errori reali a emergere.
const db = initializeFirestore(app, {
  localCache: memoryLocalCache()
});

// Esporta gli oggetti per usarli altrove (invariato)
export { auth, db, app, storage };