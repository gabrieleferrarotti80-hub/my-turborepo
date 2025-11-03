// In packages/shared-core/index.js

// --- DATA LAYER ---
export * from './data/schemas.js';
export * from './data/dataParsers.js';
export * from './data/dataValidators.js';
export * from './data/features.js';
export * from './data/permissions.js';

// --- CONFIGURATION ---
export * from './firebaseConfig.js';

// --- CONTEXT ---
export * from './context/FirebaseContext.jsx';

// --- HOOKS ---

// Core Business & Action Hooks

export * from './hooks/useAnalisiFormLogic.js';
export * from './hooks/useAgendaAction.jsx';
export * from './hooks/useArticoliManager.jsx';
export * from './hooks/useAssegnazioniCantiereManager.jsx';
export * from './hooks/useAssegnazioniManager.jsx';
export * from './hooks/useCantieriManager.jsx';
export * from './hooks/useCantiereReportGenerator.jsx';
export * from './hooks/useClientsManager.jsx';
export * from './hooks/useCompaniesManager.jsx'; // ✅ Estensione corretta aggiunta
export * from './hooks/useDocumentiManager.jsx';
export * from './hooks/useElaborazioneFormLogic.js';
export * from './hooks/useFormAuthorizationManager.jsx';
export * from './hooks/useFormManager.jsx';
export * from './hooks/useFormRenderer';
export * from './hooks/useMagazzinoManager.jsx';
export * from './hooks/useNotificheManager.jsx';
export * from './hooks/useNoteOperativeManager';
export * from './hooks/useOfferteManager';
export * from './hooks/usePersonnelManager.jsx';
export * from './hooks/useRapportiniManager.jsx';
export * from './hooks/useReportsManager.jsx';
export * from './hooks/useReportSubmission.jsx';
export * from './hooks/useRevisioneLogic';
export * from './hooks/usePresenzeManager.jsx';
export * from './hooks/useReportTecnicoManager.jsx';
export * from './hooks/usePresenzeAdminManager.js'

// UI & Controller Hooks
export * from './hooks/useAgendaManager.jsx';
export * from './hooks/useAgendaViewController.js';
export * from './hooks/useAuthentication.js';
export * from './hooks/useReportManagement.jsx';


// ❌ RIMOSSI: Export degli hook deprecati per pulire l'API pubblica.
/*
export * from './hooks/useAssegnazioniCantiere.jsx';
export * from './hooks/useCantieriAziendali.jsx';
export * from './hooks/useGuastiManager.jsx';
export * from './hooks/useMaterialiManager.js';
export * from './hooks/useRiconsegneManager.jsx';
*/