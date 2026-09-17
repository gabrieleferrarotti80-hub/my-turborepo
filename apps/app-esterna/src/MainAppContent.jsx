// In: apps/app-esterna/src/MainAppContent.jsx

import React from 'react';
import { useFirebaseData } from 'shared-core';
import { PrepostoMask } from './components/PrepostoMask';
import { TecnicoMask } from './components/TecnicoMask';
import { DipendenteMask } from './components/DipendenteMask.jsx';

export const MainAppContent = ({ handleLogout }) => {
    // 1. Estrai i dati.
    const {
        user, 
        userRole,
        loadingAuth,
        loadingData,
        data // 🌟 L'oggetto che contiene tutte le collezioni Firebase
    } = useFirebaseData();

    // Estrai ciò che ti serve da "data" in modo sicuro per la logica locale
    const cantieri = data?.cantieri || [];
    const cantieriAssegnati = data?.cantieriAssegnati || []; 
    const eventi = data?.eventi || []; 

    console.log('[DEBUG MainAppContent]', { 
        user, 
        userRole, 
        isLoading: loadingAuth || loadingData 
    });

    // 2. Logica di caricamento
    const isLoading = loadingAuth || loadingData || !user; 

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 animate-spin"></div>
                <h2 className="ml-4 text-gray-700 text-xl font-semibold">Caricamento...</h2>
            </div>
        );
    }

    // 3. CONTROLLO ACCESSO
    const allowedRoles = ['preposto', 'proprietario', 'tecnico', 'dipendente', 'operaio'];
    const isRoleValid = allowedRoles.includes(userRole);

    if (!user || !isRoleValid) { 
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

    // 4. LOGICA DI INOLTRO (ROUTING) - 🌟 AGGIUNTO data={data} OVUNQUE
   if (userRole === 'preposto' || userRole === 'proprietario') {
        console.log('🚀 [ROUTING] Renderizzo PrepostoMask. Data presente:', !!data);
        return (
            <PrepostoMask
                user={user}
                userData={user}
                data={data} 
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
                data={data} // ✅ AGGIUNTO
                onLogout={handleLogout}
                cantieri={cantieri}
                eventi={eventi}
            />
        );
    }

    if (userRole === 'dipendente' || userRole === 'operaio') {
        return (
            <DipendenteMask
                user={user}
                userData={user}
                data={data} // ✅ AGGIUNTO
                onLogout={handleLogout}
            />
        );
    }

    return null; 
};