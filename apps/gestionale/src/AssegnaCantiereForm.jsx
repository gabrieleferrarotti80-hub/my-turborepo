import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAssegnazioniCantiereManager } from 'shared-core';
import { useTheme } from 'shared-ui';
import { ArrowLeftIcon, CheckIcon, UserIcon, TruckIcon, ListBulletIcon } from '@heroicons/react/24/solid';
import { calcolaDataFineReale } from 'shared-ui'; 

export const AssegnaCantiereForm = ({ 
    onBack, 
    onSaveSuccess, 
    db, 
    user, 
    userAziendaId, 
    data,
    initialData = null 
}) => {

    const { 
        cantieri = [], 
        users = [], 
        attrezzature = [],
        subcantieri = [] 
    } = data || {}; 

    const { createAssegnazioneCantiere, updateAssegnazioneCantiere, isLoading } = useAssegnazioniCantiereManager(db, user, userAziendaId, users, cantieri, subcantieri);
    const { primaryColor, colorClasses } = useTheme();
    const isEditMode = Boolean(initialData);

    const [selectedCantiereId, setSelectedCantiereId] = useState('');
    
    // 🌟 STATO AGGIORNATO: Ora gestiamo un ARRAY di fasi
    const [selectedFasiIds, setSelectedFasiIds] = useState([]); 
    
    const [selectedTecnicoId, setSelectedTecnicoId] = useState(''); 
    const [selectedPrepostoId, setSelectedPrepostoId] = useState('');
    const [selectedOperaiIds, setSelectedOperaiIds] = useState([]);
    const [selectedUlterioriDipendentiIds, setSelectedUlterioriDipendentiIds] = useState([]);
    const [selectedAutomezziIds, setSelectedAutomezziIds] = useState([]);
    
    const [message, setMessage] = useState('');
    const [dataInizio, setDataInizio] = useState('');
    const [dataFine, setDataFine] = useState('');
    const [durataOre, setDurataOre] = useState(8); 
    
    // Stato per il salvataggio multiplo
    const [isSavingLocal, setIsSavingLocal] = useState(false);

    const formatTimestampForInput = useCallback((timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        if (isNaN(date.getTime())) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }, []);

    useEffect(() => {
        if (isEditMode && initialData) {
            const operaiIds = initialData.team?.filter(m => m.ruolo === 'operaio').map(m => m.userId) || [];

            setSelectedCantiereId(initialData.cantiereId || '');
            // Se in modifica, carichiamo la singola fase nell'array
            setSelectedFasiIds(initialData.faseId ? [initialData.faseId] : []);
            
            setDurataOre(initialData.durataOre || 8);
            setSelectedTecnicoId(initialData.tecnicoId || ''); 
            setSelectedPrepostoId(initialData.prepostoId || '');
            setSelectedOperaiIds(operaiIds);
            setSelectedUlterioriDipendentiIds(initialData.ulterioriDipendentiIds || []);
            setSelectedAutomezziIds(initialData.automezziIds || []);
            setDataInizio(formatTimestampForInput(initialData.dataInizio));
            setDataFine(formatTimestampForInput(initialData.dataFine));
        }
    }, [initialData, isEditMode, formatTimestampForInput]);

    // --- FILTRI ---
    const tecnici = useMemo(() => users.filter(u => ['tecnico', 'titolare-azienda', 'admin'].includes(u?.ruolo?.toLowerCase())), [users]);
    const preposti = useMemo(() => users.filter(u => ['preposto', 'titolare-azienda', 'tecnico', 'admin'].includes(u?.ruolo?.toLowerCase())), [users]);
    const operai = useMemo(() => users.filter(u => ['dipendente', 'operaio'].includes(u?.ruolo?.toLowerCase())), [users]); 
    const automezzi = useMemo(() => attrezzature.filter(a => a && a.categoria === 'Automezzo' && a.stato === 'disponibile'), [attrezzature]);

    const subcantieriFiltrati = useMemo(() => {
        if (!selectedCantiereId) return [];
        return subcantieri.filter(s => (s.cantiereGenitoreId || s.cantiereId) === selectedCantiereId);
    }, [selectedCantiereId, subcantieri]);

    // --- GESTIONE DATE ---
    const handleDateOrDurationChange = (e) => {
        const { name, value } = e.target;
        let start = dataInizio;
        let duration = durataOre;

        if (name === 'dataInizio') { start = value; setDataInizio(value); } 
        else if (name === 'durataOre') { duration = value; setDurataOre(value); }

        if (start && duration > 0) {
            const dataFineCalcolata = calcolaDataFineReale(new Date(start), duration);
            setDataFine(formatTimestampForInput(dataFineCalcolata));
        }
    };

    // 🌟 SELEZIONE FASI MULTIPLE E AUTO-CALCOLO ORE
    const ricalcolaOreEDate = (fasiSelezionateArray) => {
        let totaleOre = 0;
        fasiSelezionateArray.forEach(fId => {
            const f = subcantieriFiltrati.find(s => s.id === fId);
            if (f && f.durataStimata) totaleOre += Number(f.durataStimata);
        });
        
        if (totaleOre > 0) {
            setDurataOre(totaleOre);
            if (dataInizio) {
                const dataFineCalcolata = calcolaDataFineReale(new Date(dataInizio), totaleOre);
                setDataFine(formatTimestampForInput(dataFineCalcolata));
            }
        } else {
            setDurataOre(8); // fallback
        }
    };

    const toggleFase = (faseId) => {
        if (isEditMode) return; // In modifica non si può cambiare a multiplo per non rompere il DB
        
        const isSelected = selectedFasiIds.includes(faseId);
        const newSelection = isSelected 
            ? selectedFasiIds.filter(id => id !== faseId) 
            : [...selectedFasiIds, faseId];
            
        setSelectedFasiIds(newSelection);
        ricalcolaOreEDate(newSelection);
    };

    const handleSelectAllFasi = () => {
        const allIds = subcantieriFiltrati.map(s => s.id);
        setSelectedFasiIds(allIds);
        ricalcolaOreEDate(allIds);
    };

    const toggleSelection = (id, currentList, setList) => {
        if (currentList.includes(id)) setList(currentList.filter(itemId => itemId !== id));
        else setList([...currentList, id]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        if (selectedFasiIds.length === 0) {
            setMessage("Seleziona almeno una fase da assegnare.");
            return;
        }
        
        setIsSavingLocal(true);
        let hasErrors = false;

        // 🌟 SE SIAMO IN MODIFICA (Aggiorna un singolo task)
        if (isEditMode) {
            const datiDaSalvare = {
                cantiereId: selectedCantiereId,
                faseId: selectedFasiIds[0], 
                tecnicoId: selectedTecnicoId, 
                prepostoId: selectedPrepostoId,
                operaiIds: selectedOperaiIds,
                ulterioriDipendentiIds: selectedUlterioriDipendentiIds, 
                automezziIds: selectedAutomezziIds,
                dataInizio: dataInizio, 
                dataFine: dataFine,     
                durataOre: Number(durataOre) 
            };
            const result = await updateAssegnazioneCantiere(initialData.id, datiDaSalvare);
            if (!result.success) { hasErrors = true; setMessage(result.message); }
            
        } else {
            // 🌟 SE SIAMO IN CREAZIONE MULTIPLA (Cicla su tutte le fasi selezionate)
            for (const faseId of selectedFasiIds) {
                const faseOriginale = subcantieriFiltrati.find(s => s.id === faseId);
                const oreSpecificheFase = faseOriginale?.durataStimata || 8;

                const datiDaSalvare = {
                    cantiereId: selectedCantiereId,
                    faseId: faseId, 
                    tecnicoId: selectedTecnicoId, 
                    prepostoId: selectedPrepostoId,
                    operaiIds: selectedOperaiIds,
                    ulterioriDipendentiIds: selectedUlterioriDipendentiIds, 
                    automezziIds: selectedAutomezziIds,
                    dataInizio: dataInizio, 
                    dataFine: dataFine, // Mantengono lo stesso blocco temporale complessivo
                    durataOre: oreSpecificheFase // Ma conservano le loro ore individuali per le statistiche!
                };
                
                const result = await createAssegnazioneCantiere(datiDaSalvare);
                if (!result.success) hasErrors = true;
            }
        }

        setIsSavingLocal(false);
        if (!hasErrors) onSaveSuccess(isEditMode ? "Modifica salvata!" : "Tutte le fasi assegnate con successo alla squadra!");
        else if (!message) setMessage("Si è verificato un errore durante il salvataggio.");
    };

    const isButtonDisabled = isLoading || isSavingLocal;

    return (
        <div className="space-y-6 animate-fade-in p-6 bg-white rounded-2xl shadow-xl max-w-5xl mx-auto">
            <button onClick={onBack} className={`flex items-center gap-2 ${colorClasses[primaryColor].text} font-medium hover:underline`}>
                <ArrowLeftIcon className="h-4 w-4" /> Torna alla Programmazione
            </button>
            
            <div className="border-b border-gray-100 pb-4">
                <h2 className="text-3xl font-black text-gray-800">
                    {isEditMode ? 'Modifica Assegnazione' : 'Nuova Assegnazione Cantiere'}
                </h2>
                <p className="text-gray-500 text-sm mt-1">Definisci la squadra, le tempistiche e i mezzi da impegnare.</p>
            </div>

            {message && (
                <div className={`p-4 rounded-xl text-sm font-bold text-center ${message.includes('successo') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {message}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                
                {/* 1. SEZIONE DOVE E QUANDO */}
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 space-y-5">
                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                        <ListBulletIcon className="h-5 w-5"/> 1. Cantiere, Fasi e Tempistiche
                    </h3>
                    
                    <div>
                        <label className="block text-gray-700 font-bold mb-1 text-sm">Cantiere Destinazione *</label>
                        <select 
                            value={selectedCantiereId} 
                            onChange={(e) => {
                                setSelectedCantiereId(e.target.value);
                                setSelectedFasiIds([]); // Reset fasi al cambio cantiere
                            }} 
                            required 
                            disabled={isEditMode}
                            className="w-full p-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-100"
                        >
                            <option value="">-- Seleziona Cantiere --</option>
                            {cantieri.map(c => <option key={c.id} value={c.id}>{c.nomeCantiere}</option>)}
                        </select>
                    </div>

                    {/* 🌟 NUOVA INTERFACCIA DI SELEZIONE FASI MULTIPLE */}
                    <div className="pt-2 border-t border-gray-200">
                        <div className="flex justify-between items-end mb-3">
                            <label className="block text-gray-700 font-bold text-sm">Fasi da Lavorare (Subcantieri) *</label>
                            {!isEditMode && subcantieriFiltrati.length > 0 && (
                                <button type="button" onClick={handleSelectAllFasi} className="text-xs font-bold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 px-3 py-1.5 rounded-lg transition-colors">
                                    Seleziona Tutte
                                </button>
                            )}
                        </div>
                      {subcantieriFiltrati.length === 0 ? (
                            <p className="text-sm text-gray-500 italic p-4 bg-white rounded-xl border border-dashed border-gray-300">Nessuna fase operativa disponibile per questo cantiere.</p>
                        ) : (
                            // 🌟 CAMBIATO IN FLEX-COL PER LA SINGOLA COLONNA
                            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto p-3 bg-white rounded-xl border border-gray-200 shadow-inner">
                                {subcantieriFiltrati.map(s => {
                                    const isSelected = selectedFasiIds.includes(s.id);
                                    return (
                                        <div key={s.id} onClick={() => toggleFase(s.id)} className={`cursor-pointer px-4 py-3 rounded-xl border flex items-center justify-between transition-all select-none ${isSelected ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'bg-white border-gray-100 hover:border-indigo-300'} ${isEditMode ? 'opacity-70 pointer-events-none' : ''}`}>
                                            
                                            {/* Nome e Checkbox a sinistra */}
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                                                    {isSelected && <CheckIcon className="w-4 h-4 text-white" />}
                                                </div>
                                                <span className={`text-sm font-bold truncate ${isSelected ? 'text-indigo-900' : 'text-gray-700'}`}>
                                                    {s.nomeSubcantiere}
                                                </span>
                                            </div>

                                            {/* Ore allineate tutte a destra */}
                                            <span className={`text-[10px] font-bold uppercase shrink-0 ml-4 px-2 py-1 rounded-md ${isSelected ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {s.durataStimata} ore
                                            </span>

                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                        <div>
                            <label className="block text-gray-700 font-bold mb-1 text-sm">Data Inizio Blocco Lavori *</label>
                            <input type="date" name="dataInizio" value={dataInizio} onChange={handleDateOrDurationChange} required className="w-full p-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-bold mb-1 text-sm">Monte Ore Totale</label>
                            <input type="number" name="durataOre" value={durataOre} onChange={handleDateOrDurationChange} min="1" required className="w-full p-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-indigo-700" />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-bold mb-1 text-sm text-gray-400">Data Fine Periodo (Calcolata)</label>
                            <input type="date" value={dataFine} readOnly disabled className="w-full p-3 border border-gray-200 rounded-xl bg-gray-100 text-gray-500 font-medium" />
                        </div>
                    </div>
                </div>

                {/* 2. SEZIONE PERSONALE */}
                <div className="space-y-4">
                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><UserIcon className="h-5 w-5"/> 2. Composizione Squadra</h3>
                    
                    <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                        <label className="block text-indigo-900 font-black mb-1 text-sm">Tecnico / Titolare (Project Manager)</label>
                        <select value={selectedTecnicoId} onChange={(e) => setSelectedTecnicoId(e.target.value)} className="w-full p-3 border border-indigo-200 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-indigo-800 font-medium">
                            <option value="">-- Nessun Tecnico Assegnato --</option>
                            {tecnici.map(p => <option key={p.id} value={p.id}>{p.nome} {p.cognome}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-gray-700 font-bold mb-1 text-sm">Preposto (Caposquadra In Cantiere)</label>
                        <select value={selectedPrepostoId} onChange={(e) => setSelectedPrepostoId(e.target.value)} className="w-full p-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                            <option value="">-- Nessun Preposto --</option>
                            {preposti.map(p => <option key={p.id} value={p.id}>{p.nome} {p.cognome}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-gray-700 font-bold mb-2 text-sm">Operai Assegnati</label>
                        {operai.length === 0 ? (
                            <p className="text-sm text-gray-500 italic p-4 bg-gray-50 rounded-xl border border-dashed border-gray-300">Nessun dipendente trovato nel sistema.</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-3 bg-gray-50 rounded-2xl border border-gray-200">
                                {operai.map(o => {
                                    const isSelected = selectedOperaiIds.includes(o.id);
                                    return (
                                        <div key={o.id} onClick={() => toggleSelection(o.id, selectedOperaiIds, setSelectedOperaiIds)} className={`cursor-pointer p-3 rounded-xl border flex items-center gap-3 transition-all select-none ${isSelected ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'bg-white border-gray-200 hover:border-indigo-300'}`}>
                                            <div className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                                                {isSelected && <CheckIcon className="w-4 h-4 text-white" />}
                                            </div>
                                            <span className={`text-sm font-bold truncate ${isSelected ? 'text-indigo-900' : 'text-gray-700'}`}>{o.nome} {o.cognome}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    <div className="pt-2">
                        <label className="block text-gray-700 font-bold mb-2 text-sm">Ulteriori Dipendenti <span className="text-gray-400 font-normal">(Opzionale)</span></label>
                        {users.length === 0 ? (
                            <p className="text-sm text-gray-500 italic p-4 bg-gray-50 rounded-xl border border-dashed border-gray-300">Nessun utente disponibile.</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-48 overflow-y-auto p-3 bg-gray-50 rounded-2xl border border-gray-200">
                                {users.map(u => {
                                    const isSelected = selectedUlterioriDipendentiIds.includes(u.id);
                                    return (
                                        <div key={u.id} onClick={() => toggleSelection(u.id, selectedUlterioriDipendentiIds, setSelectedUlterioriDipendentiIds)} className={`cursor-pointer p-3 rounded-xl border flex items-center gap-3 transition-all select-none ${isSelected ? 'bg-teal-50 border-teal-500 shadow-sm' : 'bg-white border-gray-200 hover:border-teal-300'}`}>
                                            <div className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 transition-colors ${isSelected ? 'bg-teal-600 border-teal-600' : 'border-gray-300'}`}>
                                                {isSelected && <CheckIcon className="w-4 h-4 text-white" />}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className={`text-sm font-bold truncate ${isSelected ? 'text-teal-900' : 'text-gray-700'}`}>{u.nome} {u.cognome}</span>
                                                <span className="text-[10px] uppercase font-bold text-gray-400">{u.ruolo || 'Utente'}</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. SEZIONE MEZZI */}
                <div className="space-y-4 pt-4 border-t border-gray-100">
                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><TruckIcon className="h-5 w-5"/> 3. Risorse e Mezzi</h3>
                    <div>
                        {automezzi.length === 0 ? (
                            <p className="text-sm text-gray-500 italic p-4 bg-gray-50 rounded-xl border border-dashed border-gray-300">Nessun automezzo disponibile.</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto p-3 bg-gray-50 rounded-2xl border border-gray-200">
                                {automezzi.map(a => {
                                    const isSelected = selectedAutomezziIds.includes(a.id);
                                    return (
                                        <div key={a.id} onClick={() => toggleSelection(a.id, selectedAutomezziIds, setSelectedAutomezziIds)} className={`cursor-pointer p-3 rounded-xl border flex items-center gap-3 transition-all select-none ${isSelected ? 'bg-amber-50 border-amber-500 shadow-sm' : 'bg-white border-gray-200 hover:border-amber-300'}`}>
                                            <div className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 transition-colors ${isSelected ? 'bg-amber-500 border-amber-500' : 'border-gray-300'}`}>
                                                {isSelected && <CheckIcon className="w-4 h-4 text-white" />}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className={`text-sm font-bold truncate ${isSelected ? 'text-amber-900' : 'text-gray-700'}`}>{a.nome}</span>
                                                {a.dettagli?.targa && <span className="text-[10px] font-bold text-gray-400 uppercase">{a.dettagli.targa}</span>}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                    <button type="button" onClick={onBack} className="py-3 px-6 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
                        Annulla
                    </button>
                    <button type="submit" disabled={isButtonDisabled} className={`py-3 px-8 rounded-xl font-black text-white transition-all shadow-md active:scale-95 ${isButtonDisabled ? 'bg-gray-400 cursor-not-allowed' : `${colorClasses[primaryColor].bg} hover:opacity-90`}`}>
                        {isSavingLocal || isLoading ? 'Salvataggio in corso...' : (isEditMode ? 'Salva Modifiche' : 'Conferma Assegnazione Gruppo')}
                    </button>
                </div>
            </form>
        </div>
    );
};