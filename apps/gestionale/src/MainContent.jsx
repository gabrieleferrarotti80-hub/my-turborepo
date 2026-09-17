// MainContent.jsx

import React, { Suspense } from 'react';
import { useFirebaseData } from 'shared-core';

// View Imports - Titolare / Azienda
import { AgendaContent } from 'shared-ui'; 
import { ClientDetailView } from 'shared-ui';
import { OffertaWorkspaceView } from 'shared-ui/views/OffertaWorkspaceView'; 
import { PersonnelDetailView } from 'shared-ui/views/PersonnelDetailView'; 
import { DashboardRouter } from './components/dashboard/DashboardRouter'; 
import { MagazzinoDashboardLayout } from './components/MagazzinoDashboardLayout'; 

// Questi sono DEFAULT (senza graffe)
import ProgrammazioneManagerView from './views/ProgrammazioneManagerView'; 
import CantieriManagerView from './views/CantieriManagerView'; 
import SicurezzaManagerView from './views/SicurezzaManagerView';

import { CantiereReportOverview } from 'shared-ui/views/CantiereReportOverview';
import { OfferteContent } from './components/OfferteContent';
import { FatturazioneContent } from './components/fatturazione/FatturazioneContent';
import { DocumentiContent } from './components/DocumentiContent';
import { AnalisiCommessaContent } from './components/analisi/AnalisiCommessaContent';
import { ScadenziarioDashboard } from 'shared-ui/components/ScadenziarioDashboard';

import { PresenzeDashboard } from './components/PresenzeDashboard';

import { GestioneManutenzioniView } from 'shared-ui/components/GestioneManutenzioniView';
import { ManutenzioniContent } from './components/manutenzioni/ManutenzioniContent';
import { GestioneFerieView as HRManagerView } from 'shared-ui/components/GestioneFerieView'; 
import { CatalogoSettingsContent } from './components/CatalogoSettingsContent';
import { ListiniManager } from './components/gestione avanzata gare/ListiniManager';

// View Imports - Fornitori & Acquisti
import { AcquistiContent } from './components/fornitori/AcquistiContent';
import { AlboFornitoriContent } from './components/fornitori/AlboFornitoriContent';
import { SubappaltatoriContent } from './components/fornitori/SubappaltatoriContent';
import { NoleggiatoriContent } from './components/fornitori/NoleggiatoriContent';
import { ComparatorePrezzi } from './components/ComparatorePrezzi';
import { GestioneRDOContent } from './components/fornitori/GestioneRDOContent';
import { OrdiniAcquistoContent } from './components/fornitori/OrdiniAcquistoContent';

// View Imports - SuperAdmin
import { CompaniesContent } from './CompaniesContent'; 
import { GestioneAziendeAdminView } from './components/super-admin/GestioneAziendeAdminView'; 
import { BackupContent } from './components/admin/BackupContent';
import { AutorizzazioniFormView } from './components/AutorizzazioniFormView'; 
import { GestionePermessiView } from './components/GestionePermessiView'; 

// 🌟 AGGIUNTO L'IMPORT DELLA DASHBOARD BIG DATA
import { BigDataAnalytics } from './components/super-admin/BigDataAnalytics'; 

// Basic Views
import { PersonnelContent } from './PersonnelContent';
import { ClientsContent } from './ClientsContent';
import { SettingsContent } from './components/SettingsContent';
import { AreaClientiAdmin } from './components/AreaClientiAdmin'; 

// 🌟 AGGIUNTO L'IMPORT DELLA VISTA DI TEST
import { TestPianificazione } from './test/TestPianificazione';

import { SimulatoreGareView } from 'shared-ui/views/SimulatoreGareView.jsx';


export const MainContent = ({ currentView, onNavigate }) => {
    const { user, isSuperAdminView } = useFirebaseData();

    console.log("🚀 VISTA RICHIESTA AL MAIN CONTENT:", currentView);

    const renderView = () => {
        
        // 🌟 FORZIAMO LO SWITCH PER VEDERE SUBITO IL TEST
        // Quando hai finito, cambia 'test-piano' di nuovo in: currentView || 'dashboard'
       // switch ('test-piano') {
          switch (currentView || 'dashboard') {
            
            case 'test-piano':
                return <TestPianificazione />;

            case 'dashboard':
                return <DashboardRouter onNavigate={onNavigate} />;
            case 'agenda':
                return <AgendaContent onNavigate={onNavigate} />;
            case 'area-clienti-admin':
                return <AreaClientiAdmin />;
            case 'clienti':
                return <ClientsContent onNavigate={onNavigate} />;
            case 'client-detail':
                return <ClientDetailView onBack={() => onNavigate('clienti')} onNavigate={onNavigate} />;
            case 'personale':
                return <PersonnelContent onNavigate={onNavigate} />;
            case 'personnel-detail':
                return <PersonnelDetailView onBack={() => onNavigate('personale')} />;
            case 'gestione-ferie':
                return <HRManagerView />;
            case 'magazzino':
                return <MagazzinoDashboardLayout />;
            case 'gestione-operativa':
                return <CantieriManagerView />;
            case 'programmazione':
                return <ProgrammazioneManagerView onNavigate={onNavigate} />;
            case 'report_cantiere':
                return <CantiereReportOverview onNavigate={onNavigate} />;
            case 'documenti':
                return <DocumentiContent />;
            case 'impostazioni':
            case 'settings':
                return <SettingsContent />;
            case 'offerte':
                 return <OfferteContent />;
            case 'offerta-workspace':
                return <OffertaWorkspaceView onBack={() => onNavigate('offerte')} />;
            case 'fatturazione':
                return <FatturazioneContent />;
            case 'scadenziario-globale':
                return <ScadenziarioDashboard />;
            case 'acquisti':
                return <AcquistiContent />;
            case 'albo-fornitori':
                return <AlboFornitoriContent />;
            case 'subappaltatori':
                return <SubappaltatoriContent />;
            case 'noleggiatori':
                return <NoleggiatoriContent />;
            case 'comparatore-prezzi':
                return <ComparatorePrezzi />;
            case 'richieste-offerta':
                return <GestioneRDOContent />;
            case 'ordini-acquisto':
                return <OrdiniAcquistoContent />;
            case 'analisi-commessa':
                return <AnalisiCommessaContent />;
            case 'presenze':
                return <PresenzeDashboard />;
            case 'manutenzioni-view':
                return <GestioneManutenzioniView onNavigate={onNavigate} />;
            case 'manutenzioni-mezzi':
                return <ManutenzioniContent />;
            case 'sicurezza':
                return <SicurezzaManagerView />;
            case 'catalogo-risorse':
                return <CatalogoSettingsContent />;
            case 'listini':
                return <ListiniManager />;

            // --- VISTE SUPERADMIN ---
            case 'aziende':
            case 'admin-aziende':
                return <GestioneAziendeAdminView onBack={() => onNavigate('dashboard')} />;
            case 'backup':
                return <BackupContent />;
            case 'form-auth':
                return <AutorizzazioniFormView />;
            case 'gestione-permessi': 
                return <GestionePermessiView />;
            case 'simulatore':
                return <SimulatoreGareView onExit={() => onNavigate('dashboard')} />;
            case 'big-data':
                return <BigDataAnalytics />;
            
            default:
                return (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-fade-in">
                        <div className="bg-slate-100 p-6 rounded-2xl border border-slate-200 max-w-md">
                            <h2 className="text-xl font-bold text-slate-800 mb-2">Vista In Sviluppo</h2>
                            <p className="text-slate-600 mb-4">La sezione <span className="font-mono bg-slate-200 px-2 py-1 rounded text-indigo-600">{currentView}</span> non è stata ancora implementata.</p>
                            <button onClick={() => onNavigate('dashboard')} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-indigo-700 transition-colors">
                                Torna alla Dashboard
                            </button>
                        </div>
                    </div>
                );
        }
    };

    return (
        <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>}>
            {renderView()}
        </Suspense>
    );
};