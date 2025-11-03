/**
 * @fileoverview Contiene le funzioni di validazione centralizzate.
 */
import { clientSchema, companySchema, attrezzaturaSchema } from './schemas.js';

// ✅ NUOVA FUNZIONE SPECIFICA PER LA CREAZIONE MINIMA DI AZIENDA E TITOLARE
/**
 * Valida i dati minimi per la creazione di un'azienda e del suo titolare.
 * Rende obbligatori solo: nome azienda, nome, cognome ed email del titolare.
 * @param {object} companyData Dati dell'azienda (deve contenere 'ragioneSociale').
 * @param {object} userData Dati dell'utente titolare.
 */
export const validateCompanyAndOwnerCreation = (companyData, userData) => {
    // 1. Controllo Nome Azienda
    if (!companyData.ragioneSociale || companyData.companyName.trim().length < 2) {
        throw new Error("Il nome dell'azienda (Ragione Sociale) è obbligatorio.");
    }

    // 2. Controllo Nome Titolare
    if (!userData.nome || userData.nome.trim() === '') {
        throw new Error("Il nome del titolare è obbligatorio.");
    }

    // 3. Controllo Cognome Titolare
    if (!userData.cognome || userData.cognome.trim() === '') {
        throw new Error("Il cognome del titolare è obbligatorio.");
    }

    // 4. Controllo Email Titolare
    if (!userData.email || !userData.email.includes('@')) {
        throw new Error("L'email del titolare è obbligatoria e deve essere valida.");
    }
    
    // Se tutti i controlli passano, la funzione termina senza errori.
};


/**
 * Valida i dati COMPLETI per la creazione o modifica di un'azienda.
 * @param {object} data - Dati dell'azienda da un form.
 */
export const validateCompanySchema = (data) => {
    // Corretto: usa data.ragioneSociale per coerenza e per fixare il bug
    if (!data.ragioneSociale || data.ragioneSociale.trim().length < 2) {
        throw new Error("La Ragione Sociale è obbligatoria.");
    }
    if (!data.partitaIva || data.partitaIva.trim().length === 0) {
        throw new Error("La Partita IVA è obbligatoria.");
    }
    // Aggiungi altri controlli se necessario
};

/**
 * Valida i dati del form di un utente/personale.
 * @param {object} data - Dati dal form.
 */
export const validateUserFormSchema = (data) => {
    if (!data.nome || data.nome.trim().length === 0) {
        throw new Error("Il campo 'Nome' è obbligatorio.");
    }
    if (!data.cognome || data.cognome.trim().length === 0) {
        throw new Error("Il campo 'Cognome' è obbligatorIO.");
    }
     if (!data.email || !data.email.includes('@')) {
        throw new Error("È necessario un indirizzo email valido.");
    }

    // --- ❗ BLOCCO SPOSTATO QUI (DENTRO LA FUNZIONE) ---
    // Aggiungiamo la validazione per il ruolo
    if (!data.ruolo || data.ruolo.trim() === '') {
        throw new Error("È obbligatorio specificare un ruolo.");
    }
    // --- FINE SPOSTAMENTO ---

    // Assicurati che 'tecnico' sia in permissions.js!
    const ruoliPermessi = ['proprietario', 'titolare-azienda', 'amministrazione', 'preposto', 'tecnico', 'dipendente']; 
    
    if (!ruoliPermessi.includes(data.ruolo)) {
        throw new Error(`Il ruolo '${data.ruolo}' non è valido.`);
    }
};

/**
 * Valida i dati del form di un cliente.
 * @param {object} data - Dati dal form.
 */
export const validateClientSchema = (data) => {
    if (!data.tipoCliente) {
        throw new Error("È necessario specificare il tipo di cliente.");
    }
    if (data.tipoCliente === 'Azienda' && (!data.ragioneSociale || data.ragioneSociale.trim() === '')) {
        throw new Error("La Ragione Sociale è obbligatoria per i clienti di tipo Azienda.");
    }
    if (data.tipoCliente === 'Privato' && (!data.nome || data.nome.trim() === '')) {
        throw new Error("Il Nome è obbligatorio per i clienti di tipo Privato.");
    }
};


/**
 * --- Validatore Unico per Articoli (Attrezzatura & Materiale) ---
 * Valida i dati di un nuovo articolo, controllando i campi specifici in base a 'tipoArticolo'.
 * @param {object} data - Dati dell'articolo da un form.
 */
export const validateAttrezzaturaSchema = (data) => {
    if (!data.nome || data.nome.trim().length < 2) {
        throw new Error("Il campo 'Nome Articolo' è obbligatorio.");
    }
    if (!data.categoria) {
        throw new Error("Selezionare una categoria per l'articolo.");
    }

    if (data.tipoArticolo === 'attrezzatura') {
        if (!data.seriale || data.seriale.trim().length === 0) {
            throw new Error("Il campo 'Seriale' è obbligatorio per le attrezzature e deve essere unico.");
        }
        // Validazione dinamica specifica per Attrezzatura
        switch (data.categoria) {
            case 'Automezzo':
                if (!data.dettagli.targa || data.dettagli.targa.trim() === '') {
                    throw new Error("Il campo 'Targa' è obbligatorio per gli automezzi.");
                }
                break;
            case 'DPI':
                 if (!data.dettagli.dataScadenza) {
                    throw new Error("La 'Data di Scadenza' è obbligatoria per i DPI.");
                }
                break;
            default:
                break;
        }
    } else if (data.tipoArticolo === 'materiale') {
        // Logica di validazione per i materiali
        const quantita = parseFloat(data.quantita);
        if (isNaN(quantita) || quantita < 0) {
            throw new Error("Il campo 'Quantità' è obbligatorio e deve essere un numero non negativo.");
        }
        if (!data.unitaMisura) {
            throw new Error("È necessario specificare un'unità di misura per il materiale.");
        }
    } else {
        throw new Error("Il campo 'tipoArticolo' non è valido o mancante.");
    }
};

/**
 * Valida i dati per la creazione di una nuova assegnazione.
 * @param {object} data - Dati grezzi del form.
 */
export const validateNuovaAssegnazione = (data) => {
    if (!data.attrezzaturaID) {
        throw new Error("È necessario selezionare un'attrezzatura.");
    }
    if (!data.utenteID) {
        throw new Error("È necessario selezionare un dipendente.");
    }
};

/**
 * Valida i dati per la creazione di un nuovo documento.
 * @param {object} data - Dati dal form, deve contenere 'file'.
 */
export const validateDocumentoData = (data) => {
  if (!data.file) {
    throw new Error('Nessun file è stato selezionato. Per favore, importa un documento.');
  }
};
 
/**
 * Valida i dati per la creazione o modifica di un evento.
 * @param {object} data - Dati dal form dell'evento.
 */
export const validateEventoData = (data) => {
  if (!data.title || data.title.trim() === '') {
    throw new Error("Il titolo dell'evento è obbligatorio.");
  }
  if (!data.start) {
    throw new Error("La data di inizio dell'evento è obbligatoria.");
  }
};

