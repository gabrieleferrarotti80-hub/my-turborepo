// src/components/EditReportForm.jsx

import React, { useState } from 'react';
// highlight-start
import { useReportsManager } from 'shared-core'; // Da pacchetto condiviso
import { useFirebaseData } from 'shared-core';; // Relativo
// highlight-end
import { ArrowLeftIcon, CheckCircleIcon, MapPinIcon, PhotoIcon } from '@heroicons/react/24/solid';


const EditReportForm = ({ reportData, onClose }) => {
    // Stato per i dati del form
    const [formData, setFormData] = useState({ ...reportData });
    const [isSaving, setIsSaving] = useState(false);

    // Dati globali per mappare gli ID ai nomi
    const { users: personnel, cantieri: sites } = useFirebaseData();
    const { updateReport } = useReportsManager();

    // Trova i nomi corrispondenti agli ID per la visualizzazione
    const authorName = personnel.find(p => p.id === reportData.userId)?.nome + ' ' + personnel.find(p => p.id === reportData.userId)?.cognome || 'Non disponibile';
    const siteName = sites.find(s => s.id === reportData.cantiereId)?.nomeCantiere || 'Non disponibile';
    const imageUrl = reportData.fileUrl || (reportData.fileUrls && reportData.fileUrls[0]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            // Prepariamo solo i dati che sono stati effettivamente modificati
            const dataToUpdate = {
                tipologia: formData.tipologia,
                descrizione: formData.descrizione || '', // Aggiungiamo il nuovo campo
            };
            await updateReport(reportData.id, dataToUpdate);
            onClose();
        } catch (error) {
            console.error("Errore nel salvataggio:", error);
            alert("Si è verificato un errore. Riprova.");
            setIsSaving(false);
        }
    };

    return (
        <div className="p-8 space-y-6 animate-fade-in max-w-4xl mx-auto">
            <button onClick={onClose} className="flex items-center gap-2 text-indigo-600 hover:underline mb-4">
                <ArrowLeftIcon className="h-4 w-4" />
                Torna alla lista
            </button>

            <h1 className="text-3xl font-bold text-gray-800">Modifica Report</h1>
            
            <form onSubmit={handleSubmit} className="space-y-8 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* --- Sezione Dati Non Modificabili --- */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-gray-700">Dettagli Report</h2>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Operatore</p>
                            <p className="text-md text-gray-900">{authorName}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Cantiere</p>
                            <p className="text-md text-gray-900">{siteName}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">Data e Ora</p>
                            <p className="text-md text-gray-900">
                                {reportData.data?.toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                         {/* Link alla mappa se disponibile */}
                        {reportData.location?.latitude && (
                             <div>
                                <p className="text-sm font-medium text-gray-500">Posizione</p>
                                <a href={`https://www.google.com/maps?q=${reportData.location.latitude},${reportData.location.longitude}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-indigo-600 hover:underline">
                                    <MapPinIcon className="h-5 w-5" />
                                    Apri su Google Maps
                                </a>
                            </div>
                        )}
                    </div>

                    {/* --- Sezione Anteprima Media --- */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-gray-700">Media Allegato</h2>
                        {imageUrl ? (
                             <a href={imageUrl} target="_blank" rel="noopener noreferrer">
                                <img src={imageUrl} alt="Anteprima report" className="w-full h-48 object-cover rounded-lg shadow-md" />
                            </a>
                        ) : (
                            <div className="w-full h-48 flex items-center justify-center bg-gray-100 rounded-lg">
                                <PhotoIcon className="h-12 w-12 text-gray-300" />
                                <p className="ml-2 text-gray-500">Nessuna foto allegata</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- Sezione Campi Modificabili --- */}
                <div className="space-y-6 border-t border-gray-200 pt-6">
                     <div>
                        <label htmlFor="tipologia" className="block text-sm font-medium text-gray-700">Tipologia Report</label>
                        <input
                            type="text"
                            id="tipologia"
                            name="tipologia"
                            value={formData.tipologia || ''}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            required
                        />
                    </div>
                     <div>
                        <label htmlFor="descrizione" className="block text-sm font-medium text-gray-700">Descrizione o Note</label>
                        <textarea
                            id="descrizione"
                            name="descrizione"
                            rows={4}
                            value={formData.descrizione || ''}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Aggiungi una descrizione o note aggiuntive..."
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50" disabled={isSaving}>
                        Annulla
                    </button>
                    <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700" disabled={isSaving}>
                        <CheckCircleIcon className="h-5 w-5"/>
                        {isSaving ? 'Salvataggio...' : 'Salva Modifiche'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditReportForm;