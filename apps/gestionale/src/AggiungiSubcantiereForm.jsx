import React, { useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/solid';
import { useFirebaseData } from 'shared-core';
import { useTheme } from 'shared-ui';
import { useCantieriManager } from 'shared-core';
import {ActionButtons} from 'shared-ui';

export const AggiungiSubcantiereForm = ({ onBack }) => {
    // 1. Recupera TUTTE le dipendenze necessarie dal context
    const { db, userAziendaId, userRole, cantieri, companies, loadingData } = useFirebaseData();
    
    // 2. "Inietta" le dipendenze nell'hook condiviso
    const { addSubcantiere, isLoading, error } = useCantieriManager(db, userAziendaId, companies);
    
    const { primaryColor, colorClasses } = useTheme();

    const canWriteData = userRole !== 'proprietario' || !!userAziendaId;
    const [subcantiereData, setSubcantiereData] = useState({ cantiereId: '', descrizione: '', stato: 'attivo' });
    const [indirizzoSelezionato, setIndirizzoSelezionato] = useState('');
    const [message, setMessage] = useState('');

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setSubcantiereData(prevState => ({ ...prevState, [name]: value }));

        if (name === 'cantiereId') {
            const cantiereSelezionato = cantieri.find(c => c.id === value);
            setIndirizzoSelezionato(cantiereSelezionato ? cantiereSelezionato.indirizzo : '');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        const result = await addSubcantiere(subcantiereData);
        setMessage(result.message);
        
        if (result.success) {
            setTimeout(() => onBack(), 2000);
        }
    };

    if (loadingData) {
        return <div>Caricamento dati...</div>; // Sostituisci con un componente di caricamento se necessario
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <ActionButtons onBack={onBack} onSave={handleSubmit} isSaving={isLoading} canSave={canWriteData} />
            
            {message && (
                <div className={`p-4 mb-4 text-center rounded-lg ${message.includes('successo') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {message}
                </div>
            )}

            <form onSubmit={handleSubmit} className="p-8 bg-white rounded-2xl shadow-xl space-y-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2 mb-4">
                    <PlusIcon className="h-6 w-6" /> Aggiungi Fase di Lavoro (Sub-cantiere)
                </h2>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cantiere Principale</label>
                    <select name="cantiereId" value={subcantiereData.cantiereId} onChange={handleInputChange} required className={`w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 ${colorClasses[primaryColor].ring}`} disabled={!canWriteData}>
                        <option value="">Seleziona un cantiere</option>
                        {cantieri.map(c => <option key={c.id} value={c.id}>{c.nomeCantiere}</option>)}
                    </select>
                    {indirizzoSelezionato && <p className="text-xs text-gray-500 mt-1">{indirizzoSelezionato}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione Fase di Lavoro</label>
                    <input type="text" name="descrizione" value={subcantiereData.descrizione} onChange={handleInputChange} required className={`w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 ${colorClasses[primaryColor].ring}`} disabled={!canWriteData} />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stato Iniziale</label>
                    <select name="stato" value={subcantiereData.stato} onChange={handleInputChange} required className={`w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 ${colorClasses[primaryColor].ring}`} disabled={!canWriteData}>
                        <option value="attivo">Attivo</option>
                        <option value="in attesa">In attesa</option>
                        <option value="completato">Completato</option>
                    </select>
                </div>
            </form>
        </div>
    );
};