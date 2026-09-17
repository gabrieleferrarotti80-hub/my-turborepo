import React, { useState, useMemo } from 'react';
import { Sidebar } from './Sidebar.jsx';
import { MainContent } from './MainContent.jsx';
import { SettingsContent } from './components/SettingsContent.jsx';

// IMPORTA I NUOVI MANAGERS (Viste a tutto schermo)
import CantieriManagerView from './views/CantieriManagerView';
import ProgrammazioneManagerView from './views/ProgrammazioneManagerView';
import SicurezzaManagerView from './views/SicurezzaManagerView';
import { BugReportModal } from 'shared-ui'; 

import { useFirebaseData, usePresenzeManager } from 'shared-core'; 
import { CartellinoBadge } from 'shared-ui'; 

// 🌟 NUOVI IMPORT PER IL BLOCCO SOSPESI
import { getAuth, signOut } from 'firebase/auth'; 
import { NoSymbolIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline'; 

export const DashboardLayout = () => {
    
    const [activeView, setActiveView] = useState('dashboard');
    const [operativeView, setOperativeView] = useState('cantieri'); 
    const [statusMessage, setStatusMessage] = useState('');
    
    // 1. Dati Globali
    const firebaseData = useFirebaseData();
    
    const { 
        companyID, 
        userRole,
        user,
        loadingData,
        db, 
        data,
        isSuperAdminView // <-- Rimosso companyFeatures da qui
    } = firebaseData; 

    // 🌟 ECCO IL FIX: Troviamo l'azienda corrente dell'utente e leggiamo lo stato
    const currentCompany = (data?.companies || []).find(c => c.id === companyID);
    const isSuspended = currentCompany?.companyFeatures?.isSuspended === true;
    
    // 2. Logica Presenze (Cartellino)
    const { statoCorrente } = data || {}; 
    const { checkIn, checkOut, isSaving: isSavingPresenze } = usePresenzeManager(db, user, companyID);
    
    const { stato, timbraturaApertaId } = useMemo(() => {
        const ultimaTimbratura = statoCorrente || null; 
        if (ultimaTimbratura && ultimaTimbratura.stato === 'lavoro' && !ultimaTimbratura.timestampFine) {
            return { stato: 'in_servizio', timbraturaApertaId: ultimaTimbratura.id };
        }
        if (ultimaTimbratura && ['pioggia', 'malattia', 'infortunio'].includes(ultimaTimbratura.stato)) {
             return { stato: 'in_pausa', timbraturaApertaId: null };
        }
        return { stato: 'fuori_servizio', timbraturaApertaId: null };
    }, [statoCorrente]);
    
    const handleTimbra = async (azione) => {
        if (isSavingPresenze) return;
        setStatusMessage("Invio timbratura...");
        let result;
        if (azione === 'entrata') {
            result = await checkIn();
        } else {
            if (!timbraturaApertaId) {
                result = { success: false, message: "Errore: Non trovo una timbratura aperta da chiudere." };
            } else {
                result = await checkOut(timbraturaApertaId);
            }
        }
        setStatusMessage(result.message || "Operazione completata.");
    };

    if (!user || loadingData) {
        return <div className="flex h-screen items-center justify-center text-gray-500">Caricamento gestionale...</div>;
    }

    // 🌟 IL MURO DI BLOCCO PER AZIENDE SOSPESE (Ora funziona!) 🌟
    if (isSuspended && !isSuperAdminView) {
        return (
            <div className="flex flex-col items-center justify-center w-full h-screen bg-slate-900 p-6 animate-fade-in relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-500 via-slate-900 to-slate-900"></div>
                
                <div className="bg-white p-10 md:p-12 rounded-[2.5rem] shadow-2xl border border-red-100 max-w-lg text-center relative z-10 animate-fade-in-up">
                    <div className="h-24 w-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border border-red-100">
                        <NoSymbolIcon className="h-12 w-12 text-red-500" />
                    </div>
                    
                    <h1 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Accesso Sospeso</h1>
                    
                    <p className="text-base font-medium text-slate-500 mb-10 leading-relaxed px-4">
                        L'accesso al gestionale per la tua azienda è stato momentaneamente bloccato per motivi amministrativi o per mancato rinnovo dell'abbonamento. 
                        <br/><br/>
                        I tuoi dati sono al sicuro, ma ti preghiamo di contattare l'assistenza per riattivare il servizio.
                    </p>
                    
                    <button 
                        onClick={() => {
                            const auth = getAuth();
                            signOut(auth);
                        }} 
                        className="flex items-center justify-center gap-3 w-full bg-slate-900 hover:bg-black text-white px-8 py-4 rounded-2xl font-black transition-all active:scale-95 shadow-lg shadow-slate-900/20"
                    >
                        <ArrowRightOnRectangleIcon className="h-6 w-6" />
                        Disconnettiti in sicurezza
                    </button>
                </div>
            </div>
        );
    }

    const isFullLayoutView = false; 

    return (
        <div className="bg-gray-100 min-h-screen flex font-sans antialiased">
            
            {!isFullLayoutView && (
                // 🌟 FIX: Aggiunto z-[9999] e relative a questo div!
                <div className="flex flex-col w-64 bg-gray-800 shrink-0 h-screen sticky top-0 z-[9999] relative"> 
                    <Sidebar
                        activeView={activeView}
                        onNavigate={setActiveView}
                        userRole={userRole} 
                        cartellinoBadge={
                            <CartellinoBadge 
                                statoPresenza={stato} 
                                onTimbraEntrata={() => handleTimbra('entrata')}
                                onTimbraUscita={() => handleTimbra('uscita')}
                                isSaving={isSavingPresenze}
                            />
                        }
                    />
                </div>
            )}
            
            <div className="flex-grow flex flex-col h-screen overflow-y-auto relative z-10">
                
                {/* --- ROUTER PULITO E OTTIMIZZATO --- */}
                {activeView === 'gestione-operativa' ? (
                    <CantieriManagerView />
                
                ) : activeView === 'programmazione' ? (
                    <ProgrammazioneManagerView />

                ) : activeView === 'sicurezza' ? (
                    <SicurezzaManagerView />

                ) : activeView === 'settings' ? (
                    <SettingsContent />

               ) : (
                    // Tutto il resto (incluso il nuovo Catalogo) passa dal MainContent
                    <MainContent
                        currentView={activeView}   
                        onNavigate={setActiveView}
                        firebaseData={firebaseData} 
                        operativeView={operativeView}
                        onOperativeNavigate={setOperativeView}
                    />
                )}
            </div>

           {/* Toast Notifiche */}
            {statusMessage && (
                <div 
                    key={Date.now()} 
                    className="fixed bottom-4 right-4 p-4 text-sm font-medium text-white bg-gray-800 rounded-lg shadow-lg animate-fade-out z-[9999]" 
                    onAnimationEnd={() => setStatusMessage('')}
                >
                    {statusMessage}
                </div>
            )}

            <BugReportModal />

        </div>
    );
};