import React, { useState } from 'react';
import { MapPinIcon, PlusIcon } from '@heroicons/react/24/solid';
import { AggiungiCantiereForm } from './AggiungiCantiereForm.jsx';
import { CantieriList } from 'shared-ui';
import { DettagliCantiereView } from './DettagliCantiereView.jsx';
import { useTheme } from 'shared-ui';
import { useFirebaseData } from 'shared-core';

// ✅ MODIFICA: Importa l'hook dal pacchetto 'shared-core'
import { useCantieriManager } from 'shared-core';

// 🛑 RIMOSSA LA CHIAMATA A HOOK GLOBALE DALLA RIGA 11

export const CantiereDashboard = () => {
    
    // ✅ CORREZIONE: La chiamata a useFirebaseData() viene spostata QUI.
    const { userRole, userAziendaId, companies, cantieri, clients, loadingAuth, loadingData, db } = useFirebaseData();
    const { primaryColor, colorClasses } = useTheme();

    // Inizializza l'hook di logica qui, iniettando il DB come dipendenza (Passo 4)
    // Non stai usando le funzioni dell'hook qui, ma la prassi è definirlo:
    // const { addCantiere, updateCantiere } = useCantieriManager(db, userAziendaId);

    const [currentView, setCurrentView] = useState('list');
    const [selectedCantiereId, setSelectedCantiereId] = useState(null);

    const handleBack = () => {
        setCurrentView('list');
        setSelectedCantiereId(null);
    };
    
    const canAddCantiere = userRole !== 'proprietario' || !!userAziendaId;
    const buttonClasses = canAddCantiere
        ? `${colorClasses[primaryColor].bg} hover:opacity-90`
        : 'bg-gray-400 cursor-not-allowed';

    // ... (Il resto del codice e lo switch case sono validi) ...

    const renderHeader = () => (
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4 text-gray-800">
                <MapPinIcon className={`h-10 w-10 ${colorClasses[primaryColor].text}`} />
                <h1 className="text-4xl font-bold">Gestione Cantieri</h1>
            </div>
            {currentView === 'list' && (
                <button
                    onClick={() => canAddCantiere && setCurrentView('add')}
                    className={`flex items-center gap-2 px-4 py-2 font-semibold text-white rounded-lg transition-colors duration-200 ${buttonClasses}`}
                    disabled={!canAddCantiere}
                >
                    <PlusIcon className="h-5 w-5" /> Aggiungi Cantiere
                </button>
            )}
        </div>
    );

    if (loadingAuth || loadingData) {
        return <div className="p-8 text-center">Caricamento dati cantieri...</div>;
    }

    switch (currentView) {
        case 'add':
            return (
                <AggiungiCantiereForm
                    onBack={handleBack}
                    onSaveSuccess={(msg) => {
                        handleBack();
                    }}
                />
            );
        case 'details':
            return (
                <DettagliCantiereView
                    cantiereId={selectedCantiereId}
                    onBack={handleBack}
                />
            );
        case 'list':
        default:
            return (
                <>
                    {renderHeader()}
                    <p className="text-gray-600 mb-6">Visualizza e gestisci i tuoi cantieri attivi.</p>
                    <CantieriList
                        cantieri={cantieri || []} 
                        onSelectCantiere={(id) => { setSelectedCantiereId(id); setCurrentView('details'); }}
                        userRole={userRole}
                        userAziendaId={userAziendaId}
                        companies={companies} 
                    />
                </>
            );
    }
};

const CantiereDashboardWrapper = () => (
    <main className="p-6 md:p-8 overflow-y-auto">
        <CantiereDashboard />
    </main>
);
// Aggiungi export di default al componente wrapper o alla dashboard
