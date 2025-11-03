// Percorso: apps/app-esterna/src/components/MaskLayout.jsx

import React, { useState, useCallback } from 'react';
import { useFirebaseData, usePresenzeManager } from 'shared-core';
import { PresenzeControllo, PresenzeViewerModal } from 'shared-ui';

export const MaskLayout = ({
    children,
    user,
    userData,
    onLogout,
    title,
    subtitle,
    className 
}) => {

    const [statusMessage, setStatusMessage] = useState('');
    const [isPresenzeModalOpen, setIsPresenzeModalOpen] = useState(false);

    const { db, data, loadingData } = useFirebaseData();
   const statoCorrente = data?.statoCorrente || null;
    const userPresenze = data?.userPresenze || []; // Assicurati che userPresenze sia richiesto in main.jsx

    const { 
        isSaving,
        checkIn,
        checkOut,
        segnalaMalattia,
        segnalaInfortunio,
        segnalaPioggia,
        segnalaErrore,
    } = usePresenzeManager(db, user, userData?.companyID);


        // --- ❗ LOG DA AGGIUNGERE QUI ---
    console.log('--- 🔴 DEBUG MASKLAYOUT 🔴 ---');
    console.log('Dati grezzi da useFirebaseData:', data);
    console.log('Stato Corrente (passato a PresenzeControllo):', statoCorrente);
    console.log('LoadingData:', loadingData, 'IsSaving:', isSaving);
    console.log('------------------------------');
    // --- FINE LOG ---


    // --- Handler Corretti ---

    const handleCheckIn = useCallback(async () => {
        const result = await checkIn();
        if (!result.success) {
            setStatusMessage(result.message || "Errore durante il check-in");
        }
    }, [checkIn]);

    const handleCheckOut = useCallback(async () => {
        if (!statoCorrente?.id) {
            setStatusMessage("Errore: Stato corrente non trovato.");
            return;
        }
        const result = await checkOut(statoCorrente.id);
        if (!result.success) {
            setStatusMessage(result.message || "Errore durante il check-out");
        }
    }, [checkOut, statoCorrente]);

    const handleSegnalaMalattia = useCallback(async (dataInizio, dataFine, note) => {
        const result = await segnalaMalattia(dataInizio, dataFine, note);
        setStatusMessage(result.message || (result.success ? "Stato Malattia registrato." : "Errore"));
    }, [segnalaMalattia]);

    const handleSegnalaInfortunio = useCallback(async (dataInizio, dataFine, note) => {
        const result = await segnalaInfortunio(dataInizio, dataFine, note);
        setStatusMessage(result.message || (result.success ? "Stato Infortunio registrato." : "Errore"));
    }, [segnalaInfortunio]);

    const handleSegnalaPioggia = useCallback(async () => {
        const note = prompt("Aggiungi una nota per lo stato 'Pioggia' (opzionale):");
        if (note === null) return;
        
        const result = await segnalaPioggia(note);
        setStatusMessage(result.message || (result.success ? "Stato Pioggia registrato." : "Errore"));
    }, [segnalaPioggia]);

    // Corretto per passare la data di riferimento
    const handleSegnalaErrorePresenza = useCallback(async (nota, dataRiferimento) => {
        const result = await segnalaErrore(nota, dataRiferimento);
        setStatusMessage(result.message || (result.success ? "Segnalazione inviata." : "Errore"));
        return result;
    }, [segnalaErrore]);


    return (
        <div className={`h-screen w-full flex flex-col bg-gray-100 ${className || ''}`}>
            
            <div className="w-full h-full p-4 sm:p-6 lg:p-8 flex flex-col">
                
                <div className="w-full h-full bg-white rounded-3xl shadow-2xl flex flex-col">
                    
                    {/* Header (Invariato) */}
                   <header className="flex justify-between items-start p-6 sm:p-8 border-b-2 border-gray-200">
                    
                    {/* Colonna Sinistra (Titolo e Sottotitolo) */}
                    <div className="flex flex-col">
                        <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
                        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
                    </div>

                    {/* Colonna Destra (Utente e Logout) */}
                    {user && (
                        <div className="flex flex-col items-end"> 
                            {/* Nome utente (prima riga) */}
                            <span className="text-sm font-medium text-gray-700 text-right">
                                {user.nome && user.cognome ? `${user.nome} ${user.cognome}` : user.email}
                            </span>
                            
                            {/* Pulsante Logout (seconda riga) */}
                            <button
                                onClick={onLogout}
                                className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-full transition-colors duration-300 mt-2" // Aggiunto mt-2
                            >
                                Logout
                            </button>
                        </div>
                    )}
                </header>

                    {/* Blocco Presenze (Invariato) */}
                    {!loadingData && (
                        <div className="border-b-2 border-gray-200 shadow-sm">
                            <PresenzeControllo 
                                statoCorrente={statoCorrente}
                                onCheckIn={handleCheckIn}
                                onCheckOut={handleCheckOut}
                                onSegnalaMalattia={handleSegnalaMalattia}
                                onSegnalaInfortunio={handleSegnalaInfortunio}
                                onSegnalaPioggia={handleSegnalaPioggia}
                                isSaving={isSaving}
                                onViewPresenzeClick={() => {
                                    console.log("CLICK: Apertura modal presenze.");
                                    setIsPresenzeModalOpen(true);
                                }}
                            />
                        </div>
                    )}
                          
                    <main className="flex-1 overflow-y-auto p-6 sm:p-8 flex flex-col">
                        {children}
                    </main>
                    
                </div>
            </div>

           {/* Modale Messaggio di Stato */}
          {statusMessage && (
                <div 
                    key={Date.now()} 
              className="fixed bottom-4 right-4 z-60 p-4 text-sm font-medium text-white bg-gray-800 rounded-lg shadow-lg animate-fade-out" 
                    onAnimationEnd={() => setStatusMessage('')}
                >
                    {statusMessage}
          </div>
            )}

            <PresenzeViewerModal 
                isOpen={isPresenzeModalOpen}
                onClose={() => setIsPresenzeModalOpen(false)}
                presenze={userPresenze}
                onSegnalaErrore={handleSegnalaErrorePresenza} 
           isSaving={isSaving}
            />

        </div>
    );
};