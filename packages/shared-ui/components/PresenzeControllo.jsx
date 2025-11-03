// File: packages/shared-ui/components/PresenzeControllo.jsx

import React, { useState, useMemo } from 'react';
import { ClockIcon, XCircleIcon, SunIcon, ShieldExclamationIcon, PlayIcon, StopIcon, EyeIcon } from '@heroicons/react/24/solid';

// Funzione helper per controllare se un Timestamp Firestore è "oggi"
const isTimestampToday = (firestoreTimestamp) => {
    if (!firestoreTimestamp) return false;
    const date = firestoreTimestamp.toDate(); // Converte Timestamp in Data JS
    const today = new Date();
    
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
};

// Modal interno per Malattia/Infortunio (INVARIATO)
const AssenzaModal = ({ show, onClose, onSubmit, isSaving, titolo }) => {
    if (!show) return null;
    const [dataInizio, setDataInizio] = useState(new Date().toISOString().split('T')[0]);
    const [dataFine, setDataFine] = useState('');
    const [note, setNote] = useState('');

    const handleSubmit = () => {
        if (!dataFine) {
            alert('Seleziona una data di fine prevista.');
            return;
        }
        onSubmit(dataInizio, dataFine, note);
    };

    return (
        // ... (Codice JSX del Modal invariato)
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm">
                <h3 className="text-xl font-bold mb-4">{titolo}</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">Data Inizio</label>
                        <input type="date" value={dataInizio} onChange={e => setDataInizio(e.target.value)} className="w-full p-2 border rounded" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Data Fine Prevista</label>
                        <input type="date" value={dataFine} onChange={e => setDataFine(e.target.value)} className="w-full p-2 border rounded" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Note (opzionali)</label>
                        <textarea value={note} onChange={e => setNote(e.target.value)} className="w-full p-2 border rounded" rows="2"></textarea>
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={onClose} disabled={isSaving} className="px-4 py-2 bg-gray-200 rounded">Annulla</button>
                    <button onClick={handleSubmit} disabled={isSaving || !dataFine} className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400">
                        {isSaving ? 'Salvo...' : 'Conferma'}
                    </button>
                </div>
            </div>
        </div>
    );
};


// Componente principale dei controlli
export const PresenzeControllo = ({ 
    statoCorrente, 
    onCheckIn, 
    onCheckOut, 
    onSegnalaMalattia, 
    onSegnalaInfortunio, 
    onSegnalaPioggia, 
    isSaving,
    onViewPresenzeClick 
}) => {
    
    const [modal, setModal] = useState(null); 
    const { stato, idStato, ultimoCheckOutFuOggi } = useMemo(() => {
        let ultimoCheckOutFuOggi = false;
        if (statoCorrente && statoCorrente.timestampFine) {
            ultimoCheckOutFuOggi = isTimestampToday(statoCorrente.timestampFine);
        }

        let stato = 'offline';
        if (statoCorrente && !statoCorrente.timestampFine) {
            stato = statoCorrente.stato; 
        }
        
        const idStato = statoCorrente?.id || null;
        return { stato, idStato, ultimoCheckOutFuOggi };
    }, [statoCorrente]);

    const handleCheckOut = () => {
        if (idStato) onCheckOut(idStato);
    };

    // --- Determina il blocco pulsanti principale (INVARIATO) ---
    let stateButtonBlock = null;
    
    if (ultimoCheckOutFuOggi) {
        stateButtonBlock = (
            <div className="p-4">
                <button 
                    disabled={true}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-400 text-white font-bold rounded-lg shadow-lg cursor-not-allowed"
                >
                    <PlayIcon className="h-6 w-6" />
                    POTRAI INIZIARE DOMANI
                </button>
            </div>
        );
    } else if (stato === 'offline' || stato === 'pioggia') {
        stateButtonBlock = (
            <div className="p-4">
                <button 
                    onClick={onCheckIn}
                    disabled={isSaving}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white font-bold rounded-lg shadow-lg disabled:bg-gray-400"
                >
                    <PlayIcon className="h-6 w-6" />
                    INIZIA LAVORO
                </button>
            </div>
        );
    } else if (stato === 'lavoro') {
        stateButtonBlock = (
            <div className="p-4 space-y-3">
                <button
                    onClick={handleCheckOut}
                    disabled={isSaving}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white font-bold rounded-lg shadow-lg disabled:bg-gray-400"
                >
                    <StopIcon className="h-6 w-6" />
                    TERMINA LAVORO
                </button>
               {/* --- ❗ BLOCCO BOTTONI CORRETTO CON STILI INLINE --- */}
                <div className="grid grid-cols-3 gap-2">
                    {/* Pulsante Malattia (con stile inline) */}
                    <button 
                        onClick={() => setModal('malattia')} 
                        className="p-2 text-white rounded text-xs flex flex-col items-center"
                        style={{ backgroundColor: '#eab308' }} // bg-yellow-500
                    >
                        <ClockIcon className="h-5 w-5 mb-1"/>Malattia
                    </button>
                    
                    {/* Pulsante Infortunio (con stile inline) */}
                    <button 
                        onClick={() => setModal('infortunio')} 
                        className="p-2 text-white rounded text-xs flex flex-col items-center"
                        style={{ backgroundColor: '#f97316' }} // bg-orange-500
                    >
                        <ShieldExclamationIcon className="h-5 w-5 mb-1"/>Infortunio
                    </button>
                    
                    {/* Pulsante Pioggia (con stile inline per coerenza) */}
                    <button 
                        onClick={onSegnalaPioggia} 
                        className="p-2 text-white rounded text-xs flex flex-col items-center"
                        style={{ backgroundColor: '#3b82f6' }} // bg-blue-500
                    >
                        <SunIcon className="h-5 w-5 mb-1"/>Pioggia
                    </button>
                </div>
            </div>
        );
    } else if (stato === 'malattia' || stato === 'infortunio') {
         stateButtonBlock = (
            <div className="p-4 text-center bg-yellow-100 border-t border-b border-yellow-300">
                <p className="font-bold text-yellow-800 uppercase">IN {stato.toUpperCase()}</p>
                {statoCorrente?.dataFinePrevista && (
                     <p className="text-sm text-yellow-700">Ritorno previsto: {statoCorrente.dataFinePrevista.toDate().toLocaleDateString('it-IT')}</p>
                )}
            </div>
        );
    }

    // --- RENDER FINALE ---
    return (
        <div>
            {/* Blocco 1: Pulsanti di stato (dinamici) */}
            {stateButtonBlock}
            
            {/* --- ❗ BLOCCO "VISUALIZZA STORICO" CORRETTO --- */}
            {/* Rimuoviamo la condizione logica errata e mostriamo sempre il pulsante */}
            <div className="px-4 pb-4 flex justify-end">
                <button 
                    onClick={onViewPresenzeClick} 
                    className="flex items-center gap-1 text-sm text-blue-600 font-medium disabled:text-gray-400"
                    disabled={isSaving}
                >
                    <EyeIcon className="h-4 w-4" />
                    Visualizza Storico
                </button>
            </div>
            
            {/* Modals per Malattia/Infortunio (invariati) */}
            <AssenzaModal 
                titolo="Segnala Malattia"
                show={modal === 'malattia'}
                onClose={() => setModal(null)}
                isSaving={isSaving}
                onSubmit={onSegnalaMalattia}
            />
            <AssenzaModal 
                titolo="Segnala Infortunio"
                show={modal === 'infortunio'}
                onClose={() => setModal(null)}
                isSaving={isSaving}
                onSubmit={onSegnalaInfortunio}
            />
        </div>
    );
};