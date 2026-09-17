import React, { useState, useMemo } from 'react';
import { useTheme } from '../context/themeContext.jsx';
import { ArrowLeftIcon, CubeIcon, BuildingOfficeIcon, UserIcon } from '@heroicons/react/24/solid';

export const AssegnaMaterialeForm = ({ 
    onBack, 
    onSaveSuccess, 
    data,
    scaricaMateriale, 
    isAdding,
    initialMaterialeId 
}) => {
    
    const { primaryColor, colorClasses } = useTheme();
    const { cantieri = [], attrezzature = [], users = [] } = data || {}; // ✅ Recupera users

    const materialiDisponibili = useMemo(() => {
        return attrezzature.filter(a => 
            a.tipoArticolo === 'materiale' || a.categoria === 'Materiale'
        );
    }, [attrezzature]);

    const [selectedMaterialeId, setSelectedMaterialeId] = useState(initialMaterialeId || '');
    const [selectedCantiereId, setSelectedCantiereId] = useState('');
    const [selectedUserId, setSelectedUserId] = useState(''); // ✅ Stato per l'utente che ritira
    const [quantita, setQuantita] = useState('');
    const [dataPrelievo, setDataPrelievo] = useState(new Date().toISOString().split('T')[0]);
    const [note, setNote] = useState('');
    const [error, setError] = useState('');

    const selectedMateriale = useMemo(() => 
        materialiDisponibili.find(m => m.id === selectedMaterialeId), 
    [selectedMaterialeId, materialiDisponibili]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const qtaNum = parseFloat(quantita);

        if (!selectedMaterialeId || !selectedCantiereId) {
            setError("Seleziona materiale e cantiere.");
            return;
        }
        if (!qtaNum || qtaNum <= 0) {
            setError("Inserisci una quantità valida.");
            return;
        }
        if (selectedMateriale && qtaNum > (selectedMateriale.quantita || 0)) {
            setError(`Quantità insufficiente. Giacenza attuale: ${selectedMateriale.quantita}`);
            return;
        }

        // Trova il nome di chi ritira
        const utenteRitiro = users.find(u => u.id === selectedUserId);
        const nomeRitiro = utenteRitiro ? `${utenteRitiro.nome} ${utenteRitiro.cognome}` : 'Non specificato';

        const datiScarico = {
            materialeId: selectedMaterialeId,
            cantiereId: selectedCantiereId,
            nomeMateriale: selectedMateriale?.nome || 'N/D',
            nomeCantiere: cantieri.find(c => c.id === selectedCantiereId)?.nomeCantiere || 'N/D',
            quantita: qtaNum,
            data: dataPrelievo,
            // ✅ NUOVI CAMPI
            ritiratoDaId: selectedUserId || null,
            ritiratoDaNome: nomeRitiro,
            note: `${note} - Ritirato da: ${nomeRitiro}`
        };

        const result = await scaricaMateriale(datiScarico);

        if (result.success) {
            onSaveSuccess(result.message);
        } else {
            setError(result.message);
        }
    };

    const labelClass = "block text-sm font-medium text-gray-700 mb-1";
    const inputClass = "w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500";

    return (
        <div className="space-y-6 animate-fade-in p-6 bg-white rounded-2xl shadow-xl max-w-lg mx-auto">
            
            <button onClick={onBack} className={`flex items-center gap-2 ${colorClasses[primaryColor].text} mb-4 hover:underline`}>
                <ArrowLeftIcon className="h-4 w-4" />
                Torna al Magazzino
            </button>

            <div>
                <h2 className="text-2xl font-bold text-gray-800">Sposta Materiale</h2>
                <p className="text-gray-500 text-sm">Trasferisci materiale dalla Sede a un Cantiere.</p>
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* Selettore Materiale */}
                <div>
                    <label className={labelClass}>Materiale</label>
                    <div className="relative">
                        <CubeIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                        <select 
                            value={selectedMaterialeId} 
                            onChange={(e) => setSelectedMaterialeId(e.target.value)}
                            className={`${inputClass} pl-10`}
                            required
                            disabled={!!initialMaterialeId} 
                        >
                            <option value="">-- Seleziona Articolo --</option>
                            {materialiDisponibili.map(m => (
                                <option key={m.id} value={m.id}>
                                    {m.nome} (Disp: {m.quantita} {m.unitaMisura})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Selettore Cantiere */}
                <div>
                    <label className={labelClass}>Cantiere di Destinazione</label>
                    <div className="relative">
                        <BuildingOfficeIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                        <select 
                            value={selectedCantiereId} 
                            onChange={(e) => setSelectedCantiereId(e.target.value)}
                            className={`${inputClass} pl-10`}
                            required
                        >
                            <option value="">-- Seleziona Cantiere --</option>
                            {cantieri.map(c => (
                                <option key={c.id} value={c.id}>{c.nomeCantiere}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* ✅ SELETTORE CHI RITIRA */}
                <div>
                    <label className={labelClass}>Ritiro Effettuato Da</label>
                    <div className="relative">
                        <UserIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                        <select 
                            value={selectedUserId} 
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            className={`${inputClass} pl-10`}
                        >
                            <option value="">-- Seleziona Personale (Opzionale) --</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.nome} {u.cognome}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Quantità */}
                <div>
                    <label className={labelClass}>Quantità da Spostare</label>
                    <div className="flex items-center gap-2">
                        <input 
                            type="number" 
                            step="0.01"
                            value={quantita} 
                            onChange={(e) => setQuantita(e.target.value)}
                            className={inputClass}
                            required
                            placeholder="0.00"
                        />
                        <span className="text-gray-500 font-medium">{selectedMateriale?.unitaMisura || 'pz'}</span>
                    </div>
                </div>

                {/* Note */}
                <div>
                    <label className={labelClass}>Note</label>
                    <textarea 
                        value={note} 
                        onChange={(e) => setNote(e.target.value)} 
                        rows={2} 
                        className={inputClass}
                        placeholder="Opzionale..."
                    />
                </div>

                {/* Footer */}
                <div className="pt-4 flex justify-end gap-3">
                    <button 
                        type="button" 
                        onClick={onBack} 
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300"
                    >
                        Annulla
                    </button>
                    <button 
                        type="submit" 
                        disabled={isAdding} 
                        className={`px-4 py-2 text-white rounded-lg font-medium shadow-md transition-all ${
                            isAdding ? 'bg-gray-400' : `${colorClasses[primaryColor].bg} hover:opacity-90`
                        }`}
                    >
                        {isAdding ? 'Salvataggio...' : 'Conferma Spostamento'}
                    </button>
                </div>

            </form>
        </div>
    );
};