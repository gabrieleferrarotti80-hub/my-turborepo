import React, { useState, useMemo } from 'react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';

// Formattatore orario (INVARIATO)
const formatTime = (ts) => {
    if (!ts) return 'N/D';
    return ts.toDate().toLocaleString('it-IT', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
};

// Formattatore data (INVARIATO)
const formatDate = (ts) => {
    if (!ts) return 'N/D';
    return ts.toDate().toLocaleDateString('it-IT', { 
        day: '2-digit', 
        month: '2-digit',
        weekday: 'short'
    });
};

// --- ❗ COMPONENTE ErroreFormInline MODIFICATO ---
// Usiamo STILI INLINE per i colori di sfondo.
// Questo bypassa il bug del JIT e il CSS globale.
// ---
const ErroreFormInline = ({ riga, onSubmit, onCancel, isSaving }) => {
    const [nota, setNota] = useState('');

    // 1. Calcoliamo gli stati disabilitati
    const isSubmitDisabled = isSaving || !nota.trim();
    const isCancelDisabled = isSaving;

    // 2. Definiamo gli stili inline
    const cancelStyle = {
        backgroundColor: isCancelDisabled ? '#9CA3AF' : '#E5E7EB', // Grigio-400 / Grigio-200
        color: isCancelDisabled ? 'white' : 'black',
        cursor: isCancelDisabled ? 'not-allowed' : 'pointer'
    };
    
    const submitStyle = {
        backgroundColor: isSubmitDisabled ? '#9CA3AF' : '#DC2626', // Grigio-400 / Rosso-600
        color: 'white',
        cursor: isSubmitDisabled ? 'not-allowed' : 'pointer'
    };

    return (
        <div className="p-4 bg-gray-50"> 
            <h4 className="font-semibold text-sm mb-2">Segnala Errore per: {riga.giorno}</h4>
            <textarea 
                className="w-full p-2 border rounded text-sm" 
                rows="3"
                value={nota}
                onChange={e => setNota(e.target.value)}
                placeholder="Descrivi l'errore (es. 'Ho finito alle 17:00')..."
            ></textarea>
            
            {/* Footer Pulsanti */}
            <div className="mt-3 grid grid-cols-2 gap-3">

                {/* --- Pulsante Annulla (con stile inline) --- */}
                {/* Usiamo un <div> per evitare il CSS globale :disabled */}
                <div 
                    onClick={() => {
                        if (isCancelDisabled) return;
                        onCancel();
                    }}
                    // Usiamo 'style' invece di 'className' per i colori
                    style={cancelStyle}
                    // Le classi di layout/testo di Tailwind funzionano
                    className="px-4 py-2 rounded w-full text-center text-sm"
                >
                    Annulla
                </div>
                
                {/* --- Pulsante Invia (con stile inline) --- */}
                {/* Usiamo un <div> per evitare il CSS globale :disabled */}
                <div 
                    onClick={() => {
                        if (isSubmitDisabled) return;
                        onSubmit(nota);
                    }}
                    // Usiamo 'style' invece di 'className' per i colori
                    style={submitStyle}
                    // Le classi di layout/testo di Tailwind funzionano
                    className="px-4 py-2 rounded w-full text-center text-sm"
                >
                    {isSaving ? 'Invio...' : 'Invia'}
                </div>
            </div>
        </div>
    );
};


// --- ❗ COMPONENTE PRINCIPALE (INVARIATO) ---
// (L'architettura "Inline" è INVARIATA)
// ---
export const PresenzeViewerModal = ({ isOpen, onClose, presenze = [], onSegnalaErrore, isSaving }) => {
    
    const [rigaInSegnalazione, setRigaInSegnalazione] = useState(null); 

    // Logica useMemo (INVARIATA)
    const righeTabella = useMemo(() => {
        const giorniMap = new Map();
        presenze.forEach(timbro => {
            // --- ❗ SOLUZIONE: AGGIUNGI QUESTO CONTROLLO ---
            // Se il timestampInizio non è ancora stato valorizzato
            // dal server, salta questo ciclo.
            if (!timbro.timestampInizio) {
                console.warn("Timbro saltato (timestampInizio non ancora pronto):", timbro.id);
                return; 
            }
            // --- FINE SOLUZIONE ---
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
                    totale: stato.charAt(0).toUpperCase() + stato.slice(1) 
                });
            } else {
                const inizio = eventi[eventi.length - 1].timestampInizio;
                const fine = eventi[0].timestampFine; 
                let totaleOre = 'N/D';
                if (inizio && fine) {
                    const millisecondiLavorati = fine.toDate().getTime() - inizio.toDate().getTime();
                    const oreLavorate = millisecondiLavorati / (1000 * 60 * 60); 
                    const orePausa = 1.0;
                    const oreNette = Math.max(0, oreLavorate - orePausa);
                    totaleOre = oreNette.toFixed(2) + ' ore';
                } else if (inizio && !fine) {
                    totaleOre = 'In corso...';
                }
                righe.push({
                    id: giorno,
                    giorno: formatDate(data),
                    inizio: formatTime(inizio),
                    fine: formatTime(fine),
                    totale: totaleOre,
                    data: data //
                });
            }
        }
        return righe;
    }, [presenze]);


    if (!isOpen) return null;

    // Handler Segnalazione (MODIFICATO)
    const handleSegnalazione = async (nota) => {
        if (!rigaInSegnalazione) return;
        const notaCompleta = `Giorno: ${rigaInSegnalazione.giorno} (Inizio: ${rigaInSegnalazione.inizio}, Fine: ${rigaInSegnalazione.fine}) - Errore segnalato: ${nota}`;
        
        // ❗ Passa la 'data' della riga (che è il timestampInizio)
        const result = await onSegnalaErrore(notaCompleta, rigaInSegnalazione.data); 
        
        if (result.success) {
            setRigaInSegnalazione(null); 
        } else {
            alert(result.message); 
        }
    };
    // Gestisce "Apri/Chiudi" del form inline (INVARIATO)
    const handleToggleRiga = (riga) => {
        if (rigaInSegnalazione && rigaInSegnalazione.id === riga.id) {
            setRigaInSegnalazione(null);
        } else {
            setRigaInSegnalazione(riga);
        }
    };

    return (
        // (1) Overlay (INVARIATO)
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
            
            {/* (2) Contenitore del Modal (INVARIATO) */}
            <div className="bg-white rounded-lg w-full max-w-md h-[70dvh] flex flex-col">
                
                {/* (3) Header Principale (INVARIATO) */}
                <div className="flex justify-between items-center p-4 border-b flex-shrink-0">
                    <h3 className="text-xl font-bold">Le tue Presenze</h3>
                    <button onClick={onClose}>
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                {/* --- (4) CORPO TABELLA (INVARIATO) --- */}
                <div className="flex-1 overflow-y-auto">
                    {presenze.length === 0 ? (
                        <p className="text-gray-500 p-4">Nessuna presenza registrata.</p>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-100 sticky top-0">
                                <tr>
                                    <th scope="col" className="py-3 px-4">Giorno</th>
                                    <th scope="col" className="py-3 px-2">Inizio</th>
                                    <th scope="col" className="py-3 px-2">Fine</th>
                                    <th scope="col" className="py-3 px-2">Totale</th>
                                    <th scope="col" className="py-3 px-2 text-center">Azione</th>
                                </tr>
                            </thead>
                            <tbody>
                                {righeTabella.map(riga => (
                                    <React.Fragment key={riga.id}>
                                        
                                        {/* --- La Riga Dati (INVARIATA) --- */}
                                        <tr className="bg-white border-b hover:bg-gray-50">
                                            <td className="py-3 px-4 font-medium">{riga.giorno}</td>
                                            <td className="py-3 px-2">{riga.inizio}</td>
                                            <td className="py-3 px-2">{riga.fine}</td>
                                            <td className={`py-3 px-2 font-medium ${riga.totale.includes('ore') ? '' : 'text-red-600'}`}>
                                                {riga.totale}
                                            </td>
                                            <td className="py-3 px-2 text-center">
                                                <button 
                                                    title="Segnala un errore per questo giorno"
                                                    onClick={() => handleToggleRiga(riga)} 
                                                    className={`
                                                        p-1 rounded-full
                                                        ${rigaInSegnalazione?.id === riga.id 
                                                            ? 'bg-red-100 text-red-700' 
                                                            : 'text-red-500 hover:text-red-700 hover:bg-red-50'}
                                                    `}
                                                    disabled={isSaving}
                                                >
                                                    <ExclamationTriangleIcon className="h-5 w-5" />
                                                </button>
                                            </td>
                                        </tr>

                                        {/* --- La Riga Form (Condizionale) (INVARIATA) --- */}
                                        {rigaInSegnalazione && rigaInSegnalazione.id === riga.id && (
                                            <tr className="border-b">
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

                {/* (5) Footer (INVARIATO) */}
                <div className="p-4 border-t bg-gray-50 flex-shrink-0">
                    <p className="text-xs text-gray-500 text-center">Fai clic sull'icona ❗ per segnalare un errore.</p>
                </div>
            </div>
        </div>
    );
};