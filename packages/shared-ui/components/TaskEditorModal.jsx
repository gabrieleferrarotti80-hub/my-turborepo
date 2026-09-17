import React, { useState, useEffect, useMemo } from 'react';
// Aggiungi l'icona
import { XMarkIcon, ExclamationTriangleIcon, PaperAirplaneIcon } from '@heroicons/react/24/solid';

// --- Funzioni Helper per le Date (invariate) ---
const calcolaDurataOre = (start, end) => {
    try {
        if (!start || !end) return 1;
        const diffMs = new Date(end) - new Date(start);
        const ore = Math.round(diffMs / 3600000);
        return ore > 0 ? ore : 1;
    } catch (e) { return 1; }
};
const formattaDataPerInput = (date) => {
    if (!date) return '';
    try {
        const d = new Date(date);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
    } catch (e) { return ''; }
};

// --- ✅ 1. NUOVA FUNZIONE HELPER (CON EXPORT) ---

/**
 * Calcola la data di fine reale, dividendo le ore totali in 
 * giornate lavorative da 8 ore e saltando i weekend.
 * @param {Date} dataInizio L'oggetto Date di inizio.
 * @param {number} durataTotaleOre Le ore totali (es. 16).
 * @param {number} [orePerGiorno=8] Le ore lavorative in un giorno.
 * @returns {Date} Il nuovo oggetto Date di fine.
 */
export const calcolaDataFineReale = (dataInizio, durataTotaleOre, orePerGiorno = 8) => {
    try {
        let dataFine = new Date(dataInizio);
        let oreRimanenti = Number(durataTotaleOre);
        const ORE_GIORNO = Number(orePerGiorno);

        if (oreRimanenti <= 0) return dataFine;

        // Calcola quanti giorni lavorativi COMPLETI sono necessari
        const giorniLavorativiNecessari = Math.floor(oreRimanenti / ORE_GIORNO);
        // Calcola le ore rimanenti per l'ultimo giorno
        let oreUltimoGiorno = oreRimanenti % ORE_GIORNO;

        // Caso speciale: 16 ore = 2 giorni completi (non 1 giorno + 8 ore)
        // Se 16 % 8 = 0, significa che l'ultimo giorno è un giorno *pieno* di 8 ore.
        if (giorniLavorativiNecessari > 0 && oreUltimoGiorno === 0) {
            oreUltimoGiorno = ORE_GIORNO;
        } 
        // Caso speciale: 8 ore = 1 giorno completo
        else if (giorniLavorativiNecessari === 0 && oreUltimoGiorno > 0) {
             // Non ci sono giorni completi, solo ore parziali
             dataFine.setHours(dataFine.getHours() + oreUltimoGiorno);
             return dataFine;
        }

        // Calcoliamo i giorni lavorativi da aggiungere (es. 16 ore = 1 giorno da aggiungere)
        let giorniLavorativiDaAggiungere = giorniLavorativiNecessari;
        // Se 16 ore (2 giorni pieni), oreUltimoGiorno=8, giorniNecessari=2.
        // Dobbiamo aggiungere 1 giorno.
        if(oreUltimoGiorno === ORE_GIORNO) {
            giorniLavorativiDaAggiungere = giorniLavorativiNecessari - 1;
        }

        let giorniAggiunti = 0;
        while (giorniAggiunti < giorniLavorativiDaAggiungere) {
            dataFine.setDate(dataFine.getDate() + 1); // Vai al giorno dopo
            const dayOfWeek = dataFine.getDay();
            
            // 0 = Domenica, 6 = Sabato
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                giorniAggiunti++; // Conta solo se è un giorno lavorativo
            }
        }
        
        // Ora 'dataFine' è il giorno corretto (es. Martedì per 16h, Mercoledì per 17h)
        // Impostiamo l'orario di fine
        dataFine.setHours(
            dataInizio.getHours() + oreUltimoGiorno,
            dataInizio.getMinutes(), 
            dataInizio.getSeconds(), 
            dataInizio.getMilliseconds()
        );
        
        return dataFine;

    } catch (e) {
        console.error("Errore calcolo data fine reale:", e);
        // Fallback alla vecchia logica (errata)
        const dataFineFallback = new Date(dataInizio);
        dataFineFallback.setHours(dataInizio.getHours() + Number(durataTotaleOre));
        return dataFineFallback;
    }
};
// --- FINE NUOVA FUNZIONE ---

// Stato iniziale (invariato)
const initialState = {
    noteOperative: '',
    personale: [],
    automezzi: [],
    attrezzature: [],
    dataInizio: '',
    durataOre: 2,
};


export const TaskEditorModal = ({ 
    isOpen, 
    onClose, 
    onSave, 
    onDelete,
    onInviaAssegnazione, // Prop per il nuovo pulsante
    taskToEdit, 
    allUsers,
    allEquipment
}) => {
    
    const [formData, setFormData] = useState(initialState);

    // useMemo per separare Automezzi e Attrezzature (invariato)
    const { automezziList, attrezzatureList } = useMemo(() => {
        const automezzi = [];
        const attrezzature = [];
        (allEquipment || []).forEach(eq => {
            if (eq.categoria === 'Automezzo') {
                automezzi.push(eq);
            } else {
                attrezzature.push(eq);
            }
        });
        return { automezziList: automezzi, attrezzatureList: attrezzature };
    }, [allEquipment]);

    // Popola il form (invariato)
    useEffect(() => {
        if (taskToEdit) {
            // --- ✅ MODIFICA QUI ---
            // Non calcolare la durata dalle date, leggila dal task!
            const durata = taskToEdit.durataOre || calcolaDurataOre(taskToEdit.dataInizio, taskToEdit.dataFine);
            // --- FINE MODIFICA ---
            setFormData({
                noteOperative: taskToEdit.noteOperative || '',
                personale: taskToEdit.risorseAssegnate?.personale || [],
                automezzi: taskToEdit.risorseAssegnate?.automezzi || [],
                attrezzature: taskToEdit.risorseAssegnate?.attrezzature || [],
                dataInizio: formattaDataPerInput(taskToEdit.dataInizio),
                durataOre: durata, // Ora legge la durata corretta (es. 16)
            });
        } else {
            setFormData(initialState);
        }
    }, [taskToEdit]);

    if (!isOpen) {
        return null;
    }

    // --- ✅ INIZIO CORREZIONE ---
    // Definiamo le variabili di stato qui, DOPO il check 'isOpen'
    const isAssegnato = taskToEdit?.stato === 'assegnato';
    const isConflict = taskToEdit?.stato === 'conflitto_risorsa';
    // --- FINE CORREZIONE ---


    // Handler per il salvataggio (invariato)
    const handleSubmit = (e) => {
       e.preventDefault();
        
        const dataInizio = new Date(formData.dataInizio);
        
        // --- MODIFICA ---
        // Calcola la data fine usando la nuova logica (saltando weekend, 8h/giorno)
        const dataFine = calcolaDataFineReale(dataInizio, formData.durataOre);

        const updatedFields = {
            noteOperative: formData.noteOperative,
            dataInizio: dataInizio,
            dataFine: dataFine,
            durataOre: Number(formData.durataOre),
            risorseAssegnate: {
                personale: formData.personale,
                automezzi: formData.automezzi,
                attrezzature: formData.attrezzature,
            },
            // Se è in conflitto e lo salvo, torna 'bozza'
            stato: taskToEdit.stato === 'conflitto_risorsa' ? 'bozza' : taskToEdit.stato,
            titolo: taskToEdit.titolo
        };
        onSave(taskToEdit.id, updatedFields);
    };
    
    // Handler per i cambi (invariato)
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    // Handler checkbox (invariato)
    const handleCheckboxChange = (listaKey, id) => {
        setFormData(prev => {
            const currentList = prev[listaKey] || [];
            const isSelected = currentList.includes(id);
            const newList = isSelected
                ? currentList.filter(i => i !== id)
                : [...currentList, id];
            return { ...prev, [listaKey]: newList };
        });
    };

    // Handler per "Invia Assegnazione"
    const handleInviaClick = () => {
        if (window.confirm("Sei sicuro di voler inviare questa assegnazione? Il task verrà bloccato e inviato ai tecnici.")) {
            onInviaAssegnazione(taskToEdit); 
        }
    };

    // Handler per "Elimina"
    const handleDeleteClick = () => {
        if (onDelete && window.confirm("Sei sicuro di voler eliminare questo task dalla programmazione?")) {
            onDelete(taskToEdit.id);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 overflow-y-auto max-h-[90vh]">
                
                {/* --- Intestazione --- */}
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-bold">Modifica Lavoro</h2>
                    <button onClick={onClose}><XMarkIcon className="h-6 w-6" /></button>
                </div>
                
                <p className="text-lg text-indigo-600 font-medium mb-4">
                    {taskToEdit.titolo}
                </p>

                {/* Messaggio di stato "Assegnato" */}
                {isAssegnato && (
                    <div className="p-3 mb-4 bg-green-100 border border-green-400 text-green-700 rounded-md flex items-center gap-2">
                        <PaperAirplaneIcon className="h-5 w-5" />
                        <span className="font-medium">Assegnato!</span> Questo task è stato inviato ai tecnici.
                    </div>
                )}
                {/* Messaggio di "Conflitto" */}
                {isConflict && !isAssegnato && (
                    <div className="p-3 mb-4 bg-red-100 border border-red-400 text-red-700 rounded-md flex items-center gap-2">
                        <ExclamationTriangleIcon className="h-5 w-5" />
                        <span className="font-medium">Conflitto Rilevato!</span> Controlla date e risorse.
                    </div>
                )}

                {/* --- Form --- */}
                <form onSubmit={handleSubmit}>
                    {/* Fieldset per disabilitare i campi se 'isAssegnato' è true */}
                    <fieldset disabled={isAssegnato} className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                        {/* --- Sezione Date e Note --- */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="dataInizio" className="block text-sm font-medium text-gray-700">Data Inizio</label>
                                <input
                                    type="datetime-local" id="dataInizio" name="dataInizio"
                                    value={formData.dataInizio} onChange={handleChange}
                                    className="w-full p-2 border rounded-md mt-1 disabled:bg-gray-100"
                                />
                            </div>
                            <div>
                                <label htmlFor="durataOre" className="block text-sm font-medium text-gray-700">Durata (Ore)</label>
                                <input
                                    type="number" id="durataOre" name="durataOre"
                                    value={formData.durataOre} onChange={handleChange}
                                    min="1" className="w-full p-2 border rounded-md mt-1 disabled:bg-gray-100"
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="noteOperative" className="block text-sm font-medium text-gray-700">Note Operative</label>
                            <textarea
                                id="noteOperative" name="noteOperative" rows={2}
                                value={formData.noteOperative} onChange={handleChange}
                                className="w-full p-2 border rounded-md mt-1 disabled:bg-gray-100"
                                // Nota: Anche se 'isAssegnato' disabilita il fieldset,
                                // potresti voler permettere la modifica delle note. 
                                // In tal caso, sposta questo <div> fuori dal <fieldset>
                            />
                        </div>
                        
                        {/* --- Sezione Personale --- */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Personale Assegnato</label>
                            <div className="mt-1 h-32 overflow-y-auto rounded-md border border-gray-300 p-2 space-y-1 disabled:bg-gray-100">
                                {allUsers.map(user => (
                                    <label key={user.id} className="flex items-center gap-2 p-1 hover:bg-gray-100 rounded">
                                        <input
                                            type="checkbox"
                                            checked={formData.personale.includes(user.id)}
                                            onChange={() => handleCheckboxChange('personale', user.id)}
                                            className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                                            disabled={isAssegnato} // Disabilita singolarmente
                                        />
                                        <span className="text-sm">{user.nome} {user.cognome}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* --- Sezione Automezzi --- */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Automezzi Assegnati</label>
                            <div className="mt-1 h-32 overflow-y-auto rounded-md border border-gray-300 p-2 space-y-1 disabled:bg-gray-100">
                                {automezziList.length === 0 ? (
                                    <p className="text-sm text-gray-500 p-2">Nessun automezzo disponibile.</p>
                                ) : automezziList.map(mezzo => (
                                    <label key={mezzo.id} className="flex items-center gap-2 p-1 hover:bg-gray-100 rounded">
                                        <input
                                            type="checkbox"
                                            checked={formData.automezzi.includes(mezzo.id)}
                                            onChange={() => handleCheckboxChange('automezzi', mezzo.id)}
                                            className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                                            disabled={isAssegnato} // Disabilita singolarmente
                                        />
                                        <span className="text-sm">{mezzo.nome} ({mezzo.dettagli?.targa || 'N/A'})</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* --- Sezione Attrezzature --- */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Altre Attrezzature</label>
                            <div className="mt-1 h-32 overflow-y-auto rounded-md border border-gray-300 p-2 space-y-1 disabled:bg-gray-100">
                                {attrezzatureList.length === 0 ? (
                                    <p className="text-sm text-gray-500 p-2">Nessuna attrezzatura disponibile.</p>
                                ) : attrezzatureList.map(attr => (
                                    <label key={attr.id} className="flex items-center gap-2 p-1 hover:bg-gray-100 rounded">
                                        <input
                                            type="checkbox"
                                            checked={formData.attrezzature.includes(attr.id)}
                                            onChange={() => handleCheckboxChange('attrezzature', attr.id)}
                                            className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                                            disabled={isAssegnato} // Disabilita singolarmente
                                        />
                                        <span className="text-sm">{attr.nome} ({attr.categoria})</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </fieldset> {/* Chiusura Fieldset */}
                    
                    {/* --- Pulsanti Azione --- */}
                    <div className="mt-6 flex justify-between items-center gap-3 border-t pt-4">
                        
                        {/* Pulsante Elimina (a sinistra) */}
                        {onDelete && !isAssegnato && (
                            <button 
                                type="button" 
                                onClick={handleDeleteClick}
                                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
                            >
                                Elimina Task
                            </button>
                        )}
                        {isAssegnato && (
                            <p className="text-sm font-medium text-green-600">Task Bloccato</p>
                        )}

                        {/* Pulsanti (a destra) */}
                        <div className="flex gap-3">
                            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-md text-sm font-medium">Annulla</button>
                            
                            {!isAssegnato ? (
                                <>
                                    <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium">
                                        Salva Bozza
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleInviaClick}
                                        className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium flex items-center gap-2"
                                    >
                                        <PaperAirplaneIcon className="h-5 w-5" />
                                        Invia Assegnazione
                                    </button>
                                </>
                            ) : (
                                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium">
                                    Salva Modifiche
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};