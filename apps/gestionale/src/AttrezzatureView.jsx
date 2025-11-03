import React, { useState, useMemo } from 'react';
// ✅ CORREZIONE 1: Importa TUTTI i dati da useFirebaseData e le funzioni dagli hook corretti.
import { useFirebaseData, useArticoliManager, useMagazzinoManager } from 'shared-core';
import { useTheme } from 'shared-ui'; 
import { 
    AggiungiArticoloForm, 
    ModificaArticoloForm,
    GestioneMagazzinoView, 
    GestioneArchivioView,
    GestioneGuastiView
} from 'shared-ui'; 

export const AttrezzatureView = () => {
    // ✅ CORREZIONE 2: I DATI provengono da useFirebaseData.
    const { 
        db, user, userAziendaId, companies, 
        loadingAuth, userRole,
        attrezzature: articoli, // Rinominiamo per coerenza interna
        assegnazioniMagazzino: assignedItems,
        archivioAttrezzatura: archivio,
        loadingData
    } = useFirebaseData();
    
    // ✅ CORREZIONE 3: GLI HOOK MANAGER forniscono solo le AZIONI.
    const { addArticolo, updateArticolo, deleteArticolo, isLoading: isArticoloLoading } = useArticoliManager(db, user, userAziendaId);
    const { accettaSegnalazione, risolviRiparazione, dismettiArticolo, isLoading: isGuastoLoading } = useMagazzinoManager(db, user);
    
    // Logica per arricchire i dati (invariata)
    const enrichedArticoli = useMemo(() => {
        if (!articoli || !companies) return [];
        return articoli.map(articolo => {
            const company = companies.find(c => c.id === articolo.companyID);
            return { ...articolo, companyName: company ? company.companyName : 'N/D' };
        });
    }, [articoli, companies]);

    // Prepariamo i dati specifici per la vista Guasti (invariata)
    const segnalazioniInSospeso = useMemo(() => 
        (assignedItems || []).filter(item => item.statoWorkflow === 'guasto segnalato'),
        [assignedItems]
    );
    const itemsInRiparazione = useMemo(() => 
        (articoli || []).filter(item => item.stato === 'in riparazione'),
        [articoli]
    );

    const [view, setView] = useState('magazzino');
    const [selectedItem, setSelectedItem] = useState(null);
    const [message, setMessage] = useState('');
    const { primaryColor, colorClasses } = useTheme();

    const setLocalView = (v, item = null) => {
        setSelectedItem(item);
        setView(v);
        setMessage(''); 
    };

    const handleActionComplete = (msg) => {
        setMessage(msg);
    };
    
    const handleSaveSuccess = (msg) => {
        setMessage(msg); 
        setView('magazzino');
    };

    const handleDeleteArticolo = async (articolo) => {
        if (window.confirm(`Sei sicuro di voler eliminare l'articolo "${articolo.nome}"?`)) {
            const result = await deleteArticolo(articolo);
            setMessage(result.message);
        }
    };

    const renderContent = () => {
        if (loadingAuth || loadingData) {
            return <div className="p-8">Caricamento Attrezzature...</div>;
        }

        switch (view) {
            case 'aggiungi-articolo':
                return <AggiungiArticoloForm onBack={() => setView('magazzino')} onSaveSuccess={handleSaveSuccess} addArticolo={addArticolo} isAdding={isArticoloLoading} />;
            case 'modifica-articolo':
                return <ModificaArticoloForm initialData={selectedItem} onBack={() => setView('magazzino')} onSaveSuccess={handleSaveSuccess} updateArticolo={updateArticolo} isLoading={isArticoloLoading} />;
            case 'archivio':
                return <GestioneArchivioView archivioAttrezzature={archivio} />;
            
            case 'guasti':
                return (
                    <GestioneGuastiView 
                        segnalazioni={segnalazioniInSospeso}
                        articoliInRiparazione={itemsInRiparazione}
                        onActionComplete={handleActionComplete}
                        accettaSegnalazione={accettaSegnalazione}
                        risolviRiparazione={risolviRiparazione}
                        dismettiArticolo={dismettiArticolo}
                    />
                );

            case 'magazzino':
            default:
                return <GestioneMagazzinoView articoli={enrichedArticoli} userRole={userRole} setLocalView={setLocalView} handleDelete={handleDeleteArticolo} />;
        }
    };
    
    const NavButton = ({ targetView, label, activeViews }) => (
        <button onClick={() => setView(targetView)} className={`py-2 px-4 rounded-md font-medium transition-colors ${activeViews.includes(view) ? `${colorClasses[primaryColor].bg} text-white` : 'bg-gray-200 text-gray-800'}`}>
            {label}
        </button>
    );

    return (
        <div className="container mx-auto p-4">
            <div className="flex flex-wrap gap-4 mb-6">
                 <NavButton targetView="magazzino" label="Inventario" activeViews={['magazzino', 'aggiungi-articolo', 'modifica-articolo']} />
                 <NavButton targetView="guasti" label="Gestione Guasti" activeViews={['guasti']} />
                 <NavButton targetView="archivio" label="Archivio Storico" activeViews={['archivio']} />
            </div>
            {message && <div className={`mb-4 p-3 rounded-lg ${message.includes('Errore') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'} text-center`}>{message}</div>}
            {renderContent()}
        </div>
    );
};