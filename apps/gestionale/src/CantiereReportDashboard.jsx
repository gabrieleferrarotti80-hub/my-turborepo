import React, { useState } from 'react';
// ✅ CORREZIONE: Importa 'useFirebaseData' per leggere i permessi e il ruolo
import { useFirebaseData, useCantiereReportGenerator } from 'shared-core';
import { CantiereReportOverview, CantiereReportDetailView } from 'shared-ui';

export const CantiereReportDashboard = () => {
    // 1. Recupera i dati grezzi, i permessi E il ruolo utente
    const { 
        cantieri, 
        assegnazioniCantieri, 
        reports, 
        reportTecnico, 
        users, 
        attrezzature,
        companyFeatures,
        userRole // Aggiunto per il controllo dei permessi
    } = useFirebaseData();

    // 2. Inietta i dati grezzi nel nostro "detective" (invariato)
    const { fullReport, isLoading: isReportLoading } = useCantiereReportGenerator(
        cantieri, assegnazioniCantieri, reports, reportTecnico, users, attrezzature
    );

    // 3. Stato locale per gestire la vista (invariato)
    const [selectedCantiereReport, setSelectedCantiereReport] = useState(null);

    // ✅ 4. NUOVA LOGICA DI CONTROLLO PERMESSI
    // Il proprietario ha sempre accesso.
    const isProprietario = userRole === 'proprietario';
    // Per gli altri, controlliamo le features dell'azienda.
    const hasFeaturePermission = companyFeatures?.reports_cantiere === true;
    
    const hasPermission = isProprietario || hasFeaturePermission;
    
    // Lo stato di caricamento dei permessi si applica solo se non siamo il proprietario
    // e l'oggetto delle features non è ancora stato caricato.
    const permissionsLoading = !isProprietario && companyFeatures === null;

    if (permissionsLoading) {
        return <div>Caricamento permessi...</div>;
    }
    
    if (!hasPermission) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-xl font-bold text-red-600">Accesso Negato</h2>
                <p className="text-gray-600 mt-2">Non hai i permessi per visualizzare i report completi dei cantieri.</p>
            </div>
        );
    }
    
    if (isReportLoading) {
        return <div>Generazione del report in corso...</div>;
    }

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6">Report Completo Cantieri</h1>
            
            {selectedCantiereReport ? (
                // Vista di Dettaglio
                <CantiereReportDetailView 
                    report={selectedCantiereReport}
                    onBack={() => setSelectedCantiereReport(null)}
                />
            ) : (
                // Vista d'Insieme
                <CantiereReportOverview 
                    reports={fullReport}
                    onSelectCantiere={setSelectedCantiereReport}
                />
            )}
        </div>
    );
};