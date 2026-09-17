import React, { useState, useEffect } from 'react';
import { 
    ShieldCheckIcon, 
    UserGroupIcon, 
    DocumentCheckIcon,
    AcademicCapIcon
} from '@heroicons/react/24/outline';

import { SicurezzaContent } from '../components/sicurezza/SicurezzaContent'; 

const SicurezzaManagerView = () => {
    // Legge la memoria ma NON la cancella subito
    const [activeTab, setActiveTab] = useState(() => {
        return localStorage.getItem('sicurezzaActiveTab') || 'formazione';
    });

    // Cancella la memoria SOLO DOPO che la pagina si è mostrata a schermo
    useEffect(() => {
        if (localStorage.getItem('sicurezzaActiveTab')) {
            localStorage.removeItem('sicurezzaActiveTab');
        }
    }, []);

    return (
        <div className="flex flex-col h-full bg-gray-50 animate-fade-in">
            
            {/* Header */}
            <div className="bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <ShieldCheckIcon className="h-8 w-8 text-green-600" />
                        Sicurezza & Formazione
                    </h1>
                    <p className="text-sm text-gray-500">Monitoraggio globale scadenze, DPI e documentazione obbligatoria.</p>
                </div>
            </div>

            {/* 3 Tab Navigation */}
            <div className="bg-white px-6 border-b border-gray-200">
                <nav className="flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('formazione')}
                        className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'formazione' ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <AcademicCapIcon className="h-5 w-5" />
                        Matrice Formazione
                    </button>

                    <button
                        onClick={() => setActiveTab('dpi')}
                        className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'dpi' ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <UserGroupIcon className="h-5 w-5" />
                        Registro DPI
                    </button>

                    <button
                        onClick={() => setActiveTab('pos')}
                        className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'pos' ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <DocumentCheckIcon className="h-5 w-5" />
                        Gestione POS
                    </button>
                </nav>
            </div>

            {/* Contenuto Dinamico delegato a SicurezzaContent */}
            <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'formazione' && <SicurezzaContent view="formazione" />}
                {activeTab === 'dpi' && <SicurezzaContent view="dpi" />}
                {activeTab === 'pos' && <SicurezzaContent view="pos" />}
            </div>
        </div>
    );
};

export default SicurezzaManagerView;