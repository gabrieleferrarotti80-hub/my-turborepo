/**
 * @fileoverview Fonte unica di verità per la struttura dei dati.
 */
import { Timestamp } from 'firebase/firestore';

// --- Schemi Riutilizzabili (invariati) ---
const addressSchema = {
    via: '',
    citta: '',
    cap: '',
};
const permessoSoggiornoSchema = {
    numero: '',
    dataScadenza: '',
};
const dettagliAttrezzaturaGenerica = {
    tipologia: '',
    marca: '',
    modello: '',
    dataAcquisto: '',
};
const dettagliAutomezzo = {
    marca: '',
    modello: '',
    targa: '',
    numeroTelaio: '',
    dataAcquisto: '',
    tagliandi: '',
    revisioni: '',
};
const dettagliDPI = {
    tipologia: '',
    marca: '',
    modello: '',
    dataAcquisto: '',
    dataScadenza: '',
};
export const offertaSchema = {
    // --- Dati Anagrafici ---
    nomeOfferta: '',
    clienteId: '',
    referenteClienteId: '', // ID del contatto specifico per questa offerta
    companyID: '',

    // --- Stato e Workflow ---
    stato: 'bozza', // Valori: 'bozza', 'analisi_preliminare', 'elaborazione', 'in_approvazione', 'revisione', 'inviata', 'accettata', 'rifiutata', 'archiviata'
    faseCorrente: 1, // Valori: 1 (Analisi), 2 (Elaborazione), 3 (Invio)

    // --- Dati delle Fasi ---
    datiAnalisi: {
        // Contiene i dati raccolti nel form "Analisi Preliminare"
        noteSopralluogo: '',
        documentiAnalisiUrls: [],
        // ... altri campi specifici dell'analisi
    },
    datiElaborazione: {
        // Contiene i dati raccolti nei form "Elaborazione" e "Analisi Costi"
        costiMateriali: 0,
        costiManodopera: 0,
        documentiTecniciUrls: [],
        // ... altri campi specifici
    },
    datiRevisione: {
        // Contiene i dati del form finale "Revisione e Invio"
        preventivoFinaleUrl: '',
        condizioniPagamento: '',
        dataInvio: null, // Sarà un Timestamp
    },

    // --- Riferimenti e Collegamenti ---
    evento_sopralluogo_id: null, // ID dell'evento in agenda
    evento_approvazione_id: null, // ID dell'evento per l'approvazione interna

    // --- Metadati ---
    createdBy: '',      // UID dell'utente che ha creato l'offerta
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
};

// --- SCHEMI COMPLETI RICOSTRUITI ---

/**
 * Schema per una singola azienda.
 */
export const companySchema = {
    companyName: '',
    companyPiva: '',
    companyCf: '',
    companyAddress: '',
    companyCity: '',
    companyProvince: '',
    companyZip: '',
    companyPhone: '',
    companyPec: '',
    companySdi: '',
    companyAdminEmail: '',
    createdAt: Timestamp.now(),
    companyID: '',
    ownerId: '',
};

/**
 * Schema per un utente (personale).
 */
export const userSchema = {
    nome: '',
    cognome: '',
    email: '',
    ruolo: '',
    companyID: null,
    createdAt: Timestamp.now(),
};

/**
 * Schema per un cliente.
 */
export const clientSchema = {
    nome: '',
    cognome: '',
    ragioneSociale: '',
    tipoCliente: '', // 'Privato' o 'Azienda'
    companyID: '',
    // ...altri campi anagrafici...
};

/**
 * Schema per un singolo pezzo di attrezzatura nel magazzino.
 */
export const attrezzaturaSchema = {
    nome: '',
    seriale: '', // Obbligatorio per Attrezzatura, Opzionale per Materiale
    tipoArticolo: 'attrezzatura', // NUOVO CAMPO: 'attrezzatura' o 'materiale'
    categoria: '', // es. 'Automezzo', 'DPI', 'Consumabile'
    stato: 'disponibile', // es. 'disponibile', 'in uso', 'in riparazione' (Non si applica ai materiali)
    quantita: 1, // NUOVO CAMPO: 1 per Attrezzatura, N > 1 per Materiale
    dettagli: {},
    companyID: '',
    createdAt: Timestamp.now(),
};

/**
 * Schema per un'assegnazione del magazzino.
 */
export const assegnazioneSchema = {
    attrezzaturaID: '',
    attrezzaturaNome: '',
    utenteID: '',
    utenteNome: '',
    companyID: '',
    dataAssegnazione: Timestamp.now(),
    statoWorkflow: 'da confermare', // es. 'da confermare', 'attiva', 'restituzione richiesta'
    storico: [],
};

/**
 * Schema per lo storico di un pezzo di attrezzatura.
 */
export const archivioAttrezzaturaSchema = {
    attrezzaturaID: '',
    companyID: '',
    eventi: [], // Array di oggetti evento
};

// --- SCHEMI PER LA GESTIONE OPERATIVA ---

/**
 * Schema per un singolo cantiere principale.
 */
export const cantiereSchema = {
    nomeCantiere: '',
    clienteId: '',
    nomeCliente: '', // Denormalizzato per facile accesso
    tipologiaCantiere: '',
    tipologiaAttivita: '',
    indirizzo: '',
    latitude: null,
    longitude: null,
    companyID: '',
    companyName: '', // Denormalizzato
    stato: 'attivo', // Valori: 'attivo', 'in pausa', 'completato'
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
};

/**
 * Schema per un sub-cantiere (fase di lavoro).
 */
export const subcantiereSchema = {
    nomeSubcantiere: '',
    descrizione: '',
    stato: 'attivo', // Valori: 'attivo', 'in pausa', 'completato'
    cantiereGenitoreId: '',
    companyID: '',
    createdAt: Timestamp.now(),
};

/**
 * Schema per l'assegnazione di una squadra a un cantiere.
 */
export const assegnazioneCantiereSchema = {
    cantiereId: '',
    nomeCantiere: '', // Denormalizzato

    // CAMPO UNIFICATO PER LA RICERCA VELOCE (un array di ID utente)
    teamMemberIds: [], // Es: ['uid_preposto', 'uid_operaio1', 'uid_titolare_se_serve']
    
    // CAMPO UNIFICATO PER I DETTAGLI (un array di oggetti)
    // Utile per visualizzare nomi e ruoli senza query aggiuntive.
    team: [], // Es: [{ userId: '...', nome: 'Mario Rossi', ruolo: 'preposto' }, { ... }]

    automezziIds: [],
    companyID: '',
    assegnatoDaId: '',
    dataAssegnazione: Timestamp.now(),
    stato: 'attiva',
};

/**
 * Schema per un singolo report/rapportino.
 */
export const reportSchema = {
    // --- Campi Comuni e Standardizzati ---
    cantiereId: '',
    userId: '',         // Standardizzato (sostituisce 'tecnicoId')
    companyID: '',      // Essenziale per multi-tenancy

    // --- Campi Unificati come da tua richiesta ---
    note: '',           // Standardizzato (sostituisce 'nota')
    fotoUrls: [],       // Mantenuto dall'app per le immagini
    videoUrls: [],      // Mantenuto dall'app per i video

    // --- Campi Concettualmente Importanti da Entrambi i Sistemi ---
    data: Timestamp.now(), // Standardizzato (sostituisce 'dataReport')
    stato: 'inviato',      // Aggiunto dall'app (es. 'inviato', 'letto', 'approvato')
    tipologia: '',         // Mantenuto dal gestionale (es. 'avanzamento lavori')
    
    // --- Posizione, standardizzata ---
    location: {
        latitude: null,
        longitude: null,
    },
};


export const reportTecnicoSchema = {
    cantiereId: '',
    cantiereName: '',
    companyID: '',
    data: Timestamp.now(),
    location: { latitude: 0, longitude: 0 },
    note: '',
    photoUrl: '',
    tecnicoName: '',
    userId: ''
};

export const formAziendaSchema = {
    nome: '',
    descrizione: '',
    campi: [], // Array di oggetti che definiscono i campi del form
    createdAt: Timestamp.now(),
    companyID: '',
};

export const documentoSchema = {
    nomeFile: '',         // Il nome originale del file caricato
    categoria: '',        // Es. 'sicurezza', 'qualita', etc.
    fileURL: '',          // L'URL pubblico dopo il caricamento su Firebase Storage
    storagePath: '',      // Il percorso interno su Storage, utile per l'eliminazione
    
    dataScadenza: null,   // Verrà salvato come Timestamp su Firestore
};

export const eventoSchema = {
    title: '',
    start: null, 
    end: null,   
    description: '',
    cantiereId: '',
       
    // --- CAMPI WORKFLOW (DA MODIFICARE) ---
    stato: 'da_confermare', // Valori: 'da_confermare', 'confermato', 'rifiutato', 'modifica_proposta'
    
    // ✅ NUOVO: Chi deve agire ora? 'organizzatore' o 'partecipanti'
    inAttesaDi: 'partecipanti', 
    
    // ✅ NUOVO: Oggetto per contenere le modifiche proposte (es. { start: ..., end: ... })
    datiProposti: null, // o {}
    
    // --- CAMPI ESISTENTI (INVARIATI) ---
    partecipanti: [], 
    storico: [],
    companyID: '',
    createdAt: null,
    formTemplateId: null,
    offertaId: null,
};

export const notificaSchema = {
    destinatarioId: '', // L'ID dell'utente che riceverà la notifica
    messaggio: '',      // Il testo della notifica
    tipo: '',           // Es. 'nuovo_evento', 'evento_modificato'
    riferimentoId: '',  // L'ID dell'evento a cui si riferisce (opzionale)
    letta: false,       // Per segnare la notifica come letta
    createdAt: null,
};
export const formSchema = {
 	id: '',
 	nome: '', // Campo atteso dalla tua tabella in AutorizzazioniFormView
 	descrizione: '', // Campo atteso dalla tua tabella
 	allowedCompanyIds: [], // Campo che esiste nel tuo documento Firestore
 	formStructure: {}, // Campo che esiste nel tuo documento Firestore
 	createdAt: null, // Campo timestamp che DEVE essere parsato
};
export const materialeSchema = {
    nome: '',                 // Es. "Viti autoperforanti 4.8x35"
    codice: '',               // Codice interno o del produttore (SKU)
    descrizione: '',          // Dettagli aggiuntivi
    categoria: '',            // Es. "Minuteria Metallica", "Sigillanti"
    quantita: 0,              // Quantità a magazzino
    unitaMisura: 'pz',        // 'pz', 'kg', 'm', 'L', 'scatola'
    fornitore: '',            // Nome del fornitore (opzionale)
    sogliaMinima: 0,          // Per notifiche di riordino (opzionale)
    
    // Campi per la tracciabilità
    companyId: '',            // ID dell'azienda proprietaria
    createdBy: '',            // UID dell'utente che ha aggiunto il materiale
    createdAt: Timestamp.now(), // Data di creazione
};

export const notaOperativaSchema = {
    id: '',
    note: '',
    photoUrls: [],
    geolocation: { latitude: null, longitude: null },
    createdAt: null,
    companyID: '',
    userID: '',
};