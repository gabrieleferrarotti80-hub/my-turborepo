// src/components/ReportDashboard.jsx

import React, { useState } from 'react';
// 🛑 RIMUOVIAMO GLI IMPORT NON USATI (se ce n'erano)
import ReportView from '../ReportView.jsx';
import ArchivioTecniciView from './ArchivioTecniciView.jsx';
import EditReportForm from './EditReportForm.jsx';
import EditReportTecnicoForm from './EditReportTecnicoForm.jsx';
import { UserGroupIcon, WrenchScrewdriverIcon, ArrowPathIcon } from '@heroicons/react/24/solid';

// --- ✅ 1. Accetta TUTTE le props dal genitore ---
export const ReportDashboard = ({ data, loadingData, userRole, companyFeatures }) => {
    const [view, setView] = useState({ mode: 'menu', data: null });
    const [searchTerm, setSearchTerm] = useState('');

    // --- ✅ 2. Estrai i dati necessari (questo era già corretto) ---
    const reports = data?.reports || [];
    const reportTecnico = data?.reportTecnico || [];

    // --- Funzioni per Report Squadre ---
    const handleEditReport = (reportToEdit) => {
        setView({ mode: 'edit_squadra', data: reportToEdit });
    };
    const handleCloseForm = () => {
        setView({ mode: 'squadre', data: null });
    };

    // --- Funzioni per Report Tecnici ---
    const handleEditReportTecnico = (reportToEdit) => {
        setView({ mode: 'edit_tecnico', data: reportToEdit });
    };
    const handleCloseFormTecnico = () => {
        setView({ mode: 'tecnici', data: null });
    };

    // --- ✅ 3. Controllo di caricamento (già corretto) ---
    if (loadingData) {
        return (
            <div className="flex justify-center items-center h-48">
                <ArrowPathIcon className="animate-spin h-8 w-8 text-indigo-500" />
                <span className="ml-4 text-gray-500">Caricamento report...</span>
            </div>
        );
    }

    // --- Logica di Rendering ---

    if (view.mode === 'edit_squadra') {
        return <EditReportForm 
            reportData={view.data} 
            onClose={handleCloseForm} 
        />;
    }

    if (view.mode === 'edit_tecnico') {
        return <EditReportTecnicoForm
            reportData={view.data}
            onClose={handleCloseFormTecnico}
        />;
    }

    // --- ✅ 4. CORREZIONE VISTA SQUADRE ---
    if (view.mode === 'squadre') {
        return <ReportView 
            onBack={() => setView({ mode: 'menu', data: null })}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onEdit={handleEditReport}
            // --- Aggiungi le props mancanti ---
            reports={reports} 
            userRole={userRole}
            companyFeatures={companyFeatures}
        />;
    }

    // --- ✅ 5. CORREZIONE VISTA TECNICI (causa del crash) ---
    if (view.mode === 'tecnici') {
        return <ArchivioTecniciView 
            onBack={() => setView({ mode: 'menu', data: null })} 
            onEdit={handleEditReportTecnico}
            // --- Aggiungi la prop mancante ---
            reportTecnico={reportTecnico}
        />;
    }

    // Vista Menu (default)
    return (
        <div className="p-8 space-y-6 animate-fade-in">
            <h1 className="text-4xl font-bold text-gray-800">Archivio Report</h1>
            {/* ... (resto del menu invariato) ... */}
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