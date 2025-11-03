import React from 'react';
import { useFirebaseData } from 'shared-core';
import { AuthScreen } from './AuthScreen.jsx';
import { DashboardLayout } from './DashboardLayout.jsx';

export const App = () => {
    // Ora questa chiamata funziona, perché App è un figlio di FirebaseProvider (in index.jsx)
    const { user, loadingAuth } = useFirebaseData();

    if (loadingAuth) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (!user) {
        return <AuthScreen />;
    }

    return <DashboardLayout />;
};

