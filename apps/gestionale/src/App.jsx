import React from 'react';
import { useFirebaseData } from 'shared-core';
import { AuthScreen } from './AuthScreen.jsx';
import { DashboardLayout } from './DashboardLayout.jsx'; // Assicurati che l'import sia corretto { }

const LoadingScreen = () => (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-500"></div>
    </div>
);

export const App = () => {
    // ✅ MODIFICA: Includiamo loadingData
    const { user, loadingAuth, loadingData } = useFirebaseData();

    console.log('--- RENDER App.jsx ---', { 
        loadingAuth: loadingAuth, 
        // ✅ Aggiunta loadingData al log
        loadingData: loadingData, 
        user: !!user 
    });

    // 1. Attesa (Autenticazione O Caricamento Iniziale dei Dati)
    // Dobbiamo aspettare che entrambi i flag siano falsi PRIMA di decidere.
    if (loadingAuth || loadingData) {
        return <LoadingScreen />;
    }

    // 2. Utente Loggato (Auth e Dati OK)
    if (user) {
        return <DashboardLayout />;
    } 
    
    // 3. Utente Disconnesso (Auth e Dati OK, ma user nullo)
    else {
        return <AuthScreen />;
    }
};