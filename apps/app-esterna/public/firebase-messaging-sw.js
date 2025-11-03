importScripts('https://www.gstatic.com/firebasejs/11.6.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.6.1/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyB7a9XJGE8P4k4ZRdoqFtfin6ktHUmeKGo",
  authDomain: "gestione-cantieri-cloud.firebaseapp.com",
  projectId: "gestione-cantieri-cloud",
  storageBucket: "gestione-cantieri-cloud.firebasestorage.app",
  messagingSenderId: "718930172906",
  appId: "1:718930172906:web:ba7f28666bfc2cfe493093",
  measurementId: "G-9F9M6M21M9"
};

// Inizializza l'app di Firebase in background
firebase.initializeApp(firebaseConfig);

// Recupera l'istanza di Firebase Messaging
const messaging = firebase.messaging();

// Gestisce i messaggi di background (quando l'app non è in primo piano)
messaging.onBackgroundMessage((payload) => {
    console.log('Messaggio in background ricevuto:', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/firebase-logo.png', // Sostituisci con l'icona della tua app
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
