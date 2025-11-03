// In packages/shared-ui/index.js

// --- CONTEXT (Unica fonte per il tema) ---
// ✅ CORRETTO: Questa singola riga esporta useTheme, ThemeProvider, e COLOR_CLASSES.
export * from './context/themeContext.jsx';
export * from './components/ThemeProvider.jsx';

// ❌ RIMOSSO: L'export duplicato per useTheme è stato eliminato.

// --- VISTE (Componenti di alto livello) ---
export * from './views/PersonnelDetailView.jsx';
export * from './views/AgendaView.jsx';
export * from './views/ClientDetailView.jsx';
export * from './views/CantiereReportDetailView.jsx';
export * from './views/CantiereReportOverview.jsx';
export * from './views/OfferteDashboard.jsx';
export * from './views/OfferteListView.jsx';
export * from './views/OffertaWorkspaceView.jsx';

// --- COMPONENTI (Mattoncini riutilizzabili) ---
export * from './components/ActionButtons.jsx';
export * from './components/AddMaterialeForm.jsx';
export * from './components/AgendaContent.jsx';
export * from './components/AssegnazioniMenuMagazzino.jsx';
export * from './components/Calendar.jsx';
export * from './components/CantieriList.jsx';
export * from './components/DettagliAssegnazioneView.jsx';
export * from './components/DettagliEventoModal.jsx';
export * from './components/DettagliScadenzaModal.jsx';
export * from './components/FeatureToggle.jsx';
export * from './components/FormList.jsx';
export * from './components/FormReader.jsx';
export * from './components/GaraPrivataFields.jsx';
export * from './components/GestioneArchivioView.jsx';
export * from './components/GestioneAssegnazioniMagazzinoView.jsx';
export * from './components/GestioneAziendeSidebar.jsx';
export * from './components/GestioneGuastiView.jsx';
export * from './components/GestioneMagazzinoView.jsx';
export * from './components/GestioneRiconsegneView.jsx';
export * from './components/ImportMaterialiView.jsx';
export * from './components/MagazzinoSidebar.jsx';
export * from './components/NotificationBell.jsx';
export * from './components/UserSelector.jsx';
export * from './components/Checklist.jsx';
export * from './components/FileUploadZone.jsx';
export * from './components/OfferteSidebar.jsx';
export * from './components/StatoDocumenti.jsx';
export * from './components/PresenzeControllo.jsx';
export * from './components/PresenzeViewerModal.jsx';
export * from './components/SopralluogoReportModal.jsx';
export * from './components/CartellinoBadge';

// --- FORM (Componenti "stupidi" per l'inserimento dati) ---
export * from './forms/AggiungiDocumentoForm.jsx';
export * from './forms/AggiungiEventoForm.jsx';
export * from './forms/AggiungiArticoloForm.jsx';
export * from './forms/AssegnaAttrezzaturaForm.jsx';
export * from './forms/ModificaArticoloForm.jsx';
export * from './forms/AddNotaOperativaForm.jsx';
export * from './forms/NuovaOffertaForm.jsx';
export * from './forms/AnalisiPreliminareForm.jsx';
export * from './forms/AnalisiCostiForm.jsx';
export * from './forms/AggiungiReferenteForm.jsx';
export * from './forms/ElaborazioneForm.jsx';
export * from './forms/AnalisiCostiForm.jsx';
export * from './forms/RevisioneInvioForm.jsx';
export * from './forms/GenericFormRenderer.jsx';

// ❌ RIMOSSO: AddMaterialeForm.jsx era probabilmente un duplicato o un refuso.
// La logica è gestita da AggiungiArticoloForm.