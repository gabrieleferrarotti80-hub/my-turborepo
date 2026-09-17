import React from 'react';
import { useFirebaseData } from 'shared-core';

// Importa le dashboard specifiche
import { DashboardTitolare } from './DashboardTitolare.jsx';
import { DashboardAmministrazione } from './DashboardAmministrazione.jsx';
import { DashboardTecnico } from './DashboardTecnico.jsx';
import { DashboardSuperAdmin } from './DashboardSuperAdmin.jsx';

export const DashboardRouter = ({ onNavigate }) => { // <-- 1. Accetta 'onNavigate'
    const { userRole, userAziendaId } = useFirebaseData();
    
    // ... (logica per 'effectiveRole')
    let effectiveRole = userRole;
    if (userRole === 'proprietario' && userAziendaId) {
        effectiveRole = 'titolare-azienda';
    } else if (userRole === 'proprietario') {
        effectiveRole = 'super-admin';
    }

    // Seleziona la dashboard corretta
    switch (effectiveRole) {
        case 'titolare-azienda':
            return <DashboardTitolare onNavigate={onNavigate} />;
            
        case 'amministrazione':
            return <DashboardAmministrazione onNavigate={onNavigate} />; // <-- 2. Passa 'onNavigate'
            
        case 'tecnico':
            return <DashboardTecnico onNavigate={onNavigate} />;

        case 'super-admin':
            return <DashboardSuperAdmin onNavigate={onNavigate} />;
            
        default:
            return <div><h1 className="text-xl font-bold">Dashboard</h1><p>Ruolo non riconosciuto.</p></div>;
    }
};