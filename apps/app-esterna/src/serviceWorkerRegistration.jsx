// Questo file è un'astrazione del service worker.
// Invece di interagire direttamente con l'API del service worker,
// puoi usare questo file per registrare il service worker e gestire gli eventi.

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
    // [::1] è l'indirizzo IPv6 di localhost.
    window.location.hostname === '[::1]' ||
    // 127.0.0.0/8 è considerato un intervallo di localhost per IPv4.
    window.location.hostname.match(
      /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
    )
);

export function register(config) {
  if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
    // L'URL del service worker è ospitato dalla stessa origine del tuo codice.
    // Questo significa che non devi preoccuparti di problemi di CORS.
    const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);
    if (publicUrl.origin !== window.location.origin) {
      // Il nostro service worker non funzionerà se PUBLIC_URL è su un'origine diversa
      // da quella da cui viene servita la pagina. Questo accade quando un CDN viene utilizzato per
      // servire gli asset. Vedi https://github.com/facebook/create-react-app/issues/2374
      return;
    }

    window.addEventListener('load', () => {
      // Modifica il nome del file da cercare per la registrazione.
      const swUrl = `${process.env.PUBLIC_URL}/firebase-messaging-sw.js`;

      if (isLocalhost) {
        // Questo è in esecuzione su localhost. Controlliamo se un service worker esiste ancora.
        checkValidServiceWorker(swUrl, config);

        // Aggiungi un po' di logging aggiuntivo a localhost, in modo che gli sviluppatori possano
        // vedere cosa sta succedendo.
        navigator.serviceWorker.ready.then(() => {
          console.log(
            'Questo service worker sta servendo gli asset dal cache durante lo sviluppo locale.'
          );
        });
      } else {
        // Non su localhost, registra il service worker di produzione
        registerValidSW(swUrl, config);
      }
    });
  }
}

function registerValidSW(swUrl, config) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // A questo punto, i contenuti precached sono stati aggiornati,
              // ma il service worker precedente servirà ancora i contenuti più vecchi
              // fino a quando tutte le schede del client non saranno chiuse.
              console.log(
                'Nuovi contenuti sono disponibili e verranno utilizzati quando tutte le schede per questa pagina saranno chiuse.'
              );

              // Esegui la callback
              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              // A questo punto, tutti i contenuti sono stati precached.
              // È il momento perfetto per visualizzare un messaggio "Content is cached for offline use".
              console.log('Il contenuto è stato memorizzato nella cache per l\'uso offline.');

              // Esegui la callback
              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error('Errore durante la registrazione del service worker:', error);
    });
}

function checkValidServiceWorker(swUrl, config) {
  // Controlla se il service worker può essere trovato. Se non può, ricarica la pagina.
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      // Assicurati che il service worker esista e che non stiamo ottenendo un HTML page.
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        // Nessun service worker trovato. Probabilmente un'app diversa. Ricarica la pagina.
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        // Service worker trovato. Procedi normalmente.
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log(
        'Nessuna connessione internet trovata. L\'app è in modalità offline.'
      );
    });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}
