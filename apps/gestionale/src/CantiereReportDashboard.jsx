// File: apps/gestionale/src/CantiereReportDashboard.jsx
import React, { useState } from 'react';
import { useCantiereReportGenerator } from 'shared-core';
import { CantiereReportOverview, CantiereReportDetailView } from 'shared-ui';
import { ArrowPathIcon, ListBulletIcon } from '@heroicons/react/24/solid';

// 🌟 IMPORTA IL NUOVO COMPONENTE (Assicurati che il percorso sia corretto)
import { GlobalReportLavori } from './GlobalReportLavori'; 

export const CantiereReportDashboard = ({ data, loadingData, userRole, companyFeatures }) => {
    
    const {
        cantieri = [], 
        assegnazioniCantieri = [], 
        reports = [], 
        reportTecnico = [], 
        users = [], 
        attrezzature = [],
    } = data || {}; 

    const { fullReport, isLoading: isReportLoading } = useCantiereReportGenerator(
        cantieri, assegnazioniCantieri, reports, reportTecnico, users, attrezzature
    );

    const [selectedCantiereReport, setSelectedCantiereReport] = useState(null);
    const [viewGlobalLog, setViewGlobalLog] = useState(false);

    // --- LOGICA PERMESSI ---
    const isProprietario = userRole === 'proprietario';
    const hasFeaturePermission = companyFeatures?.reports_cantiere === true;
    const hasPermission = isProprietario || hasFeaturePermission;
    
    // 🌟 NUOVO: Permesso ESCLUSIVO per il Titolare e l'Amministrazione
    const canViewGlobalReport = ['proprietario', 'titolare-azienda', 'amministrazione'].includes(userRole);
    
    if (loadingData || isReportLoading) {
        return (
            <div className="flex justify-center items-center h-48">
                <ArrowPathIcon className="animate-spin h-8 w-8 text-indigo-500" />
                <span className="ml-4 text-gray-500">Generazione del report in corso...</span>
            </div>
        );
    }
    
    if (!hasPermission) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-xl font-bold text-red-600">Accesso Negato</h2>
                <p className="text-gray-600 mt-2">Non hai i permessi per visualizzare i report completi dei cantieri.</p>
            </div>
        );
    }
    
    // 🌟 SE LA VISTA GLOBALE È ATTIVA E L'UTENTE È AUTORIZZATO
    if (viewGlobalLog && canViewGlobalReport) {
        return (
            <GlobalReportLavori 
                reports={reports}
                cantieri={cantieri}
                users={users}
                userRole={userRole}
                onBack={() => setViewGlobalLog(false)}
            />
        );
    }

    return (
        <div className="p-8 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Report Completo Cantieri</h1>
                
                {/* 🌟 IL BOTTONE APPARE SOLO PER TITOLARE E AMMINISTRAZIONE */}
                {!selectedCantiereReport && canViewGlobalReport && (
                    <button 
                        onClick={() => setViewGlobalLog(true)}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 font-bold shadow-md transition-colors"
                    >
                        <ListBulletIcon className="h-5 w-5" />
                        Registro Cronologico Lavori
                    </button>
                )}
            </div>
            
            {selectedCantiereReport ? (
                <CantiereReportDetailView 
                    report={selectedCantiereReport}
                    rawReports={reports}
                    onBack={() => setSelectedCantiereReport(null)}
                />
            ) : (
                <CantiereReportOverview 
                    reports={fullReport}
                    onSelectCantiere={setSelectedCantiereReport}
                />
            )}
        </div>
    );
};