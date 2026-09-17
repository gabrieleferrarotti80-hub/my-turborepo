import React from 'react';
import { useFirebaseData } from 'shared-core';
import { AuthScreen } from './AuthScreen.jsx';
import { DashboardLayout } from './DashboardLayout.jsx'; 

// 🌟 IMPORTA IL NUOVO PORTALE CLIENTI
// (Assicurati che il percorso sia corretto. Se lo hai salvato nella cartella components:)
import { CustomerPortal } from './components/CustomerPortal'; 

const LoadingScreen = () => (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-500"></div>
    </div>
);

export const App = () => {
    // 🌟 MODIFICA: Ora estraiamo anche il 'userRole' dal database
    const { user, loadingAuth, loadingData, userRole } = useFirebaseData();

    console.log('--- RENDER App.jsx ---', { 
        loadingAuth: loadingAuth, 
        loadingData: loadingData, 
        user: !!user,
        ruolo: userRole // Log utilissimo per vedere al volo chi sta entrando
    });

    // 1. Attesa (Autenticazione O Caricamento Iniziale dei Dati)
    if (loadingAuth || loadingData) {
        return <LoadingScreen />;
    }

    // 2. Utente Loggato (Auth e Dati OK)
    if (user) {
        
        // 🌟 IL BIVIO MAGICO: Se è un cliente, vede SOLO il suo portale
        if (userRole === 'cliente') {
            return <CustomerPortal />;
        }
        
        // Per tutti gli altri (proprietario, amministrazione, operai, ecc...)
        return <DashboardLayout />;
    } 
    
    // 3. Utente Disconnesso
    else {
        return <AuthScreen />;
    }
};