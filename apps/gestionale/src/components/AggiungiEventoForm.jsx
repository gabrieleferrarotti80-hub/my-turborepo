import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { useAgendaManager } from 'shared-core';
import { useFirebaseData } from 'shared-core; // Percorso corretto
import { UserSelector } from 'shared-ui'; // Importato correttamente da shared-ui

// Modificato in 'export const' per essere un export nominativo
export const AggiungiEventoForm = ({ onClose, initialData, selectedDate }) => {
    const { addEvento, updateEvento, isLoading, error } = useAgendaManager();
    const { users, user, userRole } = useFirebaseData();

    const [title, setTitle] = useState('');
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    const [description, setDescription] = useState('');
    const [assegnatoAId, setAssegnatoAId] = useState('');

    const canAssignToOthers = ['proprietario', 'titolare-azienda', 'amministrazione'].includes(userRole);

    useEffect(() => {
        if (initialData) {
            setTitle(initialData.title || '');
            setDescription(initialData.description || '');
            setStart(initialData.start ? new Date(initialData.start.getTime() - initialData.start.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');
            setEnd(initialData.end ? new Date(initialData.end.getTime() - initialData.end.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');
            const invitato = initialData.partecipanti?.find(p => p.ruolo === 'invitato');
            setAssegnatoAId(invitato ? invitato.userId : user?.uid || '');
        } else {
            setAssegnatoAId(user?.uid || '');
            if (selectedDate) {
                const formattedDate = new Date(selectedDate.getTime() - selectedDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                setStart(formattedDate);
            }
        }
    }, [initialData, selectedDate, user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const eventoData = { title, start, end, description, assegnatoAId: assegnatoAId };
        if (initialData) {
            await updateEvento(initialData.id, eventoData, onClose);
        } else {
            await addEvento(eventoData, onClose);
        }
    };

    // Il JSX del return rimane invariato
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                    <XMarkIcon className="h-6 w-6" />
                </button>
                <h2 className="text-2xl font-bold text-gray-800 mb-6">{initialData ? 'Modifica Evento' : 'Nuovo Evento'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
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
                        <UserSelector
                            users={users}
                            selectedUserId={assegnatoAId}
                            onChange={setAssegnatoAId}
                        />
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