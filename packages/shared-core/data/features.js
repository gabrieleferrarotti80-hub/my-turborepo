// packages/shared-core/src/data/features.js (CORRETTO)

export const ALL_FEATURES = [
    { 
        id: 'agenda', 
        name: 'Agenda', 
        description: 'Accesso al calendario e gestione appuntamenti.' 
    },
    { 
        id: 'reports', 
        name: 'Reports', 
        description: 'Visualizzazione e creazione di report.' 
    },
    // ✅ Permesso per i Documenti
    { 
        id: 'documenti', 
        name: 'Documenti', 
        description: 'Accesso all\'archivio documenti e alla gestione dei file.' 
    },
    {
        id: 'offerte_management',
        name: 'Gestione Offerte',
        description: 'Abilita l\'accesso al modulo per la creazione e gestione delle offerte e delle gare.'
    },
    
    // 🌟 ECCO IL NUOVO BLOCCO PER I LISTINI (ERP AVANZATO) 🌟
    {
        id: 'listini_management',
        name: 'Listini e Prezziari (ERP Avanzato)',
        description: 'Abilita la banca dati centralizzata per l\'automazione di computi metrici e SAL.'
    },

    // Rimosse le vecchie voci 'magazzino' obsolete/duplicate.
    // ✅ 1. NUOVO PERMESSO: Inventario (CRUD di Attrezzature e Materiali)
    { 
        id: 'magazzino_inventario', 
        name: 'Magazzino: Inventario e Materiali', 
        description: 'Accesso base alla gestione di attrezzature e materiali (aggiunta, modifica, eliminazione).' 
    },
    // ✅ 2. NUOVO PERMESSO: Flusso di Lavoro (Assegnazioni, Guasti, Riconsegne)
    { 
        id: 'magazzino_assegnazioni', 
        name: 'Magazzino: Flusso di Lavoro Assegnazioni', 
        description: 'Sistema avanzato per assegnare, restituire e gestire guasti/furti delle attrezzature.' 
    },

    // ✅ AGGIUNTA PER LA PROGRAMMAZIONE
    { 
        id: 'reports_cantiere',
        name: 'Report cantieri',  
        label: 'Accesso ai Report Completi dei Cantieri' 
    },
    
    { 
      id: 'programmazione_operativa', 
      name: 'Programmazione Operativa (Simulatore)', 
      description: 'Organaizer per cantieri' 
    },
   
    // --- ✅ AGGIUNGI QUESTO BLOCCO ---
    {
      id: 'fatturazione',
      name: 'Modulo Fatturazione',
      description: 'Abilita la creazione, gestione e tracciamento delle fatture.'
    },
   
    // Aggiungi all'array ALL_FEATURES
    {
        id: 'gestione_fornitori',
        name: 'Gestione Fornitori e Acquisti',
        description: 'Permette di gestire l\'anagrafica fornitori e registrare le fatture di acquisto.'
    },

    {
        id: 'analisi_commessa',
        name: 'Analisi Commessa & Controllo di Gestione',
        description: 'Dashboard avanzata per l\'analisi dei margini per cantiere e globali.'
    }
];