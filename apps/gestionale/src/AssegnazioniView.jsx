// Percorso: apps/gestionale/src/AssegnazioniView.jsx

import React, { useState, useMemo, useEffect } from 'react';
import { useFirebaseData, useAssegnazioniManager } from 'shared-core'; 
import { useTheme } from 'shared-ui';
import { 
    AssegnazioniMenuMagazzino, 
    AssegnaAttrezzaturaForm,
    GestioneAssegnazioniMagazzinoView, 
    DettagliAssegnazioneView,
    GestioneGuastiView, 
    GestioneRiconsegneView 
} from 'shared-ui';

export const AssegnazioniView = () => {
    // 1. Prima recupera i dati e gli hook.
    const { 
        db, user, userAziendaId, attrezzature, 
        assegnazioniMagazzino, // Recuperiamo il nome originale per il debug
        users, loadingData 
    } = useFirebaseData();

    // Rinominiamo la variabile qui per usarla nel resto del componente
    const assegnazioni = assegnazioniMagazzino;

    const { 
        creaAssegnazioniMultiple, confermaPresaInCarico,      
        segnalaGuasto,            accettaSegnalazione,      
        risolviRiparazione,       richiediRestituzione,       
        accettaRestituzione,      isLoading: isAssigning      
    } = useAssegnazioniManager();
    
    // 2. POI usa i dati recuperati (ad esempio, per il debug).
    // Ora tutte le variabili (loadingData, assegnazioniMagazzino, etc.) esistono.
    useEffect(() => {
        console.group("--- DEBUG DATI IN AssegnazioniView ---");
        console.log("Stato Caricamento:", loadingData);
        console.log("Dati ricevuti dal contesto:");
        console.log("Array 'assegnazioniMagazzino':", assegnazioniMagazzino);
        console.log("Array 'attrezzature':", attrezzature);
        console.log("Array 'users':", users);
        console.groupEnd();
    }, [assegnazioniMagazzino, attrezzature, users, loadingData]);

    const isLoading = isAssigning || loadingData; 
    
    const [view, setView] = useState('menu');
    const [selectedItem, setSelectedItem] = useState(null);
    const [message, setMessage] = useState('');
    const { primaryColor } = useTheme();

    const setLocalView = (v, item = null) => {
        setSelectedItem(item);
        setView(v);
        setMessage(''); 
    };
    
    const handleSaveSuccess = (msg, newView = 'gestisci-assegnazioni') => {
        setMessage(msg); 
        setView(newView);
    };

    const assegnazioniSicure = assegnazioni || [];

    const guastiAttivi = useMemo(() => 
        assegnazioniSicure.filter(a => a.statoWorkflow === 'guasto segnalato' || a.statoWorkflow === 'furto segnalato'), 
        [assegnazioniSicure]
    );
    const riconsegneRichieste = useMemo(() => 
        assegnazioniSicure.filter(a => a.statoWorkflow === 'restituzione richiesta'), 
        [assegnazioniSicure]
    );

    const renderContent = () => {
        if (loadingData) {
            return <div className="flex justify-center items-center h-full"><p className="text-xl">Caricamento Assegnazioni...</p></div>;
        }

        switch (view) {
            case 'assegna-attrezzatura':
                return (
                    <AssegnaAttrezzaturaForm 
                        onBack={() => setView('menu')} 
                        onSaveSuccess={handleSaveSuccess}
                        onSave={creaAssegnazioniMultiple} 
                        dipendenti={users} 
                        magazzino={attrezzature} 
                        isLoading={isLoading}
                    />
                );
            case 'gestisci-assegnazioni':
                return (
                    <GestioneAssegnazioniMagazzinoView
                        assegnazioni={assegnazioniSicure.filter(a => a.statoWorkflow !== 'conclusa')} 
                        setLocalView={setLocalView}
                        onBack={() => setLocalView('menu')}
                    />
                );
            case 'guasti':
                return (
                    <GestioneGuastiView 
                        guasti={guastiAttivi}
                        accettaSegnalazione={accettaSegnalazione}
                        risolviRiparazione={risolviRiparazione}
                        onActionComplete={(msg) => handleSaveSuccess(msg, 'guasti')}
                    />
                );
            case 'riconsegne':
                return (
                    <GestioneRiconsegneView 
                        riconsegne={riconsegneRichieste}
                        accettaRestituzione={accettaRestituzione} 
                        onActionComplete={(msg) => handleSaveSuccess(msg, 'riconsegne')}
                    />
                );
            case 'dettagli-assegnazione':
                return (
                    <DettagliAssegnazioneView
                        assegnazione={selectedItem}
                        onBack={() => setView('gestisci-assegnazioni')}
                        confermaPresaInCarico={confermaPresaInCarico} 
                        segnalaGuasto={segnalaGuasto}
                        richiediRestituzione={richiediRestituzione}
                        onActionSuccess={handleSaveSuccess}
                    />
                );
            case 'menu':
            default:
                return (
                    <AssegnazioniMenuMagazzino
                        setLocalView={setLocalView}
                        conteggioGuasti={guastiAttivi.length}
                        conteggioRiconsegne={riconsegneRichieste.length}
                    />
                );
        }
    };

    return (
        <div className="container mx-auto p-4">
            {message && <div className={`mb-4 p-3 rounded-lg text-center ${message.includes('Errore') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-700'}`}>{message}</div>}
            {renderContent()}
        </div>
    );
};