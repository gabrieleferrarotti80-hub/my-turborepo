import React, { useState, useMemo } from 'react';
import { ArrowLeftIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { useTheme } from '../context/themeContext.jsx'; 

export const AssegnaAttrezzaturaForm = ({ onBack, onSaveSuccess, dipendenti, magazzino, creaAssegnazioniMultiple, isLoading }) => {
    
    const { primaryColor, colorClasses } = useTheme();

    const [selectedDipendente, setSelectedDipendente] = useState('');
    const [righeAssegnazione, setRigheAssegnazione] = useState([{ id: 1, attrezzaturaId: '', categoriaSelezionata: '' }]);
    const [message, setMessage] = useState('');

    const handleAddRiga = () => {
        setRigheAssegnazione([...righeAssegnazione, { id: Date.now(), attrezzaturaId: '', categoriaSelezionata: '' }]);
    };

    const handleRemoveRiga = (id) => {
        setRigheAssegnazione(righeAssegnazione.filter(riga => riga.id !== id));
    };

    const handleRigaChange = (id, field, value) => {
        const nuoveRighe = righeAssegnazione.map(riga => {
            if (riga.id === id) {
                const updatedRiga = { ...riga, [field]: value };
                if (field === 'categoriaSelezionata') {
                    updatedRiga.attrezzaturaId = '';
                }
                return updatedRiga;
            }
            return riga;
        });
        setRigheAssegnazione(nuoveRighe);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        const attrezzatureIDs = righeAssegnazione
            .map(r => r.attrezzaturaId)
            .filter(id => id !== '');

        if (!selectedDipendente) {
            setMessage('Errore: Selezionare un dipendente.');
            return;
        }
        if (attrezzatureIDs.length === 0 || attrezzatureIDs.length !== righeAssegnazione.length) {
            setMessage('Errore: Selezionare un articolo per ogni riga.');
            return;
        }

        try {
            const result = await creaAssegnazioniMultiple({ utenteID: selectedDipendente, attrezzatureIDs });
            
            if (result.success) {
                onSaveSuccess(result.message);
            } else {
                 setMessage(`Errore: ${result.message}`);
            }
        } catch (error) {
            setMessage(`Errore: ${error.message}`);
        }
    };

    const attrezzatureDisponibili = magazzino.filter(item => item.stato === 'disponibile');
    const idSelezionati = righeAssegnazione.map(r => r.attrezzaturaId);
    
    const categorieUniche = useMemo(() => 
        [...new Set(attrezzatureDisponibili.map(item => item.categoria).filter(Boolean))],
        [attrezzatureDisponibili]
    );

    return (
        <div className="space-y-6 animate-fade-in p-6 bg-white rounded-2xl shadow-xl max-w-4xl mx-auto">
            <button onClick={onBack} className={`flex items-center gap-2 ${colorClasses[primaryColor].text} mb-4 hover:underline`}>
                <ArrowLeftIcon className="h-4 w-4" />
                Torna al menu Assegnazioni
            </button>
            <h2 className="text-3xl font-bold text-gray-800">Assegna Attrezzature</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* ✅ SELEZIONE DIPENDENTE MIGLIORATA */}
                <div className="border p-4 rounded-lg bg-gray-50 space-y-3">
                    <label className="block text-gray-700 font-medium">Assegna a:</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                        <select
                            value={selectedDipendente}
                            onChange={(e) => setSelectedDipendente(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg col-span-2"
                            required
                        >
                            <option value="">-- Seleziona un dipendente --</option>
                            {dipendenti.map(dipendente => (
                                <option key={dipendente.id} value={dipendente.id}>
                                    {dipendente.nome} {dipendente.cognome}
                                </option>
                            ))}
                        </select>
                        
                        {/* ✅ Cella del Ruolo Dinamica */}
                        <div className="col-span-1 p-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg">
                            {selectedDipendente 
                                ? dipendenti.find(d => d.id === selectedDipendente)?.ruolo || 'N/D' 
                                : 'Ruolo'}
                        </div>
                    </div>
                </div>

                {/* ✅ RIGHE DI ASSEGNAZIONE MIGLIORATE */}
                <div className="space-y-4">
                    <label className="block text-gray-700 font-medium">Attrezzature da assegnare:</label>
                    
                    {/* Intestazione Colonne */}
                    <div className="grid grid-cols-3 gap-2 text-xs font-semibold uppercase text-gray-500 border-b pb-2">
                        <span className="col-span-1">Categoria</span>
                        <span className="col-span-2">Articolo (Seriale)</span>
                    </div>

                    {attrezzatureDisponibili.length === 0 ? (
                         <div className="text-center p-4 border border-dashed rounded-lg text-gray-500">
                            Nessuna attrezzatura disponibile per l'assegnazione.
                        </div>
                    ) : (
                        righeAssegnazione.map((riga, index) => {
                            const attrezzatureFiltrate = attrezzatureDisponibili.filter(item =>
                                !riga.categoriaSelezionata || item.categoria === riga.categoriaSelezionata
                            );

                            return (
                                <div key={riga.id} className="grid grid-cols-3 gap-2 items-center">
                                    {/* Filtro Categoria */}
                                    <select
                                        value={riga.categoriaSelezionata}
                                        onChange={(e) => handleRigaChange(riga.id, 'categoriaSelezionata', e.target.value)}
                                        className="p-2 border border-gray-300 rounded-lg text-sm"
                                    >
                                        <option value="">-- Filtra Categoria --</option>
                                        {categorieUniche.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                    
                                    {/* Select Attrezzatura Filtrata */}
                                    <select
                                        value={riga.attrezzaturaId}
                                        onChange={(e) => handleRigaChange(riga.id, 'attrezzaturaId', e.target.value)}
                                        className="p-2 border border-gray-300 rounded-lg text-sm col-span-2"
                                        required
                                    >
                                        <option value="">-- Seleziona Articolo --</option>
                                        {attrezzatureFiltrate.map(item => {
                                            const isAlreadySelected = idSelezionati.includes(item.id) && riga.attrezzaturaId !== item.id;
                                            
                                            return !isAlreadySelected && (
                                                <option key={item.id} value={item.id}>
                                                    {item.nome} (S: {item.seriale})
                                                </option>
                                            );
                                        })}
                                    </select>
                                    
                                    {righeAssegnazione.length > 1 && (
                                        // Pulsante di rimozione sulla destra, fuori dalla griglia a 3 colonne
                                        <button 
                                            type="button" 
                                            onClick={() => handleRemoveRiga(riga.id)} 
                                            className="p-2 text-red-500 hover:text-red-700 flex justify-center items-center absolute right-0 transform translate-x-12"
                                            title="Rimuovi riga"
                                        >
                                            <XMarkIcon className="h-5 w-5" />
                                        </button>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
                
                {/* Pulsante Aggiungi Riga */}
                {attrezzatureDisponibili.length > 0 && (
                     <button
                        type="button"
                        onClick={handleAddRiga}
                        className="w-full py-2 border border-dashed rounded-lg text-sm font-medium transition-colors text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2 mt-4"
                    >
                        <PlusIcon className="h-4 w-4" /> Aggiungi un'altra attrezzatura
                    </button>
                )}

                {message && (
                    <div className={`p-4 rounded-lg text-sm ${message.includes('successo') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {message}
                    </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                    <button type="submit" disabled={isLoading} className={`py-2 px-6 rounded-lg font-medium text-white transition-colors ${isLoading || attrezzatureDisponibili.length === 0 ? 'bg-gray-400 cursor-not-allowed' : `${colorClasses[primaryColor].bg} hover:opacity-90`}`}>
                        {isLoading ? 'Salvataggio...' : 'Assegna Articoli'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AssegnaAttrezzaturaForm;