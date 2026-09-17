/**
 * @fileoverview Contiene le funzioni per standardizzare i dati letti/scritti da Firestore.
 */

import { 
    companySchema, userSchema, clientSchema, attrezzaturaSchema, 
    assegnazioneSchema, // Disattivato
    archivioAttrezzaturaSchema, // Disattivato
    cantiereSchema, 
    subcantiereSchema, 
    assegnazioneCantiereSchema, // Questo è un hook, non un parser
    reportSchema, 
    reportTecnicoSchema, formAziendaSchema, formSchema, documentoSchema, 
    eventoSchema,
    notificaSchema,
    materialeSchema,
    notaOperativaSchema,
    offertaSchema,
    programmazioneSchema,
    catalogoRisorseSchema
} from './schemas.js';

/**
 * Funzione generica per parsare dati DA Firestore.
 * Applica lo schema di default ai dati in entrata e converte i Timestamp in oggetti Date.
 */
function parseFromFirestore(firestoreData, schema) {
    const mergedData = { ...schema, ...firestoreData };

    for (const key in mergedData) {
        // 1. Converte i Timestamp (logica esistente)
        if (mergedData[key]?.toDate instanceof Function) {
            mergedData[key] = mergedData[key].toDate();
        }
        
        // --- ✅ INIZIO CORREZIONE ---
        // 2. Pulisce TUTTE le stringhe
        // Questo rimuove spazi bianchi e "a capo" (come '\n')
        // all'inizio o alla fine di qualsiasi campo stringa.
        if (typeof mergedData[key] === 'string') {
            mergedData[key] = mergedData[key].trim();
        }
        // --- FINE CORREZIONE ---
    }
    
    return mergedData;
}

/**
 * Funzione generica per formattare dati PER Firestore (pulizia per la scrittura).
 */
export const formatForFirestore = (localData, schema) => {
    const dataToWrite = {};
    const validKeys = Object.keys(schema);

    for (const key of validKeys) {
        if (localData[key] !== undefined) {
             dataToWrite[key] = localData[key];
        }
    }
    
    // Rimuove i campi con valore undefined o null
    for (const key in dataToWrite) {
        if (dataToWrite[key] === undefined || dataToWrite[key] === null) {
             delete dataToWrite[key];
        }
    }
    return dataToWrite;
};


// --- Esportazioni delle Funzioni di Parsing ---

export const parseCompany = (data) => parseFromFirestore(data, companySchema);
export const parseUser = (data) => parseFromFirestore(data, userSchema);
export const parseClient = (data) => parseFromFirestore(data, clientSchema);
export const parseAttrezzatura = (data) => parseFromFirestore(data, attrezzaturaSchema);
export const parseCantiere = (data) => parseFromFirestore(data, cantiereSchema);
export const parseSubcantiere = (data) => parseFromFirestore(data, subcantiereSchema);
export const parseReport = (data) => parseFromFirestore(data, reportSchema);
export const parseReportTecnico = (data) => parseFromFirestore(data, reportTecnicoSchema);


/**
 * Parser specifico per la collezione 'forms'. 
 * Imposta 'nome' utilizzando l'ID del documento se non è definito esplicitamente nel documento.
 * Questo è cruciale per la visualizzazione nei menu a tendina.
 */
export const parseForm = (data) => {
    // 1. Applica lo schema e converte i Timestamp (tramite la funzione generica)
    const parsedData = parseFromFirestore(data, formSchema);
    
    // 2. CORREZIONE 1 (CRITICA): Assicura che 'nome' e 'id' siano sempre presenti
    // e correttamente impostati con l'ID del documento ('Prova preventivi').
    // Sovrascriviamo l'id e il nome per garantire che non vengano annullati dallo schema.
    parsedData.id = data.id; // Forza l'ID del documento Firestore
    parsedData.nome = parsedData.nome || data.id; // Forza l'ID come nome di fallback
    
    // 3. CORREZIONE 2: Allinea il nome del campo di autorizzazione.
    // L'UI si aspetta 'authorizedCompanyIds', ma la collezione /forms usa 'allowedCompanyIds'.
    // Usiamo il dato originale per l'allineamento.

    if (data.allowedCompanyIds) {
        // Usa il dato grezzo di Firestore (data.allowedCompanyIds)
        parsedData.authorizedCompanyIds = data.allowedCompanyIds;
    } else if (parsedData.authorizedCompanyIds === undefined) {
        // Se non è stato trovato nessuno dei due campi, inizializza a un array vuoto
        parsedData.authorizedCompanyIds = [];
    }
    
    // Rimuovi il campo originale per pulizia e coerenza (se esiste nel parsedData)
    delete parsedData.allowedCompanyIds; 
    
    return parsedData;
};


export const parseNotifica = (data) => parseFromFirestore(data, notificaSchema);
export const parseDocumento = (data) => parseFromFirestore(data, documentoSchema);
export const parseEvento = (data) => parseFromFirestore(data, eventoSchema);
export const parseAssegnazione = (data) => parseFromFirestore(data, assegnazioneSchema);
export const parseArchivioAttrezzatura = (data) => parseFromFirestore(data, archivioAttrezzaturaSchema);
export const parseAssegnazioneCantiere = (data) => parseFromFirestore(data, assegnazioneCantiereSchema);
export const parseMateriale = (data) => parseFromFirestore(data, materialeSchema);
export const parseRapportinoTemplate = (data) => parseFromFirestore(data, reportSchema);


// Parser specifico per formAzienda
export const parseFormAzienda = (data) => {
    // 1. Applica lo schema e converte i Timestamp (se necessario, altrimenti solo 'id' e campi semplici)
    const parsedData = parseFromFirestore(data, formAziendaSchema);

    // 2. CAMPi cruciali per la logica di filtraggio
    return {
        id: parsedData.id,
        // Usiamo authorizedCompanyIds come visto nel tuo screenshot di Firestore
        authorizedCompanyIds: parsedData.authorizedCompanyIds || [], 
        formId: parsedData.formId || null, 
    };
};

// Esportazione della funzione generica di parsing, se serve altrove
export { parseFromFirestore };
export const parseOfferta = (data) => parseFromFirestore(data, offertaSchema);

export const parseNotaOperativa = (data) => {
    const nota = { ...notaOperativaSchema, ...data };
    if (nota.createdAt && typeof nota.createdAt.toDate === 'function') {
        nota.createdAt = nota.createdAt.toDate();
    }
    return nota;
};
//export const parseFasiCantiere = (data) => parseFromFirestore(data, fasiCantiereSchema);

export const parseProgrammazione = (data) => parseFromFirestore(data, programmazioneSchema);

export const parseFattura = (data) => {
    if (!data) return null;

    return {
        ...data,
        // Converti i Timestamp di Firestore in oggetti Date nativi per evitare errori in React
        dataEmissione: data.dataEmissione && data.dataEmissione.toDate ? data.dataEmissione.toDate() : (data.dataEmissione ? new Date(data.dataEmissione) : null),
        scadenzaPagamento: data.scadenzaPagamento && data.scadenzaPagamento.toDate ? data.scadenzaPagamento.toDate() : (data.scadenzaPagamento ? new Date(data.scadenzaPagamento) : null),
        createdAt: data.createdAt && data.createdAt.toDate ? data.createdAt.toDate() : null,
        updatedAt: data.updatedAt && data.updatedAt.toDate ? data.updatedAt.toDate() : null,
        
        // Assicuriamoci che i totali siano numeri
        imponibile: Number(data.imponibile || 0),
        importoIva: Number(data.importoIva || 0),
        totaleDocumento: Number(data.totaleDocumento || 0),
        
        // Assicuriamoci che le righe siano un array
        righe: Array.isArray(data.righe) ? data.righe : []
    };
};

export const parseCatalogoRisorse = (data) => parseFromFirestore(data, catalogoRisorseSchema);

// ✅ Parser Generico (utile per Fornitori e Fatture Acquisto)
export const parseGeneric = (data) => {
    if (!data) return null;
    // Converte eventuali timestamp in date leggibili, se ci sono
    const parsed = { ...data };
    if (parsed.createdAt?.toDate) parsed.createdAt = parsed.createdAt.toDate();
    if (parsed.updatedAt?.toDate) parsed.updatedAt = parsed.updatedAt.toDate();
    // Per le fatture acquisto
    if (parsed.dataFattura?.toDate) parsed.dataFattura = parsed.dataFattura.toDate();
    if (parsed.dataScadenza?.toDate) parsed.dataScadenza = parsed.dataScadenza.toDate();
    
    return parsed;
};