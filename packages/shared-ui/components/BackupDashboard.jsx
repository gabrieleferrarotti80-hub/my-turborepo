import React from 'react';
import { ArrowDownTrayIcon, ServerStackIcon, ShieldCheckIcon } from '@heroicons/react/24/solid';

export const BackupDashboard = ({
    onBackup,
    isBackingUp,
    progress,
    onNavigateBack
}) => {
    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                    <ShieldCheckIcon className="h-10 w-10 text-indigo-600" />
                    Centro di Sicurezza e Backup
                </h1>
                <p className="text-gray-600 mt-2">
                    Esegui copie di sicurezza dei dati aziendali. I file generati contengono tutti i dati testuali (Clienti, Cantieri, Fatture, ecc.).
                </p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
                <div className="mx-auto w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mb-6">
                    <ServerStackIcon className="h-10 w-10 text-indigo-600" />
                </div>
                
                <h2 className="text-xl font-bold text-gray-900 mb-2">Backup Completo Database</h2>
                <p className="text-sm text-gray-500 mb-8 max-w-md mx-auto">
                    Scarica un file JSON contenente l'intero database. Conserva questo file in un luogo sicuro (es. Hard Disk esterno o altro Cloud).
                </p>

                {isBackingUp ? (
                    <div className="space-y-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                        <p className="text-indigo-600 font-medium animate-pulse">{progress}</p>
                    </div>
                ) : (
                    <button 
                        onClick={onBackup}
                        className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-indigo-700 hover:shadow-xl transition-all transform hover:-translate-y-1 flex items-center gap-3 mx-auto"
                    >
                        <ArrowDownTrayIcon className="h-6 w-6" />
                        Scarica Backup Ora
                    </button>
                )}

                <div className="mt-8 pt-6 border-t border-gray-100 text-left text-xs text-gray-400">
                    <p><strong>Nota Tecnica:</strong> Questo backup include solo i dati strutturati (testo e numeri). Le immagini e i PDF sono salvati separatamente nel Cloud Storage di Google e sono protetti dai sistemi di ridondanza di Google.</p>
                </div>
            </div>
        </div>
    );
};