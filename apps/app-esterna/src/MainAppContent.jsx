// In: apps/app-esterna/src/MainAppContent.jsx

import React from 'react';
import { useFirebaseData } from 'shared-core';
import { PrepostoMask } from './components/PrepostoMask';
import { TecnicoMask } from './components/TecnicoMask';
import { DipendenteMask } from './components/DipendenteMask.jsx'; // 👈 1. IMPORTA LA NUOVA MASK

export const MainAppContent = ({ handleLogout }) => {
    // 1. Estrai i dati. "user" è GIA' il profilo completo
    //    "data" contiene tutto il resto
    const {
        user, // <-- Questo è il tuo currentUser
        userRole,
        loadingAuth,
        loadingData,
        data // <-- Prendi l'oggetto "data"
    } = useFirebaseData();

    // Estrai ciò che ti serve da "data" in modo sicuro
    const cantieri = data?.cantieri || [];
    const cantieriAssegnati = data?.cantieriAssegnati || []; 
    const eventi = data?.eventi || []; 

    console.log('[DEBUG MainAppContent]', { 
        user, 
        userRole, 
        isLoading: loadingAuth || loadingData 
    });

    // 2. Logica di caricamento Semplice e Corretta
    const isLoading = loadingAuth || loadingData || !user; 

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 animate-spin"></div>
                <h2 className="ml-4 text-gray-700 text-xl font-semibold">Caricamento...</h2>
            </div>
        );
    }

    // 3. CONTROLLO ACCESSO (Ora basato su dati certi)
    // 👈 2. AGGIUNGI 'dipendente' AI RUOLI PERMESSI
    const allowedRoles = ['preposto', 'proprietario', 'tecnico', 'dipendente'];
    const isRoleValid = allowedRoles.includes(userRole);

    if (!user || !isRoleValid) { // Controllo semplificato
        const errorText = user
            ? `Il tuo ruolo (${userRole || 'non definito'}) non è autorizzato.`
            : 'Accesso negato. Utente non autenticato.';

        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
                <div className="bg-white p-8 rounded-3xl shadow-2xl text-center">
                    <h1 className="text-3xl font-bold text-gray-800 mb-4">Accesso Negato</h1>
                    <p className="text-gray-600">{errorText}</p>
                </div>
            </div>
        );
    }

    // 4. LOGICA DI INOLTRO (ROUTING)
    if (userRole === 'preposto' || userRole === 'proprietario') {
        return (
            <PrepostoMask
                user={user}
                userData={user}
                onLogout={handleLogout}
                cantieri={cantieriAssegnati}
                eventi={eventi}
            />
        );
    }

    if (userRole === 'tecnico') {
        return (
            <TecnicoMask
                user={user}
                userData={user}
                onLogout={handleLogout}
                cantieri={cantieri}
                eventi={eventi}
            />
        );
    }

    {/* 👈 3. AGGIUNGI IL BLOCCO PER IL DIPENDENTE */}
    if (userRole === 'dipendente') {
        return (
            <DipendenteMask
                user={user}
                userData={user} // Passiamo l'oggetto utente completo
                onLogout={handleLogout}
            />
        );
    }

    return null; // Fallback
};