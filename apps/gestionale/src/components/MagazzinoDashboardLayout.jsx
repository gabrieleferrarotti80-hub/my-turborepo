import React, { useState } from 'react';
import { useFirebaseData } from 'shared-core'; 
import { AziendaSelector } from '../AziendaSelector.jsx'; 

// Importiamo le tue viste originali e intatte! Nessuna logica interna viene toccata.
import { AttrezzatureView } from '../AttrezzatureView.jsx';
import { AssegnazioniView } from '../AssegnazioniView.jsx';
import { MagazzinoMaterialiView } from './MagazzinoMaterialiView.jsx';
import { ManutenzioniContent } from './manutenzioni/ManutenzioniContent.jsx';

import { 
    ArchiveBoxIcon, 
    WrenchScrewdriverIcon, 
    CubeIcon, 
    ClipboardDocumentListIcon, 
    ClockIcon,
    ArrowLeftIcon
} from '@heroicons/react/24/outline';

export const MagazzinoDashboardLayout = ({ onBack }) => {
    const { companyFeatures, userRole } = useFirebaseData();
    // Lo stato gestisce semplicemente quale componente montare, niente di più.
    const [activeTab, setActiveTab] = useState('attrezzature'); 

    const renderSubView = () => {
        switch (activeTab) {
            case 'attrezzature':
                return <AttrezzatureView />;
            case 'materiali':
                return <MagazzinoMaterialiView />;
            case 'assegnazioni':
                return <AssegnazioniView />;
            case 'manutenzioni':
                return <ManutenzioniContent />;
            default:
                return <div>Vista non trovata</div>;
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 animate-fade-in">
            
            {/* HEADER E TASTO INDIETRO */}
            <div className="bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onBack} 
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors" 
                        title="Torna alla Home"
                    >
                        <ArrowLeftIcon className="h-6 w-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <ArchiveBoxIcon className="h-8 w-8 text-indigo-600" />
                            Gestione Magazzino
                        </h1>
                        <p className="text-sm text-gray-500">Gestione inventario, assegnazioni, resi e manutenzioni.</p>
                    </div>
                </div>

                {/* Selettore Azienda per il SuperAdmin/Proprietario */}
                {userRole === 'proprietario' && (
                    <div>
                        <AziendaSelector />
                    </div>
                )}
            </div>

            {/* BARRA DI NAVIGAZIONE A TABS */}
            <div className="bg-white px-6 border-b border-gray-200 shadow-sm z-10">
                <nav className="flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('attrezzature')}
                        className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                            activeTab === 'attrezzature' 
                            ? 'border-indigo-600 text-indigo-700' 
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <WrenchScrewdriverIcon className="h-5 w-5" />
                        Parco Attrezzature
                    </button>

                    <button
                        onClick={() => setActiveTab('materiali')}
                        className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                            activeTab === 'materiali' 
                            ? 'border-indigo-600 text-indigo-700' 
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <CubeIcon className="h-5 w-5" />
                        Materiali e Consumabili
                    </button>

                    <button
                        onClick={() => setActiveTab('assegnazioni')}
                        className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                            activeTab === 'assegnazioni' 
                            ? 'border-indigo-600 text-indigo-700' 
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <ClipboardDocumentListIcon className="h-5 w-5" />
                        Registro Assegnazioni
                    </button>

                    <button
                        onClick={() => setActiveTab('manutenzioni')}
                        className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                            activeTab === 'manutenzioni' 
                            ? 'border-indigo-600 text-indigo-700' 
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        <ClockIcon className="h-5 w-5" />
                        Scadenze e Officina
                    </button>
                </nav>
            </div>

            {/* CONTENITORE DELLE TUE VISTE ORIGINALI */}
            <div className="flex-1 overflow-y-auto relative bg-gray-50">
                {renderSubView()}
            </div>
            
        </div>
    );
};