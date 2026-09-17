import React from 'react';
import { useFirebaseData, useScadenziarioManager } from 'shared-core';
import { ScadenziarioDashboard } from 'shared-ui';

export const ScadenziarioContent = ({ onNavigateBack }) => {
    
    const { data, loadingData } = useFirebaseData();
    
    // Passa le due liste di dati grezzi all'hook di logica
    const { 
        scadenze, 
        totali, 
        filtroPeriodo, 
        setFiltroPeriodo 
    } = useScadenziarioManager(
        data.fatture || [],          // Fatture Vendita
        data.fatture_acquisto || []  // Fatture Acquisto
    );

    if (loadingData) {
        return <div className="p-8 text-center">Caricamento dati...</div>;
    }

    return (
        <ScadenziarioDashboard
            scadenze={scadenze}
            totali={totali}
            filtroPeriodo={filtroPeriodo}
            setFiltroPeriodo={setFiltroPeriodo}
            onNavigateBack={onNavigateBack}
        />
    );
};