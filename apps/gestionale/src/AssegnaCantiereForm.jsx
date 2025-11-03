import React, { useState, useMemo } from 'react';
import { useFirebaseData } from 'shared-core';
// ✅ MODIFICA: Importa l'hook dal pacchetto 'shared-core'
import { useAssegnazioniCantieriManager } from 'shared-core';
import { useTheme } from 'shared-ui';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';

export const AssegnaCantiereForm = ({ onBack, onSaveSuccess }) => {

// (l'export default a fine file viene rimosso)
    // 1. Riceve i dati globali dalla nostra Fonte Unica di Verità
    const { db, user, userAziendaId, cantieri, users, attrezzature } = useFirebaseData();
    const { createAssegnazioneCantiere, isLoading } = useAssegnazioniCantieriManager(db, user, userAziendaId, users, cantieri);
    const { primaryColor, colorClasses } = useTheme();

    // 3. Stato locale limitato alla gestione del form
    const [selectedCantiereId, setSelectedCantiereId] = useState('');
    const [selectedPrepostoId, setSelectedPrepostoId] = useState('');
    const [selectedOperaiIds, setSelectedOperaiIds] = useState([]);
    const [selectedAutomezziIds, setSelectedAutomezziIds] = useState([]);
    const [message, setMessage] = useState('');

    // 4. Filtra i dati ricevuti per popolare i menu a tendina in modo efficiente
    const preposti = useMemo(() => users.filter(u => ['preposto', 'titolare-azienda', 'proprietario'].includes(u.ruolo)), [users]);
    const operai = useMemo(() => users.filter(u => u.ruolo === 'operatore'), [users]);
    const automezzi = useMemo(() => attrezzature.filter(a => a.categoria === 'Automezzo' && a.stato === 'disponibile'), [attrezzature]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        // 5. Delega tutta la logica di salvataggio all'hook
        const result = await createAssegnazioneCantiere({
            cantiereId: selectedCantiereId,
            prepostoId: selectedPrepostoId,
            operaiIds: selectedOperaiIds,
            automezziIds: selectedAutomezziIds,
        });

        if (result.success) {
            onSaveSuccess(result.message);
        } else {
            setMessage(result.message);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in p-6 bg-white rounded-2xl shadow-xl">
            <button onClick={onBack} className={`flex items-center gap-2 ${colorClasses[primaryColor].text} mb-4 hover:underline`}>
                <ArrowLeftIcon className="h-4 w-4" />
                Torna Indietro
            </button>
            <h2 className="text-3xl font-bold text-gray-800">Assegna Squadra a Cantiere</h2>

            {message && (
                <div className={`p-4 rounded-lg text-sm text-center ${message.includes('successo') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {message}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* I selettori ora usano i dati passati dal contesto */}
                <div>
                    <label className="block text-gray-700 font-medium mb-1">Cantiere</label>
                    <select value={selectedCantiereId} onChange={(e) => setSelectedCantiereId(e.target.value)} required className="w-full p-2 border border-gray-300 rounded-lg">
                        <option value="">-- Seleziona un cantiere --</option>
                        {cantieri.map(c => <option key={c.id} value={c.id}>{c.nomeCantiere}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-gray-700 font-medium mb-1">Preposto Responsabile</label>
                    <select value={selectedPrepostoId} onChange={(e) => setSelectedPrepostoId(e.target.value)} required className="w-full p-2 border border-gray-300 rounded-lg">
                        <option value="">-- Seleziona un preposto --</option>
                        {preposti.map(p => <option key={p.id} value={p.id}>{p.nome} {p.cognome}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-gray-700 font-medium mb-1">Operai</label>
                    <select multiple value={selectedOperaiIds} onChange={(e) => setSelectedOperaiIds(Array.from(e.target.selectedOptions, option => option.value))} className="w-full p-2 border border-gray-300 rounded-lg h-32">
                        {operai.map(o => <option key={o.id} value={o.id}>{o.nome} {o.cognome}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-gray-700 font-medium mb-1">Automezzi</label>
                    <select multiple value={selectedAutomezziIds} onChange={(e) => setSelectedAutomezziIds(Array.from(e.target.selectedOptions, option => option.value))} className="w-full p-2 border border-gray-300 rounded-lg h-32">
                        {automezzi.map(a => <option key={a.id} value={a.id}>{a.dettagli.targa} - {a.nome}</option>)}
                    </select>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                    <button type="submit" disabled={isLoading} className={`py-2 px-6 rounded-lg font-medium text-white transition-colors ${isLoading ? 'bg-gray-400' : `${colorClasses[primaryColor].bg} hover:opacity-90`}`}>
                        {isLoading ? 'Salvataggio...' : 'Crea Assegnazione'}
                    </button>
                </div>
            </form>
        </div>
    );
};



