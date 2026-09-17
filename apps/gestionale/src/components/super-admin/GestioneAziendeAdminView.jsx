import React, { useState } from 'react';
import { SuperAdminNavbar } from './SuperAdminNavbar'; 
import { AziendeDashboard } from './AziendeDashboard';
import { CreaAziendaView } from './CreaAziendaView'; 
import { GestionePermessiView } from '../GestionePermessiView'; 
import { DettaglioAziendaView } from './DettaglioAziendaView'; // <-- IMPORT NUOVO FILE

export const GestioneAziendeAdminView = () => {
    const [view, setView] = useState('dashboard');
    const [selectedCompanyId, setSelectedCompanyId] = useState(null); // <-- STATO NUOVO

    // Funzione handler quando si clicca una riga nella dashboard
    const handleEditCompany = (companyId) => {
        setSelectedCompanyId(companyId);
        setView('dettaglio-azienda');
    };

    const renderContent = () => {
        switch (view) {
            case 'dashboard':
                // Passiamo la prop alla dashboard!
                return <AziendeDashboard onEditCompany={handleEditCompany} />;
            
            case 'dettaglio-azienda':
                // Mostriamo il dettaglio passando l'ID e il tasto indietro
                return <DettaglioAziendaView 
                            companyId={selectedCompanyId} 
                            onBack={() => setView('dashboard')} 
                        />;
                        
            case 'crea-azienda':
                return <CreaAziendaView />; 
            
            case 'autorizzazioni':
                return <GestionePermessiView />; 
                
            default:
                return <AziendeDashboard onEditCompany={handleEditCompany} />;
        }
    };

    return (
        <div className="flex flex-col w-full h-full bg-slate-50 overflow-hidden font-sans">
            <SuperAdminNavbar 
                activeView={view}
                onNavigate={setView}
            />
            <main className="flex-1 overflow-y-auto relative">
                <div className="absolute inset-0 p-6 md:p-8">
                    {renderContent()}
                </div>
            </main>
        </div>
    );
};