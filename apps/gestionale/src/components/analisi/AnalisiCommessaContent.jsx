import React from 'react';
import { useFirebaseData, useAnalisiCommessaManager } from 'shared-core';
import { AnalisiCommessaDashboard } from 'shared-ui'; // ✅ Rimosso ConfigurazioneCostiModal

export const AnalisiCommessaContent = ({ onNavigateBack }) => {
    
    const { data, loadingData, userAziendaId } = useFirebaseData();
    const currentCompany = (data.companies || []).find(c => c.id === userAziendaId);
    // 🌟 ORA LEGGE SIA I VECCHI CHE I NUOVI PARAMETRI
    const settings = { 
        ...currentCompany?.costSettings, 
        ...currentCompany?.impostazioni, 
        ...currentCompany 
    };
   const { 
        analisi, 
        listaCantieriAnalizzati,
        filtroCantiereId, 
        setFiltroCantiereId,
        dateRange,
        setDateRange,
        capacityPlanning
    } = useAnalisiCommessaManager(
        data.cantieri || [],
        data.fatture || [],
        data.fatture_acquisto || [],
        data.presenze || [],
        data.offerte || [],
        data.programmazione || [],
        data.users || [],
        data.attrezzature || [],
        settings,
        data.assegnazioniCantieri || [],
        data.movimenti_magazzino || [],
        data.reports || [],
        data.sal || [] 
    );

    if (loadingData) return <div className="p-8 text-center">Caricamento dati...</div>;

    return (
        <AnalisiCommessaDashboard
            cantieri={data.cantieri || []}
            analisi={analisi}
            listaCantieriAnalizzati={listaCantieriAnalizzati}
            filtroCantiereId={filtroCantiereId}
            setFiltroCantiereId={setFiltroCantiereId}
            dateRange={dateRange}
            setDateRange={setDateRange}
            onNavigateBack={onNavigateBack}
            capacityPlanning={capacityPlanning} 
            // ✅ Rimossa la prop onOpenSettings
        />
    );
};