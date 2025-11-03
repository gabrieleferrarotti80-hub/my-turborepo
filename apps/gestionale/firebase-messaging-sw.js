// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js');

// La tua configurazione Firebase. Sostituisci con le tue chiavi.
const firebaseConfig = {
  apiKey: "AIzaSyB7a9XJGE8P4k4ZRdoqFtfin6ktHUmeKGo",
  authDomain: "gestione-cantieri-cloud.firebaseapp.com",
  projectId: "gestione-cantieri-cloud",
  storageBucket: "gestione-cantieri-cloud.firebasestorage.app",
  messagingSenderId: "718930172906",
  appId: "1:718930172906:web:ba7f28666bfc2cfe493093",
  measurementId: "G-9F9M6M21M9"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();