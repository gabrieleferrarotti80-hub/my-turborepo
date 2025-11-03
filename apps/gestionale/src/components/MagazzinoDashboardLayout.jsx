// Percorso: apps/gestionale/src/MagazzinoDashboardLayout.jsx

import React, { useState } from 'react';
import { MagazzinoSidebar } from 'shared-ui';
import { useFirebaseData } from 'shared-core'; 
import { AziendaSelector } from '../AziendaSelector.jsx'; 

// Importa le viste esistenti
import { AttrezzatureView } from '../AttrezzatureView.jsx';
import { AssegnazioniView } from '../AssegnazioniView.jsx';
// ✅ 1. IMPORTA la nuova vista per i materiali
import { MagazzinoMaterialiView } from './MagazzinoMaterialiView.jsx'; // Assicurati che il percorso sia corretto

export const MagazzinoDashboardLayout = ({ onBack }) => {
    const { companyFeatures, userRole } = useFirebaseData();
    const [subView, setSubView] = useState('attrezzature'); 

    const renderSubView = () => {
        switch (subView) {
            case 'attrezzature':
                return <AttrezzatureView />;
            
            // ✅ 2. SOSTITUISCI il placeholder con il componente importato
            case 'materiali':
                return <MagazzinoMaterialiView />;

            case 'assegnazioni':
                return <AssegnazioniView />;
                
            default:
                return (
                    <div className="p-8">
                        <h1 className="text-xl font-bold text-red-500">Vista non trovata</h1>
                        <p>Seleziona una voce dal menu a sinistra.</p>
                    </div>
                );
        }
    };

    return (
        <div className="flex h-screen w-full bg-gray-100">
            <aside className="w-72 bg-gray-800 flex flex-col shrink-0">
                {userRole === 'proprietario' && <AziendaSelector />}
                <div className="flex-grow">
                    <MagazzinoSidebar 
                        activeSubView={subView} 
                        onNavigate={setSubView} 
                        onBack={onBack}
                        companyFeatures={companyFeatures} 
                        userRole={userRole}
                    />
                </div>
            </aside>
            
            <main className="flex-1 overflow-y-auto">
                {renderSubView()}
            </main>
        </div>
    );
};