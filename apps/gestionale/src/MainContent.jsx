// File: apps/gestionale/src/MainContent.jsx

import React from 'react';
import { useAgendaManager, useDocumentiManager } from 'shared-core';
import { AgendaContent } from 'shared-ui';
import { DocumentiContent } from './components/DocumentiContent.jsx';
import { CompaniesContent } from './CompaniesContent.jsx';
import { PersonnelContent } from './PersonnelContent.jsx';
import { ClientsContent } from './ClientsContent.jsx';
import { MagazzinoDashboardLayout } from './components/MagazzinoDashboardLayout.jsx';
import { ProgettiContent } from './ProgettiContent.jsx';
import { AggiungiCantiereForm } from './AggiungiCantiereForm.jsx';
import { AssegnaCantiereForm } from './AssegnaCantiereForm.jsx';
import { CantiereDashboard } from './CantiereDashboard.jsx';
import { GestioneAziendeAdminView } from './components/GestioneAziendeAdminView.jsx';
import { OfferteContent } from './components/OfferteContent.jsx';

export const MainContent = ({ activeView, onNavigate, firebaseData, operativeView, onOperativeNavigate }) => {
    
    // Clausola di salvaguardia fondamentale per prevenire crash durante il caricamento
    if (!firebaseData || firebaseData.loadingData) {
        return (
            <main className="p-6 md:p-8 overflow-y-auto bg-gray-100 flex-grow">
                <h1 className="text-xl font-semibold text-gray-700">Caricamento dati...</h1>
            </main>
        );
    }
    
    // Estrazione sicura dei dati dall'oggetto 'firebaseData' ricevuto come prop
    const { 
        data: innerData,
        user, 
        userRole, 
        companyID, 
        db, 
        storage,
        loadingData
    } = firebaseData;

    // Estrazione sicura delle collezioni, con un fallback a un array vuoto
    const { eventi = [], documenti = [], scadenze = [], users = [], clients = [] } = innerData || {};

    // Inizializzazione corretta degli hook manager
    // L'hook agendaManager contiene tutti i calcoli di stato (currentDate, daysInMonth, filteredEvents, handlers)
    const agendaManager = useAgendaManager(firebaseData); 
    const { deleteDocumento } = useDocumentiManager(db, storage, companyID, user);

    const renderContent = () => {
        switch (activeView) {
            case 'offerte':
                return <OfferteContent onNavigateBack={() => onNavigate('dashboard')} selectedCompanyId={companyID} />;

            case 'agenda':
                return (
                    <AgendaContent
                        // ✅ Passa TUTTO lo stato calcolato dal manager 
                        {...agendaManager} 
                        
                        // ✅ Passa i dati di base grezzi estratti dal contesto (per i filtri/dettagli)
                        events={eventi} 
                        documents={documenti} 
                        users={users}
                        loadingData={loadingData}
                        user={user} 
                        userRole={userRole}
                        // Non è più necessario passare onConfirmEvent/onRejectEvent, sono già in {...agendaManager}
                    />
                );

            case 'documenti':
                return (
                    <DocumentiContent
                        documenti={documenti}
                        onDeleteDocumento={deleteDocumento}
                    />
                );
            
            case 'gestione-aziende':
            case 'aziende':
                return <CompaniesContent />;
            case 'personale':
                return <PersonnelContent />;
            case 'clienti':
                return <ClientsContent />;
            case 'magazzino':
                return <MagazzinoDashboardLayout onBack={() => onNavigate('dashboard')} />;
            case 'projects':
                return <ProgettiContent userAziendaId={companyID} />;
            case 'add-cantiere':
                return <AggiungiCantiereForm onNavigate={onNavigate} />;
            case 'assign-cantiere':
                return <AssegnaCantiereForm onNavigate={onNavigate} />;
            case 'gestione-operativa':
                return <CantiereDashboard activeView={operativeView} onNavigate={onOperativeNavigate} userAziendaId={companyID} />;
            case 'admin-aziende':
                return <GestioneAziendeAdminView onBack={() => onNavigate('dashboard')} />;

            default:
                return (
                    <div>
                        <h1 className="text-2xl font-bold mb-4">Dashboard Principale</h1>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 bg-white rounded shadow"><h3 className="font-bold">Clienti</h3><p className="text-3xl">{clients?.length ?? '...'}</p></div>
                            <div className="p-4 bg-white rounded shadow"><h3 className="font-bold">Personale</h3><p className="text-3xl">{users?.length ?? '...'}</p></div>
                            <div className="p-4 bg-white rounded shadow"><h3 className="font-bold">Eventi in Agenda</h3><p className="text-3xl">{eventi?.length ?? '...'}</p></div>
                        </div>
                    </div>
                );
        }
    };

    if (activeView === 'magazzino') {
        return renderContent();
    }

    return (
        <main className="p-6 md:p-8 overflow-y-auto bg-gray-100 flex-grow">
            {renderContent()}
        </main>
    );
};