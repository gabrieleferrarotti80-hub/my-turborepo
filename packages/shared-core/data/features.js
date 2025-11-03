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
{ id: 'reports_cantiere', label: 'Accesso ai Report Completi dei Cantieri' },
];