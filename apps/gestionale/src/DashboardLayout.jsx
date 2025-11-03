// apps/gestionale/src/DashboardLayout.jsx

import React, { useState, useMemo } from 'react'; // Aggiunto useMemo
import { Sidebar } from './Sidebar.jsx';
import { MainContent } from './MainContent.jsx';
import { MainOperativeView } from './MainOperativeView.jsx';
import { CompaniesContent } from './CompaniesContent.jsx';
// ❗ 1. IMPORTA L'HOOK CORRETTO
import { useFirebaseData, usePresenzeManager } from 'shared-core'; 
import { CartellinoBadge } from 'shared-ui'; 
import { GestioneAziendeAdminView } from './components/GestioneAziendeAdminView.jsx';
import { OfferteContent } from './components/OfferteContent.jsx';

// ❗ Rimuoviamo il GPS da qui, perché l'hook 'usePresenzeManager'
// che mi hai fornito non lo accetta (usa serverTimestamp).
// const getCurrentLocation = () => { ... };

export const DashboardLayout = () => {
    
    const [activeView, setActiveView] = useState('dashboard');
    const [operativeView, setOperativeView] = useState('cantieri');
    const [statusMessage, setStatusMessage] = useState(''); // Stato per i messaggi
    
    const firebaseData = useFirebaseData();
    const { 
        companyID, 
        userRole,
        user,
        loadingData,
        db, // Estratto 'db'
        data 
    } = firebaseData; 
    
    // --- ❗ 2. LOGICA CARTELLINO (CORRETTA) ---
    const { statoCorrente } = data || {}; 

    // Importa le funzioni con i nomi giusti: checkIn, checkOut
    const { 
        checkIn, 
        checkOut, 
        isSaving: isSavingPresenze 
    } = usePresenzeManager(db, user, companyID); // L'hook non prende statoCorrente
    
    // Il memo ora estrae anche l'ID della timbratura da chiudere
    const { stato, timbraturaApertaId } = useMemo(() => {
        // Leggi direttamente l'oggetto, non un array
        const ultimaTimbratura = statoCorrente || null; 
        
        if (ultimaTimbratura && ultimaTimbratura.stato === 'lavoro' && !ultimaTimbratura.timestampFine) {
            return { stato: 'in_servizio', timbraturaApertaId: ultimaTimbratura.id };
        }
        // Aggiungiamo gli altri stati per coerenza con l'app esterna
        if (ultimaTimbratura && (ultimaTimbratura.stato === 'pioggia' || ultimaTimbratura.stato === 'malattia' || ultimaTimbratura.stato === 'infortunio')) {
             return { stato: 'in_pausa', timbraturaApertaId: null }; // O uno stato specifico se 'CartellinoBadge' lo gestisce
        }
        return { stato: 'fuori_servizio', timbraturaApertaId: null };
    }, [statoCorrente]);
    
    // Handler aggiornato per usare checkIn e checkOut
    const handleTimbra = async (azione) => {
        if (isSavingPresenze) return;
        
        setStatusMessage("Invio timbratura...");
        let result;

        if (azione === 'entrata') {
            // checkIn() non richiede GPS (come da tuo file)
            result = await checkIn();
        } else {
            // checkOut() richiede l'ID del documento
            if (!timbraturaApertaId) {
                result = { success: false, message: "Errore: Non trovo una timbratura aperta da chiudere." };
            } else {
                result = await checkOut(timbraturaApertaId);
            }
        }
        setStatusMessage(result.message || "Operazione completata.");
    };
    // --- FINE LOGICA CARTELLINO ---

    if (!user || loadingData) {
        console.warn("[DashboardLayout] Dati mancanti o in caricamento. Rendendo null.");
        return null;
    }

    console.log("--- RENDER DashboardLayout ---");
    console.log(`%c[DashboardLayout] Render con companyID:`, "color: green; font-weight: bold;", companyID);

    const isMagazzinoView = activeView === 'magazzino';
    const isOperativeView = activeView === 'gestione-operativa';
    const isFullLayoutView = 
        isMagazzinoView || 
        isOperativeView ||
        activeView === 'aziende' ||
        activeView === 'offerte' ||
        activeView === 'admin-aziende';

    return (
        <div className="bg-gray-100 min-h-screen flex font-sans antialiased">
            
            {!isFullLayoutView && (
                <div className="flex flex-col w-64 bg-gray-800 shrink-0"> 
                    <Sidebar
                        activeView={activeView}
                        onNavigate={setActiveView}
                        userRole={userRole} 
                        // ❗ 3. Passa le prop corrette al Badge
                        cartellinoBadge={
                            <CartellinoBadge 
                                statoPresenza={stato} // Passa lo stato dal 'useMemo'
                                onTimbraEntrata={() => handleTimbra('entrata')}
                                onTimbraUscita={() => handleTimbra('uscita')}
                                isSaving={isSavingPresenze}
                            />
                        }
                    />
                </div>
            )}
            
            <div className="flex-grow flex flex-col h-screen overflow-y-auto">
                
                {isOperativeView ? (
                    <MainOperativeView 
                        onBack={() => setActiveView('dashboard')} 
                        operativeView={operativeView} 
                        onOperativeNavigate={setOperativeView}
                        userAziendaId={companyID}
                    />
                ) : activeView === 'aziende' ? (
                    <CompaniesContent onNavigate={setActiveView} /> 

                ) : activeView === 'offerte' ? (
                    <OfferteContent 
                        onNavigateBack={() => setActiveView('dashboard')} 
                        selectedCompanyId={companyID} 
                    />
                
                ) : activeView === 'admin-aziende' ? (
                    <GestioneAziendeAdminView onBack={() => setActiveView('dashboard')} />

                ) : (
                    <MainContent
                        activeView={activeView}
                        onNavigate={setActiveView}
                        firebaseData={firebaseData} 
                        operativeView={operativeView}
                        onOperativeNavigate={setOperativeView}
                    />
                )}
            </div>

            {/* Modal Messaggio di Stato */}
            {statusMessage && (
                <div 
                    key={Date.now()} 
                    className="fixed bottom-4 right-4 p-4 text-sm font-medium text-white bg-gray-800 rounded-lg shadow-lg animate-fade-out" 
                    onAnimationEnd={() => setStatusMessage('')}
                >
                    {statusMessage}
                </div>
            )}
        </div>
    );
};