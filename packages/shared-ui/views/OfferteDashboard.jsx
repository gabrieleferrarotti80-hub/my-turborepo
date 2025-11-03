// packages/shared-ui/views/OfferteDashboard.jsx

import React from 'react';
import { NuovaOffertaForm } from '../forms/NuovaOffertaForm';

/**
 * Vista "stupida" che mostra il cruscotto offerte.
 * Aggiunta logica per gestire la creazione di offerte solo quando un'azienda è selezionata.
 */
export const OfferteDashboard = ({
    offerte = [],
    clients = [],
    onSelectOfferta,
    onAddOfferta,
    isSaving,
    isCompanySelected // <-- ✅ Prop necessaria per la logica di sicurezza
}) => {

    const cardContainerStyle = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '20px',
        marginTop: '20px',
    };
    const cardStyle = {
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '20px',
        backgroundColor: '#ffffff',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    };

    return (
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
            <h1 className="text-2xl font-bold">Menu Principale</h1>
            <div style={cardContainerStyle}>
                {/* Card 1: Nuova Offerta */}
                <div style={cardStyle}>
                    <h3 className="text-xl font-semibold mb-3">Nuova Offerta</h3>
                    
                    {/* --- ✅ LOGICA CONDIZIONALE RIPRISTINATA --- */}
                    {isCompanySelected ? (
                        <>
                            <p className="text-sm text-gray-600 mb-4">Crea una nuova gara o un nuovo preventivo per l'azienda selezionata.</p>
                            <NuovaOffertaForm clients={clients} onSubmit={onAddOfferta} isSaving={isSaving} />
                        </>
                    ) : (
                        <div className="p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-md">
                            <p className="font-bold">Azione non disponibile</p>
                            <p className="text-sm">Per creare una nuova offerta, seleziona un'azienda specifica dal menu in alto a sinistra.</p>
                        </div>
                    )}
                </div>

                {/* Card 2: Elaborate */}
                <div style={cardStyle}>
                    <h3 className="text-xl font-semibold mb-3">Elaborate</h3>
                    <p className="text-sm text-gray-600 mb-4">Visualizza le offerte che sono state inviate o sono in attesa di risposta.</p>
                    <p className="text-3xl font-bold">{offerte.filter(o => o.stato === 'inviata' || o.stato === 'in_approvazione').length}</p>
                </div>

                {/* Card 3: Archivio */}
                <div style={cardStyle}>
                    <h3 className="text-xl font-semibold mb-3">Archivio</h3>
                    <p className="text-sm text-gray-600 mb-4">Consulta le offerte concluse, accettate, rifiutate o archiviate.</p>
                    <p className="text-3xl font-bold">{offerte.filter(o => ['accettata', 'rifiutata', 'archiviata'].includes(o.stato)).length}</p>
                </div>
            </div>
        </div>
    );
};