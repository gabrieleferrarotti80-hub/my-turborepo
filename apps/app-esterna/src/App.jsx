// Percorso: apps/app-esterna/src/App.jsx

import React from 'react';
import { signOut } from 'firebase/auth';
import { useFirebaseData } from 'shared-core'; 
import { LoginScreen } from './components/LoginScreen';
import { MainAppContent } from './MainAppContent';

export function App() {
    // Usa useFirebaseData SOLO per sapere se l'utente esiste e per il logout.
    const { user, loadingAuth, auth } = useFirebaseData();

    const handleLogout = () => {
        if (auth) {
            signOut(auth);
        }
    };

    // Questo caricamento è solo per l'autenticazione base.
    if (loadingAuth) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col"> 
            {user ? (
                // ✅ NON passa più 'currentUser'. Passa solo la funzione di logout.
                <MainAppContent handleLogout={handleLogout} />
            ) : (
                <LoginScreen />
            )}
        </div>
    );
}