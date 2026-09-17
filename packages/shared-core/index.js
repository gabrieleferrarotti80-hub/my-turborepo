// In packages/shared-core/index.js

// --- DATA LAYER ---
export * from './data/schemas.js';
export * from './data/dataParsers.js';
export * from './data/dataValidators.js';
export * from './data/features.js';
export * from './data/permissions.js';

// --- CONFIGURATION ---
export * from './firebaseConfig.js'; // Corretto

// --- CONTEXT ---
export * from './context/FirebaseContext.jsx';

// --- HOOKS ---

// Core Business & Action Hooks
export * from './hooks/useAnalisiFormLogic.js';
export * from './hooks/useAgendaAction.jsx';
export * from './hooks/useArticoliManager.jsx';
// --- ✅ MODIFICA: Nome corretto (SINGOLARE) ---
export * from './hooks/useAssegnazioniCantiereManager.jsx'; 
export * from './hooks/useAssegnazioniManager.jsx';
export * from './hooks/useCantieriManager.jsx';
export * from './hooks/useCantiereReportGenerator.jsx';
export * from './hooks/useClientsManager.jsx';
export * from './hooks/useCompaniesManager.jsx';
export * from './hooks/useDocumentiManager.jsx';
export * from './hooks/useElaborazioneFormLogic.js';
export * from './hooks/useFormAuthorizationManager.jsx';
export * from './hooks/useFormManager.jsx';
export * from './hooks/useFormRenderer';
export * from './hooks/useMagazzinoManager.jsx';
export * from './hooks/useNotificheManager.jsx';
export * from './hooks/useNoteOperativeManager';
export * from './hooks/useOfferteManager.jsx';
export * from './hooks/usePersonnelManager.jsx';
export * from './hooks/useRapportiniManager.jsx';
export * from './hooks/useReportsManager.jsx';
export * from './hooks/useReportSubmission.jsx';
export * from './hooks/useRevisioneLogic.js';
export * from './hooks/usePresenzeManager.jsx';
export * from './hooks/useReportTecnicoManager.jsx';
export * from './hooks/usePresenzeAdminManager.js';
export * from './hooks/useProgrammazioneManager.js';
export * from './hooks/usePublishManager.js';
//export * from './hooks/useAssegnazioneManager.js';
export * from './hooks/useFatturazioneManager.js';
export * from './hooks/useFornitoriManager.js';
export * from './hooks/useScadenziarioManager.js';
export * from './hooks/useDDTManager.js';
export * from './hooks/useAnalisiCommessaManager.js';
export * from './hooks/useBackupManager.js';
export * from './hooks/useManutenzioniManager.js';
export * from './hooks/useHRManager.js';
export * from './hooks/useSALManager.js';
export * from './hooks/useAziendaManager.js';
export * from './hooks/useSicurezzaManager.js';
export * from './hooks/usePercorsiManager';
export * from './hooks/useSubappaltatoriManager.js';
export * from './hooks/useDatiRiepilogoCantiere.jsx';


// UI & Controller Hooks
export * from './hooks/useAgendaManager.jsx';
export * from './hooks/useAgendaViewController.js';
export * from './hooks/useAuthentication.js';
export * from './hooks/useReportManagement.jsx';

// ... (commenti per hook deprecati)