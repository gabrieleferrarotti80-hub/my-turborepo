// src/components/ReportDashboard.jsx

import React, { useState } from 'react';
import ReportView from '../ReportView.jsx';
import ArchivioTecniciView from './ArchivioTecniciView.jsx';
import EditReportForm from './EditReportForm.jsx';
import EditReportTecnicoForm from './EditReportTecnicoForm.jsx'; // <-- 1. Import del nuovo form (da creare)
import { UserGroupIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/solid';

export const ReportDashboard = () => {
    const [view, setView] = useState({ mode: 'menu', data: null });
    const [searchTerm, setSearchTerm] = useState('');

    // --- Funzioni per Report Squadre ---
    const handleEditReport = (reportToEdit) => {
        setView({ mode: 'edit_squadra', data: reportToEdit });
    };
    const handleCloseForm = () => {
        setView({ mode: 'squadre', data: null });
    };

    // --- 2. Aggiunte nuove funzioni per Report Tecnici ---
    const handleEditReportTecnico = (reportToEdit) => {
        setView({ mode: 'edit_tecnico', data: reportToEdit });
    };
    const handleCloseFormTecnico = () => {
        setView({ mode: 'tecnici', data: null });
    };

    // --- Logica di Rendering ---

    // Vista per Modifica Report Squadra
    if (view.mode === 'edit_squadra') {
        return <EditReportForm 
            reportData={view.data} 
            onClose={handleCloseForm} 
        />;
    }

    // <-- 3. Aggiunta logica di rendering per Modifica Report Tecnico -->
    if (view.mode === 'edit_tecnico') {
        return <EditReportTecnicoForm
            reportData={view.data}
            onClose={handleCloseFormTecnico}
        />;
    }

    // Vista per Lista Report Squadre
    if (view.mode === 'squadre') {
        return <ReportView 
            onBack={() => setView({ mode: 'menu', data: null })}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onEdit={handleEditReport} 
        />;
    }

    // Vista per Lista Report Tecnici
    if (view.mode === 'tecnici') {
        // <-- 4. Collegato il pulsante "Modifica" alla sua funzione -->
        return <ArchivioTecniciView 
            onBack={() => setView({ mode: 'menu', data: null })} 
            onEdit={handleEditReportTecnico}
        />;
    }

    // Vista Menu (default)
    return (
        <div className="p-8 space-y-6 animate-fade-in">
            <h1 className="text-4xl font-bold text-gray-800">Archivio Report</h1>
            <p className="text-gray-600">Seleziona la categoria di report che desideri consultare.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <button 
                    onClick={() => setView({ mode: 'squadre', data: null })}
                    className="p-8 bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-shadow text-left"
                >
                    <UserGroupIcon className="h-10 w-10 text-blue-500 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800">Report Squadre</h2>
                    <p className="text-gray-500 mt-2">Visualizza i report di avanzamento lavori inviati dalle squadre sul campo.</p>
                </button>

                <button 
                    onClick={() => setView({ mode: 'tecnici', data: null })}
                    className="p-8 bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-shadow text-left"
                >
                    <WrenchScrewdriverIcon className="h-10 w-10 text-green-500 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800">Report Tecnici</h2>
                    <p className="text-gray-500 mt-2">Consulta i report di controllo e manutenzione compilati dai tecnici.</p>
                </button>
            </div>
        </div>
    );
};

