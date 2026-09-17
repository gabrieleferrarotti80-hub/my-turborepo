import React, { useState, useMemo } from 'react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';

const formatTime = (ts) => {
    if (!ts) return 'N/D';
    return ts.toDate().toLocaleString('it-IT', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
};

const formatDate = (ts) => {
    if (!ts) return 'N/D';
    return ts.toDate().toLocaleDateString('it-IT', { 
        day: '2-digit', 
        month: '2-digit',
        weekday: 'short'
    });
};

const ErroreFormInline = ({ riga, onSubmit, onCancel, isSaving }) => {
    const [nota, setNota] = useState('');

    const isSubmitDisabled = isSaving || !nota.trim();
    const isCancelDisabled = isSaving;

    const cancelStyle = {
        backgroundColor: isCancelDisabled ? '#9CA3AF' : '#E5E7EB',
        color: isCancelDisabled ? 'white' : 'black',
        cursor: isCancelDisabled ? 'not-allowed' : 'pointer'
    };
    
    const submitStyle = {
        backgroundColor: isSubmitDisabled ? '#9CA3AF' : '#DC2626',
        color: 'white',
        cursor: isSubmitDisabled ? 'not-allowed' : 'pointer'
    };

    return (
        <div className="p-4 bg-gray-50"> 
            <h4 className="font-semibold text-sm mb-2">Segnala Errore per: {riga.giorno}</h4>
            <textarea 
                className="w-full p-2 border rounded text-sm outline-none focus:ring-2 focus:ring-red-500" 
                rows="3"
                value={nota}
                onChange={e => setNota(e.target.value)}
                placeholder="Descrivi l'errore (es. 'Ho dimenticato di chiudere, ho finito alle 17:00')..."
            ></textarea>
            
            <div className="mt-3 grid grid-cols-2 gap-3">
                <div onClick={() => { if (!isCancelDisabled) onCancel(); }} style={cancelStyle} className="px-4 py-2 rounded w-full text-center text-sm font-bold">
                    Annulla
                </div>
                <div onClick={() => { if (!isSubmitDisabled) onSubmit(nota); }} style={submitStyle} className="px-4 py-2 rounded w-full text-center text-sm font-bold">
                    {isSaving ? 'Invio in corso...' : 'Invia Segnalazione'}
                </div>
            </div>
        </div>
    );
};

export const PresenzeViewerModal = ({ isOpen, onClose, presenze = [], onSegnalaErrore, isSaving }) => {
    
    const [rigaInSegnalazione, setRigaInSegnalazione] = useState(null); 

    const righeTabella = useMemo(() => {
        const giorniMap = new Map();
        
        presenze.forEach(timbro => {
            if (!timbro.timestampInizio) return; 
            const giornoKey = timbro.timestampInizio.toDate().toLocaleDateString('it-IT');
            if (!giorniMap.has(giornoKey)) {
                giorniMap.set(giornoKey, { data: timbro.timestampInizio, eventi: [] });
            }
            giorniMap.get(giornoKey).eventi.push(timbro);
        });

        const righe = [];
        for (const [giorno, { data, eventi }] of giorniMap.entries()) {
            const eventoAnomalo = eventi.find(e => e.stato !== 'lavoro');
            
            if (eventoAnomalo) {
                const stato = eventoAnomalo.stato;
                righe.push({
                    id: giorno,
                    giorno: formatDate(data),
                    inizio: '-',
                    fine: '-',
                    totale: stato.charAt(0).toUpperCase() + stato.slice(1),
                    data: data 
                });
            } else {
                // 🌟 FIX TIMBRATURE MULTIPLE: Ordina cronologicamente le timbrature della giornata
                const eventiOrdinati = [...eventi].sort((a,b) => a.timestampInizio.toDate() - b.timestampInizio.toDate());
                
                const inizio = eventiOrdinati[0].timestampInizio;
                let fine = eventiOrdinati[eventiOrdinati.length - 1].timestampFine; 
                
                let totaleOreLavorate = 0;
                let isInCorso = false;

                // 🌟 Calcolo esatto sommando i singoli intervalli (senza togliere la pausa a caso)
                for(const ev of eventiOrdinati) {
                    if(ev.timestampInizio && ev.timestampFine) {
                        const ms = ev.timestampFine.toDate().getTime() - ev.timestampInizio.toDate().getTime();
                        totaleOreLavorate += (ms / (1000 * 60 * 60));
                    } else {
                        isInCorso = true;
                    }
                }

                let totaleOreTxt = 'N/D';
                if (isInCorso) {
                    totaleOreTxt = 'In corso...';
                    fine = null; 
                } else if (totaleOreLavorate > 0) {
                    totaleOreTxt = totaleOreLavorate.toFixed(2) + ' ore';
                }

                righe.push({
                    id: giorno,
                    giorno: formatDate(data),
                    inizio: formatTime(inizio),
                    fine: formatTime(fine),
                    totale: totaleOreTxt,
                    data: data
                });
            }
        }
        
        // Ordina dalla più recente alla più vecchia
        return righe.sort((a, b) => b.data.toDate() - a.data.toDate()); 
    }, [presenze]);

    if (!isOpen) return null;

    const handleSegnalazione = async (nota) => {
        if (!rigaInSegnalazione) return;
        const notaCompleta = `Giorno: ${rigaInSegnalazione.giorno} (Inizio: ${rigaInSegnalazione.inizio}, Fine: ${rigaInSegnalazione.fine}) - Errore: ${nota}`;
        
        const result = await onSegnalaErrore(notaCompleta, rigaInSegnalazione.data); 
        if (result.success) setRigaInSegnalazione(null); 
        else alert(result.message); 
    };

    const handleToggleRiga = (riga) => {
        if (rigaInSegnalazione && rigaInSegnalazione.id === riga.id) setRigaInSegnalazione(null);
        else setRigaInSegnalazione(riga);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[9999] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-md h-[75dvh] flex flex-col shadow-2xl overflow-hidden">
                
                <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50 flex-shrink-0">
                    <h3 className="text-xl font-black text-gray-800">Storico Timbrature</h3>
                    <button onClick={onClose} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-100">
                        <XMarkIcon className="h-5 w-5 text-gray-600" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto bg-white custom-scrollbar">
                    {presenze.length === 0 ? (
                        <p className="text-gray-400 p-8 text-center italic">Nessuna presenza registrata finora.</p>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0 border-b border-gray-200 z-10">
                                <tr>
                                    <th scope="col" className="py-3 px-4 font-black">Giorno</th>
                                    <th scope="col" className="py-3 px-2 font-black">Inizio</th>
                                    <th scope="col" className="py-3 px-2 font-black">Fine</th>
                                    <th scope="col" className="py-3 px-2 font-black">Totale</th>
                                    <th scope="col" className="py-3 px-2 text-center font-black">Err.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {righeTabella.map(riga => (
                                    <React.Fragment key={riga.id}>
                                        <tr className="bg-white border-b border-gray-50 hover:bg-indigo-50/50 transition-colors">
                                            <td className="py-3 px-4 font-bold text-gray-800">{riga.giorno}</td>
                                            <td className="py-3 px-2 text-gray-600 font-medium">{riga.inizio}</td>
                                            <td className="py-3 px-2 text-gray-600 font-medium">{riga.fine}</td>
                                            <td className={`py-3 px-2 font-bold ${riga.totale.includes('ore') ? 'text-indigo-600' : (riga.totale === 'In corso...' ? 'text-green-600 animate-pulse' : 'text-gray-500')}`}>
                                                {riga.totale}
                                            </td>
                                            <td className="py-3 px-2 text-center">
                                                <button 
                                                    title="Segnala un errore per questo giorno"
                                                    onClick={() => handleToggleRiga(riga)} 
                                                    className={`p-2 rounded-xl transition-colors ${rigaInSegnalazione?.id === riga.id ? 'bg-red-500 text-white' : 'text-red-500 bg-red-50 hover:bg-red-100'}`}
                                                    disabled={isSaving}
                                                >
                                                    <ExclamationTriangleIcon className="h-5 w-5" />
                                                </button>
                                            </td>
                                        </tr>
                                        {rigaInSegnalazione && rigaInSegnalazione.id === riga.id && (
                                            <tr className="border-b-2 border-red-200 bg-red-50/20">
                                                <td colSpan="5" className="p-0"> 
                                                    <ErroreFormInline 
                                                        riga={rigaInSegnalazione}
                                                        onSubmit={handleSegnalazione}
                                                        onCancel={() => setRigaInSegnalazione(null)}
                                                        isSaving={isSaving}
                                                    />
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};