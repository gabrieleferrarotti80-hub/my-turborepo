// File: packages/shared-core/data/permissions.js

const rolePermissions = {
    proprietario: {
        // Viste Principali della Sidebar
        canViewDashboard: true,
        canViewAgenda: true,
        canViewAziende: true, // Specifico per Super Admin
        canViewPersonale: true,
        canViewClienti: true,
        canViewMagazzino: true,
        canViewGestioneOperativa: true,
        canViewDocumenti: true,
        canViewOfferte: true, // ✅ Permesso di vista
        canManageOfferte: true, // ✅ Permesso di gestione

        // Altri permessi...
        canViewAssegnazioni: true,
        canManageRapportini: true,
        canReadForms: true,
        canViewReports: true,
        canViewCantiereReports: true,
    },
    'titolare-azienda': {
        canViewDashboard: true,
        canViewAgenda: true,
        canViewAziende: false,
        canViewPersonale: true,
        canViewClienti: true,
        canViewMagazzino: true,
        canViewGestioneOperativa: true,
        canViewDocumenti: true,
        canViewOfferte: true, // ✅ CHIAVE AGGIUNTA
        canManageOfferte: true,
        
        canViewAssegnazioni: true,
        canManageRapportini: true,
        canReadForms: true,
        canViewReports: true,
        canViewCantiereReports: true,
    },

    amministrazione: {
        canViewDashboard: true,
        canViewAgenda: true,
        canViewAziende: false,
        canViewPersonale: true,
        canViewClienti: true,
        canViewMagazzino: true,
        canViewGestioneOperativa: true,
        canViewDocumenti: true,
        canViewOfferte: true, // ✅ CHIAVE AGGIUNTA
        canManageOfferte: true,
        
        canViewAssegnazioni: true,
        canManageRapportini: true,
        canReadForms: true,
        canViewReports: true,
        canViewCantiereReports: true,
    },

    preposto: {
        canViewDashboard: true,
        canViewAgenda: true,
        canViewAziende: false,
        canViewPersonale: true,
        canViewClienti: true,
        canViewMagazzino: true,
        canViewGestioneOperativa: true,
        canViewDocumenti: true,
        canViewOfferte: true, // ✅ CHIAVE AGGIUNTA
        canManageOfferte: true,

        canViewAssegnazioni: true,
        canManageRapportini: false,
        canReadForms: true,
        canViewReports: true,
        canViewCantiereReports: true,
    },

    dipendente: {
               canViewAgenda: true,        // Può vedere la propria agenda
        canViewAssegnazioni: true,  // Può vedere le proprie assegnazioni
        canUseAppEsterna: true      // Può accedere all'app esterna
        // Tutti gli altri permessi (es. canViewClienti, canViewPersonale)
        // rimarranno 'false' grazie al default.
    },
    
    default: {
        canViewDashboard: false,
        canViewAgenda: false,
        canViewAziende: false,
        canViewPersonale: false,
        canViewClienti: false,
        canViewMagazzino: false,
        canViewGestioneOperativa: false,
        canViewDocumenti: false,
        canViewOfferte: false, // ✅ Aggiunto anche qui per coerenza
        canManageOfferte: false,
        canViewAssegnazioni: false,
        canManageRapportini: false,
        canReadForms: false,
        canViewReports: false,
        canViewCantiereReports: false,
    }
};

/**
 * Restituisce un oggetto di permessi in base al ruolo dell'utente.
 * Combina i permessi del ruolo con quelli di default per garantire che tutte le chiavi siano presenti.
 * @param {string} role - Il ruolo dell'utente (es. 'preposto').
 * @returns {object} Un oggetto completo di permessi.
 */
export const getPermissionsByRole = (role) => {
    const r = role?.toLowerCase();
    // Miglioramento: Unisce i permessi del ruolo a quelli di default
    // per assicurare che ogni chiave esista sempre.
    return { ...rolePermissions.default, ...rolePermissions[r] };
};