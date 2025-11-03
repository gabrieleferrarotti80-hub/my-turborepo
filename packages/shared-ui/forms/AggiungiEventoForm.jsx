// packages/shared-ui/forms/AggiungiEventoForm.jsx

import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';

export const AggiungiEventoForm = ({ 
    onClose, 
    onSave, // ✅ Solo 'onSave'. Gestirà tutto lui.
    initialData, 
    selectedDate,
    users, 
    user,
    userRole,
    isLoading,
    error
}) => {
    console.log("AggiungiEventoForm RENDERIZZATO. initialData:", initialData);
    const [title, setTitle] = useState('');
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    const [description, setDescription] = useState('');
    const [partecipantiIds, setPartecipantiIds] = useState([]);

    const canAssignToOthers = ['proprietario', 'titolare-azienda', 'amministrazione'].includes(userRole);

    useEffect(() => {
        if (initialData) {
            setTitle(initialData.title || '');
            setDescription(initialData.description || '');
            setStart(initialData.start ? new Date(initialData.start.getTime() - initialData.start.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');
            setEnd(initialData.end ? new Date(initialData.end.getTime() - initialData.end.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');
            setPartecipantiIds(initialData.partecipanti?.map(p => p.userId) || []);
        } else {
            setPartecipantiIds(user ? [user.uid] : []);
            if (selectedDate) {
                const formattedDate = new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                setStart(formattedDate);
            }
        }
    }, [initialData, selectedDate, user]);

    const handlePartecipantiChange = (e) => {
        const selectedIds = Array.from(e.target.selectedOptions, option => option.value);
        setPartecipantiIds(selectedIds);
    };

   // --- ✅ LOGICA DI SUBMIT CORRETTA ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log("Form Submit Iniziato. initialData:", initialData);
        
        // 1. Prepara i dati di base che cambiano sempre
        const eventoData = { 
            title, 
            start: new Date(start),
            end: end ? new Date(end) : null,
            description, 
        };

        // 2. Aggiungi i partecipanti SOLO se è un nuovo evento
        //    o se l'utente ha il permesso di modificarli (es. Admin)
        if (!initialData?.id) {
            // --- CREAZIONE ---
            // L'utente attuale (user.uid) diventa l'organizzatore
            console.log("Creazione: Imposto i partecipanti.");
            eventoData.partecipanti = partecipantiIds.map(id => ({
                userId: id,
                ruolo: id === user.uid ? 'organizzatore' : 'invitato'
            }));
        } else if (canAssignToOthers) {
            // --- MODIFICA (come Admin) ---
            // L'utente può cambiare i partecipanti, ma dobbiamo preservare l'organizzatore originale
            console.log("Modifica (Admin): Preservo l'organizzatore originale.");
            const organizzatoreOriginale = initialData.partecipanti.find(p => p.ruolo === 'organizzatore');
            
            eventoData.partecipanti = partecipantiIds.map(id => ({
                userId: id,
                ruolo: (organizzatoreOriginale && id === organizzatoreOriginale.userId) ? 'organizzatore' : 'invitato'
            }));

            // Assicurati che l'organizzatore originale sia ancora nella lista se l'admin
            // si è dimenticato di riselezionarlo.
            if (organizzatoreOriginale && !eventoData.partecipanti.some(p => p.userId === organizzatoreOriginale.userId)) {
                 eventoData.partecipanti.push(organizzatoreOriginale);
            }
        }
        // else {
        // --- MODIFICA (come Preposto/Tecnico) ---
        // 'canAssignToOthers' è false. L'utente non può cambiare i partecipanti.
        // NON aggiungiamo 'eventoData.partecipanti'.
        // In questo modo, 'updateEvento' in useAgendaAction userà i ruoli
        // già presenti in Firestore, che sono quelli corretti.
        // }
        
       try {
            if (initialData?.id) {
                // --- MODIFICA ---
                console.log(`Chiamando onSave (Update) con ID: ${initialData.id} e Dati:`, eventoData);
                await onSave(initialData.id, eventoData);
                
            } else {
                // --- CREAZIONE ---
                console.log("Chiamando onSave (Create) con Dati:", eventoData);
                await onSave(eventoData);
            }

            // Chiudi il modale dopo il successo
            onClose(); 

        } catch (submitError) {
            console.error("Errore durante il salvataggio:", submitError);
            // Non chiudiamo il modale se c'è un errore, così l'utente può vedere il messaggio
        }
         }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <XMarkIcon className="h-6 w-6" />
                </button>
                <h2 className="text-2xl font-bold text-gray-800 mb-6">{initialData ? 'Modifica Evento' : 'Nuovo Evento'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* ... (tutti i campi del form rimangono invariati: title, start, end, description) ... */}
                    <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">Titolo Evento</label>
                        <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
                    </div>
                    <div>
                        <label htmlFor="start" className="block text-sm font-medium text-gray-700">Inizio</label>
                        <input type="datetime-local" id="start" value={start} onChange={(e) => setStart(e.target.value)} required className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
                    </div>
                    <div>
                        <label htmlFor="end" className="block text-sm font-medium text-gray-700">Fine (opzionale)</label>
                        <input type="datetime-local" id="end" value={end} onChange={(e) => setEnd(e.target.value)} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descrizione</label>
                        <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows="3" className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"></textarea>
                    </div>

                    {canAssignToOthers && (
                        <div>
                            <label htmlFor="partecipanti" className="block text-sm font-medium text-gray-700">Partecipanti</label>
                            <select
                                id="partecipanti"
                                multiple
                                value={partecipantiIds}
                                onChange={handlePartecipantiChange}
                                className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm h-32"
                            >
                                {users && users.map(u => (
                                    <option key={u.id} value={u.id}>
                                        {u.nome} {u.cognome}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">Tieni premuto Ctrl (o Cmd su Mac) per selezionare più persone.</p>
                        </div>
                    )}

                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300" disabled={isLoading}>
                            Annulla
                        </button>
                        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 disabled:bg-indigo-400" disabled={isLoading}>
                            {isLoading ? 'Salvataggio...' : (initialData ? 'Salva Modifiche' : 'Salva Evento')}
                        </button>
                    </div>
                    {error && <p className="text-red-500 text-sm text-center mt-2">Errore: {error.message}</p>}
                </form>
            </div>
        </div>
    );
};